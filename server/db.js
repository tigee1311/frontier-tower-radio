const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'radio.db'));

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_floor INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    upvotes INTEGER NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS votes (
    song_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'up',
    PRIMARY KEY (song_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_songs_status ON songs(status);
  CREATE INDEX IF NOT EXISTS idx_songs_user ON songs(user_id);
  CREATE INDEX IF NOT EXISTS idx_activity_time ON activity(timestamp);
`);

// Clean up any stale "playing" songs from previous runs
db.prepare(`UPDATE songs SET status = 'played' WHERE status = 'playing'`).run();

module.exports = db;
