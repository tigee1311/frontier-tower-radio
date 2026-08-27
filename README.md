# Frontier Tower Radio

A communal radio station for a 16-floor building. Anyone on the network opens the
page, checks in with a name and floor, and adds songs to a single shared queue.
The server owns playback: it decides what is playing and when it started, and
pushes that state to every browser over Socket.IO, so the whole tower hears the
same thing at roughly the same time.

- **Queue** — search YouTube or upload an audio file. One shared queue, ordered
  by upvotes then submission time.
- **Voting** — up/down vote queued songs; one vote per person per song.
- **Live feed** — check-ins, submissions, skips, and sign-offs stream to everyone.
- **Announcements** — a 3.5s "X from Floor Y" card plays before each track.
- **Admin panel** — PIN-gated skip, remove, and global volume (the small "A"
  button, bottom-right).
- **Paid skip** — optional $1 Stripe Checkout flow to skip the current song.

## Architecture

```
public/, src/          React 18 app (Create React App + Tailwind)
  context/RadioContext.js   Socket.IO client, all API calls, app state
  components/Player.js      Playback: YouTube IFrame API, falling back to
                            a server-side yt-dlp audio stream
server/index.js        Express HTTP API + Socket.IO + the playback scheduler
server/db.js           better-sqlite3 schema (songs, votes, activity), WAL mode
```

State lives in `radio.db` (SQLite, created on first boot next to the repo root)
and uploaded audio in `uploads/`. Both are gitignored.

## Prerequisites

- **Node.js >= 22.9** (`engines` in `package.json`; the `--env-file-if-exists`
  flag used by `npm run server` needs it). `better-sqlite3` is a native module
  and installs a prebuilt binary for this Node version.
- **yt-dlp**, **python3** and **ffmpeg** — only for the `/api/stream/:videoId`
  fallback, used when the YouTube IFrame player can't load in the browser.
  Everything else works without them. The Docker image installs all three.

## Install

```bash
npm ci          # or: npm install
cp .env.example .env
```

## Environment variables

All optional — the server boots with none of them set. See `.env.example` for
the annotated version.

| Variable | Default | Effect if unset |
| --- | --- | --- |
| `PORT` | `3001` | — |
| `NODE_ENV` | (unset) | Set to `production` to serve `./build` and SPA routes from the API server |
| `ADMIN_PIN` | `1311` | Admin panel accepts the public default — **always override in a deployment** |
| `STRIPE_SECRET_KEY` | (unset) | `POST /api/skip/checkout` returns `500 {"error":"Payments not configured"}`; the rest of the app is unaffected |
| `STRIPE_WEBHOOK_SECRET` | (unset) | `POST /api/skip/webhook` parses the body **without signature verification** — set this in production |
| `YT_COOKIES` | (unset) | Written to `./cookies.txt` and passed to `yt-dlp`. Only needed when YouTube rate-limits your server's IP |

## Run

**Development** — API on 3001, React dev server with hot reload on 3000:

```bash
npm start
```

Then open http://localhost:3000. (`npm start` runs `npm run server` and
`npm run client` concurrently; run them in separate terminals if you prefer.)

**Production-style, one process** — build the frontend and let the API server
serve it:

```bash
npm run build
NODE_ENV=production npm run server
```

Then open http://localhost:3001.

## HTTP API

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/state` | Queue, current song, listeners, recent activity, volume. Also the health check. |
| `GET` | `/api/search?q=` | Scrapes YouTube search. `404` = no matches, `502` = YouTube unreachable/unparseable. |
| `GET` | `/api/votes/:userId` | This user's votes, keyed by song id. |
| `GET` | `/api/stream/:videoId` | yt-dlp audio passthrough (browser fallback). |
| `POST` | `/api/songs/youtube` | `{ videoId, title, duration, userId, userName, userFloor }` |
| `POST` | `/api/songs/upload` | multipart `audio` file, max 50 MB, `.mp3 .wav .ogg .m4a .flac .aac` |
| `POST` | `/api/songs/:id/vote` | `{ userId, direction: 'up' \| 'down' }` |
| `POST` | `/api/songs/:id/remove` | `{ userId }` — submitter only |
| `POST` | `/api/admin/login` · `/api/admin/skip` · `/api/admin/remove/:id` · `/api/admin/volume` | All take `{ pin }` |
| `POST` | `/api/skip/checkout` · `/api/skip/webhook` | Stripe paid skip |

**Socket.IO** — client emits `join` and `requestState`; server emits `state`,
`activity`, `announcement`, and `volume`.

## Deploy

### Docker

```bash
docker build -t frontier-tower-radio .
docker run -p 3001:3001 -e ADMIN_PIN=... frontier-tower-radio
```

The image is a two-stage build: stage 1 runs the CRA build, stage 2 installs
python3/ffmpeg/yt-dlp plus the runtime deps and copies `server/` and `build/`.
It sets `NODE_ENV=production` and runs `node server/index.js` on port 3001.

### Render

`render.yaml` defines a Docker web service with `/api/state` as the health check.
Set `ADMIN_PIN` (and the Stripe keys if you want paid skips) in the Render
dashboard — they are declared with `sync: false` so Render prompts for them.

> **Known limitation:** the service has no persistent disk, so `radio.db` and
> `uploads/` are wiped on every deploy and restart. That is fine for a queue
> that is only meaningful while people are listening; attach a Render disk and
> point the database and upload paths at it if you need history to survive.
