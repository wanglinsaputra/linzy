# Linzy

Paste a link, download the media. Linzy detects the platform and media type (video / photo / audio) from a URL, then lists the formats you can save — no account, no app, no watermark.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind, PWA installable, Redis-backed job queue + status polling. UI is English, cyberpunk neon theme (design tokens in `desain/neon_protocol/DESIGN.md`).

## Supported platforms

| Platform | Extraction path |
| --- | --- |
| TikTok, Twitter/X | Wavy API (`WAVY_API_BASE`) |
| Instagram, Facebook, Threads | Wavy API |
| Pinterest, Spotify, CapCut | Wavy API |

All extraction goes through the Wavy upstream API — no yt-dlp, no scrapers, no local binaries. Spotify only yields metadata + a 30s `preview_url` (full tracks are DRM-protected); the UI says so.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in credentials
npm test                      # self-check platform detection
npm run dev                   # http://localhost:3000
```

### Required env vars

| Var | Required | Purpose |
| --- | --- | --- |
| `WAVY_API_BASE` | ✓ | Extraction upstream (defaults to the public instance) |
| `ALLOWED_ORIGIN` | ✓ | Origin allow-list for the API; must match your public site URL |
| `API_FINGERPRINT` | ✓ prod | Shared secret for non-browser clients; generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | ✓ prod | Serverless job store; without these, jobs are in-memory and `/api/status` 404s across Vercel instances |
| `FFMPEG_PATH` | — | Override if ffmpeg is not on PATH (only used by "convert to MP3") |

### API auth (origin + fingerprint)

Browser requests pass via `Origin`/`Referer` — they must match `ALLOWED_ORIGIN`, or the API answers 403.
Non-browser clients (curl, scripts) don't send a browser Origin, so they must present the shared secret as an `x-api-fingerprint` header:

```bash
curl -X POST https://linzy.web.id/api/extract \
  -H "Content-Type: application/json" \
  -H "x-api-fingerprint: <API_FINGERPRINT>" \
  -d '{"url":"https://www.tiktok.com/@a/video/123"}'
```

Either path grants access — a request never needs both. If `API_FINGERPRINT` is unset the fingerprint check is off (dev only; set it in production!).

## Icons & favicons

The single source of truth is `app/icon.svg` (also served as `/icon.svg` and `/favicon.svg` by the App Router and the generator). Never edit the generated files directly.

```bash
npm run favicons   # rasterizes app/icon.svg into public/ + app/favicon.ico
```

Output: `favicon.ico` (16/32/48), `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon-64x64.png`, `apple-touch-icon.png` (180×180), plus a byte-copy `favicon.svg`. Uses `sharp`, already present via Next.js — no extra dependency. Re-run after changing the SVG.

## Deploy

**Vercel**
```bash
vercel --prod
```

Set these in the Vercel dashboard (Settings → Environment Variables): `ALLOWED_ORIGIN`, `API_FINGERPRINT`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `WAVY_API_BASE`.

The job queue lives in Upstash Redis so `/api/status` works across serverless instances (in-memory jobs would 404 once the extract instance is recycled).

## How it works

```
POST /api/extract    → { id, status, platform }   (replies immediately; extraction runs on first status poll)
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
lib/security.ts           origin allow-list + fingerprint auth + rate limiting
lib/redis.ts              Upstash Redis over REST (serverless job store)
lib/ffmpegHelper.ts       transcode streaming (used by /api/download?to=mp3)
lib/extract.ts            Wavy API caller → normalized result
lib/jobQueue.ts           Redis-backed queue (1h TTL), in-memory fallback for dev
components/               Chrome · ContactMenu · LoadingPanel · ResultPanel · RegisterSW
public/manifest.json      PWA manifest
public/sw.js              app-shell cache (skips /api/ and cross-origin)
```
