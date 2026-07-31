# Linzy

Paste a link, download the media. Linzy detects the platform and media type (video / photo / audio) from a URL, then lists the formats you can save — no account, no app, no watermark.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind, PWA installable, in-memory job queue + status polling. UI is English, cyberpunk neon theme (design tokens in `desain/neon_protocol/DESIGN.md`).

## Supported platforms

| Platform | Extraction path |
| --- | --- |
| TikTok, Twitter/X, Reddit, Bluesky | yt-dlp |
| Pinterest | yt-dlp → og:meta |
| Instagram, Facebook, Threads | yt-dlp → og:meta → 9xbuddy (fallback) |
| Spotify | embed player scraper → official Spotify Web API |
| CapCut | dedicated cheerio scraper (`__NEXT_DATA__`) |

Spotify is read through two paths: the `open.spotify.com/embed/<id>` scraper (no credentials) with the official API as fallback. Both only yield metadata + a 30s `preview_url`. Full tracks are DRM-protected and unavailable — the UI says so. The API credentials are optional, but without them there is no safety net if the embed markup changes.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in credentials
npm test                      # self-check platform detection
npm run dev                   # http://localhost:3000
```

`youtube-dl-exec` needs Python at install time. If Python is missing:
`YOUTUBE_DL_SKIP_PYTHON_CHECK=1 npm install` (the yt-dlp binary must still be on PATH).

### Required binaries

`yt-dlp` and `ffmpeg` must be on PATH (or set `FFMPEG_PATH`).

```bash
# Windows
winget install yt-dlp.yt-dlp
winget install Gyan.FFmpeg

# Debian/Ubuntu/WSL
sudo apt install ffmpeg
pipx install yt-dlp
```

### Cookies (Instagram, Facebook, Threads)

Without cookies, these three platforms almost always reply "login required".

1. Log in with a **throwaway account** — Meta likes to freeze accounts used for scraping.
2. Export cookies in Netscape format ("Get cookies.txt LOCALLY" extension).
3. Save to `secrets/cookies.txt` (that folder is already in `.gitignore`).
4. Set `YTDLP_COOKIES_FILE=./secrets/cookies.txt`.

Cookies expire. If the UI says to log in again, re-export.

### Spotify API key (optional — fallback if the embed scraper dies)

1. Open https://developer.spotify.com/dashboard → **Create app**.
2. Redirect URI can be anything (Linzy uses client-credentials, no user login).
3. Copy Client ID & Client Secret into `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`.

### Proxy (optional)

`YTDLP_PROXY=http://user:pass@host:port` is forwarded to yt-dlp. This is the single spot to change if you later want to rotate proxies.

## Icons & favicons

The single source of truth is `app/icon.svg` (also served as `/icon.svg` and `/favicon.svg` by the App Router and the generator). Never edit the generated files directly.

```bash
npm run favicons   # rasterizes app/icon.svg into public/ + app/favicon.ico
```

Output: `favicon.ico` (16/32/48), `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon-64x64.png`, `apple-touch-icon.png` (180×180), plus a byte-copy `favicon.svg`. Uses `sharp`, already present via Next.js — no extra dependency. Re-run after changing the SVG.

## Deploy

Frontend and extraction engine are best **split**. Vercel serverless has timeout limits and is awkward for binaries like yt-dlp/ffmpeg.

**Frontend (Vercel)**
```bash
vercel --prod
```
Set `NEXT_PUBLIC_API_BASE` to the backend URL if the API routes are moved.

**Backend / extraction engine (Railway, Render, Fly.io, or VPS)**

Needs a container that may install binaries:

```dockerfile
FROM node:24-slim
RUN apt-get update && apt-get install -y ffmpeg python3 curl \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod +x /usr/local/bin/yt-dlp
WORKDIR /app
COPY . .
RUN npm ci && npm run build
CMD ["npm","start"]
```

Raise the `maxDuration` of routes if the hosting platform allows; heavy extraction can exceed 60s.

Single instance for now — the job queue is in-memory, so horizontal scaling would send polls to instances that do not own the job. Switch to Redis before scaling out.

## How it works

```
POST /api/extract    → { id, status, platform }   (fire-and-forget, replies immediately)
GET  /api/status/:id → { status, result | error } (UI polls every 1.5s)
GET  /api/download?job=<id>&format=<id>          → streams the file
GET  /api/download?job=<id>&format=<id>&to=mp3   → streams through ffmpeg, audio only
```

`/api/download` only forwards formats that belong to the job. Arbitrary URLs are rejected — that is the SSRF guard.

Incoming URLs are validated against the host allow-list in `lib/detectPlatform.ts`. Hosts outside the list, non-http(s) protocols, and look-alikes (`tiktok.com.evil.com`) are rejected before touching the network.

Custom `app/not-found.tsx` renders the themed 404; support email in the header copies to clipboard on click.

## Structure

```
app/api/          detect · extract · status · download
app/not-found.tsx custom 404 (no-index)
scripts/gen-favicons.ts   rasterizes app/icon.svg (npm run favicons)
lib/detectPlatform.ts     host allow-list → platform
lib/ytdlpWrapper.ts       yt-dlp + backoff + cookies + proxy
lib/ffmpegHelper.ts       transcode streaming (used by /api/download?to=mp3)
lib/extract.ts            platform router → scraper
lib/jobQueue.ts           in-memory queue, 1h TTL
lib/scrapers/             one file per platform + layered.ts + fallback.ts
components/               Chrome · ContactMenu · LoadingPanel · ResultPanel · RegisterSW
public/manifest.json      PWA manifest
public/sw.js              app-shell cache (skips /api/ and cross-origin)
```
