const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const Stripe = require('stripe');
const db = require('./db');

// Stripe setup
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Admin PIN — set via ADMIN_PIN env var, defaults to '1311'
const ADMIN_PIN = process.env.ADMIN_PIN || '1311';

// Global volume (0-100), broadcast to all clients
let globalVolume = 100;

// Write YouTube cookies from env var to file (for cloud deploys)
const COOKIES_PATH = path.join(__dirname, '..', 'cookies.txt');
if (process.env.YT_COOKIES) {
  fs.writeFileSync(COOKIES_PATH, process.env.YT_COOKIES);
  console.log('YouTube cookies loaded from environment');
}

function parseDurationSeconds(dur) {
  if (!dur) return 0;
  const parts = dur.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

async function searchYouTube(query) {
  // Append "song" to bias results toward music
  const searchQuery = `${query} song`;
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  const html = await res.text();

  const match = html.match(/var ytInitialData = ({.*?});<\/script>/s);
  if (!match) return [];

  const data = JSON.parse(match[1]);
  const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
    ?.sectionListRenderer?.contents;
  if (!contents) return [];

  const results = [];
  for (const section of contents) {
    const items = section?.itemSectionRenderer?.contents;
    if (!items) continue;
    for (const item of items) {
      const video = item?.videoRenderer;
      if (!video || !video.videoId) continue;
      const duration = video.lengthText?.simpleText || '';
      const durationSec = parseDurationSeconds(duration);
      // Filter: must have a duration, between 30s and 15 minutes (music range)
      if (!duration || durationSec < 30 || durationSec > 900) continue;
      results.push({
        videoId: video.videoId,
        title: video.title?.runs?.map(r => r.text).join('') || 'Unknown',
        duration,
        durationSeconds: durationSec,
        thumbnail: video.thumbnail?.thumbnails?.pop()?.url || '',
        channel: video.ownerText?.runs?.[0]?.text || '',
      });
      if (results.length >= 5) break;
    }
    if (results.length >= 5) break;
  }
  return results;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());

// Stripe webhook needs raw body — must be before express.json()
app.post('/api/skip/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  let event;
  try {
    if (STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const skipperName = session.metadata?.userName || 'Someone';
    const skipperFloor = session.metadata?.userFloor || '?';

    const current = getCurrentSong();
    if (current || playbackState.isAnnouncing) {
      broadcastActivity(`💰 ${skipperName} from Floor ${skipperFloor} paid $1 to skip the song!`);
      advanceQueue();
    }
  }

  res.json({ received: true });
});

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'build')));
}

// YouTube audio is played client-side via YouTube IFrame player.
// Lightweight fallback stream endpoint (no chunk buffering = low memory).
app.get('/api/stream/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const ytArgs = ['-f', 'bestaudio[ext=m4a]/bestaudio', '-o', '-', '--retries', '3'];
  if (fs.existsSync(COOKIES_PATH)) ytArgs.push('--cookies', COOKIES_PATH);
  ytArgs.push(url);

  res.setHeader('Content-Type', 'audio/mp4');
  const proc = spawn('yt-dlp', ytArgs);
  proc.stdout.pipe(res);
  proc.stderr.on('data', () => {});
  proc.on('error', () => { if (!res.headersSent) res.status(500).end(); });
  res.on('close', () => { try { proc.kill(); } catch {} });
});

// File upload config
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// Track connected listeners
const listeners = new Map(); // socketId -> { name, floor, userId }

// Playback state
let playbackState = {
  currentSong: null,
  startedAt: null, // timestamp when song started
  isAnnouncing: false,
};

function getQueue() {
  return db.prepare(`
    SELECT * FROM songs WHERE status = 'queued'
    ORDER BY upvotes DESC, created_at ASC
  `).all();
}

function getCurrentSong() {
  return db.prepare(`SELECT * FROM songs WHERE status = 'playing' LIMIT 1`).get() || null;
}

function getUserQueueCount(userId) {
  return db.prepare(`SELECT COUNT(*) as count FROM songs WHERE user_id = ? AND status = 'queued'`).get(userId).count;
}

function broadcastState() {
  const queue = getQueue();
  const current = getCurrentSong();
  const listenerList = Array.from(listeners.values());

  io.emit('state', {
    queue,
    currentSong: current,
    playbackState,
    listenerCount: listeners.size,
    listeners: listenerList,
    volume: globalVolume,
  });
}

function broadcastActivity(message) {
  const activity = { id: uuidv4(), message, timestamp: Date.now() };
  db.prepare(`INSERT INTO activity (id, message, timestamp) VALUES (?, ?, ?)`).run(activity.id, activity.message, activity.timestamp);
  io.emit('activity', activity);
}

let songTimer = null;
let advancing = false;

function advanceQueue() {
  if (advancing) return;
  advancing = true;

  try {
    // Clear any existing timer
    if (songTimer) { clearTimeout(songTimer); songTimer = null; }

    // Mark current as done
    db.prepare(`UPDATE songs SET status = 'played' WHERE status = 'playing'`).run();

    const next = db.prepare(`
      SELECT * FROM songs WHERE status = 'queued'
      ORDER BY upvotes DESC, created_at ASC LIMIT 1
    `).get();

    if (next) {
      // Announce phase
      playbackState = {
        currentSong: next,
        startedAt: null,
        isAnnouncing: true,
      };
      broadcastState();
      io.emit('announcement', {
        name: next.user_name,
        floor: next.user_floor,
        title: next.title,
      });

      // After announcement, start playing
      setTimeout(() => {
        db.prepare(`UPDATE songs SET status = 'playing' WHERE id = ?`).run(next.id);
        playbackState = {
          currentSong: next,
          startedAt: Date.now(),
          isAnnouncing: false,
        };
        broadcastState();
        advancing = false;

        // Server timer: auto-advance when song duration is up
        const durationMs = (next.duration > 0 ? next.duration : 240) * 1000;
        songTimer = setTimeout(() => {
          advanceQueue();
        }, durationMs + 2000);
      }, 3500);
    } else {
      playbackState = { currentSong: null, startedAt: null, isAnnouncing: false };
      broadcastState();
      advancing = false;
    }
  } catch (err) {
    console.error('advanceQueue error:', err);
    advancing = false;
  }
}

// API Routes
app.get('/api/state', (req, res) => {
  const queue = getQueue();
  const current = getCurrentSong();
  const listenerList = Array.from(listeners.values());
  const recentActivity = db.prepare(`SELECT * FROM activity ORDER BY timestamp DESC LIMIT 20`).all();

  res.json({
    queue,
    currentSong: current,
    playbackState,
    listenerCount: listeners.size,
    listeners: listenerList,
    recentActivity: recentActivity.reverse(),
    volume: globalVolume,
  });
});

app.get('/api/votes/:userId', (req, res) => {
  const rows = db.prepare(`SELECT song_id, direction FROM votes WHERE user_id = ?`).all(req.params.userId);
  const votes = {};
  for (const r of rows) votes[r.song_id] = r.direction;
  res.json(votes);
});

// Search YouTube by song name + artist
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing search query' });

  try {
    const results = await searchYouTube(q);
    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found' });
    }
    res.json(results);
  } catch (err) {
    console.error('YouTube search error:', err);
    res.status(500).json({ error: 'Search failed. Try again.' });
  }
});

app.post('/api/songs/youtube', (req, res) => {
  const { videoId, title, duration, userId, userName, userFloor } = req.body;

  if (!videoId || !userId || !userName || !userFloor) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const song = {
    id: uuidv4(),
    title: title || 'YouTube Song',
    type: 'youtube',
    source: videoId,
    user_id: userId,
    user_name: userName,
    user_floor: userFloor,
    status: 'queued',
    upvotes: 0,
    duration: duration || 0,
    created_at: Date.now(),
  };

  db.prepare(`
    INSERT INTO songs (id, title, type, source, user_id, user_name, user_floor, status, upvotes, duration, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(song.id, song.title, song.type, song.source, song.user_id, song.user_name, song.user_floor, song.status, song.upvotes, song.duration, song.created_at);

  broadcastActivity(`🎵 ${userName} from Floor ${userFloor} just queued up "${song.title}"`);
  broadcastState();

  // Auto-play if nothing is playing
  if (!playbackState.currentSong && !playbackState.isAnnouncing) {
    advanceQueue();
  }

  res.json({ success: true, song });
});

app.post('/api/songs/upload', upload.single('audio'), (req, res) => {
  const { title, userId, userName, userFloor } = req.body;

  if (!req.file || !userId || !userName || !userFloor) {
    return res.status(400).json({ error: 'Missing required fields' });
  }


  const song = {
    id: uuidv4(),
    title: title || req.file.originalname,
    type: 'file',
    source: `/uploads/${req.file.filename}`,
    user_id: userId,
    user_name: userName,
    user_floor: userFloor,
    status: 'queued',
    upvotes: 0,
    created_at: Date.now(),
  };

  db.prepare(`
    INSERT INTO songs (id, title, type, source, user_id, user_name, user_floor, status, upvotes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(song.id, song.title, song.type, song.source, song.user_id, song.user_name, song.user_floor, song.status, song.upvotes, song.created_at);

  broadcastActivity(`🎵 ${userName} from Floor ${userFloor} just queued up "${song.title}"`);
  broadcastState();

  if (!playbackState.currentSong && !playbackState.isAnnouncing) {
    advanceQueue();
  }

  res.json({ success: true, song });
});

app.post('/api/songs/:id/remove', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const song = db.prepare(`SELECT * FROM songs WHERE id = ? AND status = 'queued'`).get(id);
  if (!song) return res.status(404).json({ error: 'Song not found in queue' });
  if (song.user_id !== userId) return res.status(403).json({ error: 'You can only remove your own songs' });

  db.prepare(`DELETE FROM songs WHERE id = ?`).run(id);
  db.prepare(`DELETE FROM votes WHERE song_id = ?`).run(id);

  broadcastActivity(`🗑️ ${song.user_name} from Floor ${song.user_floor} removed "${song.title}" from the queue`);
  broadcastState();
  res.json({ success: true });
});

app.post('/api/songs/:id/vote', (req, res) => {
  const { id } = req.params;
  const { userId, direction } = req.body; // direction: 'up' or 'down'

  const existing = db.prepare(`SELECT * FROM votes WHERE song_id = ? AND user_id = ?`).get(id, userId);

  if (existing) {
    if (existing.direction === direction) {
      // Same vote again — remove it (toggle off)
      const delta = direction === 'up' ? -1 : 1;
      db.prepare(`DELETE FROM votes WHERE song_id = ? AND user_id = ?`).run(id, userId);
      db.prepare(`UPDATE songs SET upvotes = upvotes + ? WHERE id = ?`).run(delta, id);
      broadcastState();
      return res.json({ success: true, vote: null });
    }
    // Switching direction — swing by 2
    const delta = direction === 'up' ? 2 : -2;
    db.prepare(`UPDATE votes SET direction = ? WHERE song_id = ? AND user_id = ?`).run(direction, id, userId);
    db.prepare(`UPDATE songs SET upvotes = upvotes + ? WHERE id = ?`).run(delta, id);
    broadcastState();
    return res.json({ success: true, vote: direction });
  }

  // New vote
  const delta = direction === 'down' ? -1 : 1;
  db.prepare(`INSERT INTO votes (song_id, user_id, direction) VALUES (?, ?, ?)`).run(id, userId, direction);
  db.prepare(`UPDATE songs SET upvotes = upvotes + ? WHERE id = ?`).run(delta, id);

  broadcastState();
  res.json({ success: true, vote: direction });
});

// --- Paid skip ---

app.post('/api/skip/checkout', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Payments not configured' });

  const { userName, userFloor } = req.body;
  const current = getCurrentSong();
  if (!current && !playbackState.isAnnouncing) {
    return res.status(400).json({ error: 'Nothing is playing to skip' });
  }

  try {
    const origin = `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Skip Current Song',
            description: `Skip "${current?.title || 'current song'}" on Frontier Tower Radio`,
          },
          unit_amount: 100, // $1.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}?skipped=true`,
      cancel_url: `${origin}?skipped=false`,
      metadata: {
        userName: userName || 'Anonymous',
        userFloor: userFloor || '?',
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// --- Admin endpoints ---

app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid PIN' });
  }
});

app.post('/api/admin/skip', (req, res) => {
  const { pin } = req.body;
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'Unauthorized' });

  const current = getCurrentSong();
  if (!current && !playbackState.isAnnouncing) {
    return res.status(400).json({ error: 'Nothing is playing' });
  }

  broadcastActivity('⏭️ Admin skipped the current song');
  advanceQueue();
  res.json({ success: true });
});

app.post('/api/admin/remove/:id', (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'Unauthorized' });

  const song = db.prepare(`SELECT * FROM songs WHERE id = ? AND status = 'queued'`).get(id);
  if (!song) return res.status(404).json({ error: 'Song not found in queue' });

  db.prepare(`DELETE FROM songs WHERE id = ?`).run(id);
  db.prepare(`DELETE FROM votes WHERE song_id = ?`).run(id);

  broadcastActivity(`🗑️ Admin removed "${song.title}" from the queue`);
  broadcastState();
  res.json({ success: true });
});

app.post('/api/admin/volume', (req, res) => {
  const { pin, volume } = req.body;
  if (pin !== ADMIN_PIN) return res.status(401).json({ error: 'Unauthorized' });

  globalVolume = Math.max(0, Math.min(100, Number(volume) || 100));
  io.emit('volume', globalVolume);
  res.json({ success: true, volume: globalVolume });
});

app.get('/api/admin/volume', (req, res) => {
  res.json({ volume: globalVolume });
});

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
  });
}

// Socket.IO
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join', ({ name, floor, userId }) => {
    listeners.set(socket.id, { name, floor, userId });
    broadcastActivity(`👋 ${name} from Floor ${floor} just tuned in`);
    broadcastState();
  });

  socket.on('requestState', () => {
    const queue = getQueue();
    const current = getCurrentSong();
    const listenerList = Array.from(listeners.values());
    const recentActivity = db.prepare(`SELECT * FROM activity ORDER BY timestamp DESC LIMIT 20`).all();

    socket.emit('state', {
      queue,
      currentSong: current,
      playbackState,
      listenerCount: listeners.size,
      listeners: listenerList,
      recentActivity: recentActivity.reverse(),
      volume: globalVolume,
    });
  });

  socket.on('disconnect', () => {
    const listener = listeners.get(socket.id);
    if (listener) {
      broadcastActivity(`👋 ${listener.name} from Floor ${listener.floor} signed off`);
      listeners.delete(socket.id);
      broadcastState();
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🗼 Frontier Tower Radio server broadcasting on port ${PORT}`);
});
