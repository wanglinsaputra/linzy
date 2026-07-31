import assert from 'node:assert/strict';
import { detectPlatform } from '../lib/detectPlatform';
import { normalize } from '../lib/extract';
import { getJob } from '../lib/jobQueue';
import type { Job } from '../lib/types';

// --- detectPlatform: allow-listed hosts resolve to the right platform ---
const ok: Array<[string, string]> = [
  ['https://www.tiktok.com/@a/video/123', 'tiktok'],
  ['https://vt.tiktok.com/ZS123/', 'tiktok'],
  ['https://x.com/a/status/1', 'twitter'],
  ['https://twitter.com/a/status/1', 'twitter'],
  ['https://www.instagram.com/reel/abc/', 'instagram'],
  ['https://www.instagram.com/reels/DaJim16SB1T/', 'instagram'],
  ['https://fb.watch/xyz/', 'facebook'],
  ['https://www.threads.com/@a/post/DMxYz1', 'threads'],
  ['https://www.threads.net/@a/post/DMxYz1', 'threads'],
  ['https://pin.it/6DCGo4G0e', 'pinterest'],
  ['https://open.spotify.com/track/abc', 'spotify'],
  ['https://www.capcut.com/tv2/ZS4MFVmWJ/', 'capcut'],
];
for (const [url, want] of ok) {
  assert.equal(detectPlatform(url)?.platform, want, url);
}

// Upstream 404s on /photo/N, so it is stripped; other paths are untouched.
assert.equal(
  detectPlatform('https://x.com/randomable_/status/2083126974294401520/photo/1')?.url,
  'https://x.com/randomable_/status/2083126974294401520',
);
assert.equal(
  detectPlatform('https://x.com/randomable_/status/2083126974294401520')?.url,
  'https://x.com/randomable_/status/2083126974294401520',
);
assert.equal(
  detectPlatform('https://www.threads.com/@a/post/DbckLFKE3EQ/media')?.url,
  'https://www.threads.com/@a/post/DbckLFKE3EQ/media',
);

// Rejected: unknown host, look-alike host, bad scheme, garbage.
// Reddit/Bluesky stay out until upstream support is verified.
for (const bad of [
  'https://evil.com/x',
  'https://tiktok.com.evil.com/x',
  'https://threads.net.evil.com/@a/post/1',
  'https://www.reddit.com/r/x/comments/1/a/',
  'https://bsky.app/profile/a/post/1',
  'javascript:alert(1)',
  'file:///etc/passwd',
  'not a url',
  '',
]) {
  assert.equal(detectPlatform(bad), null, bad);
}

// --- normalize: payload shapes captured from the live API on 2026-07-31 ---

// Pinterest repeats one URL under three quality labels; they must collapse.
const pin = normalize(
  {
    success: true,
    platform: 'Pinterest',
    result: {
      title: 'Bronx Neighborhoods Guide',
      caption: ' ',
      cover: 'https://i.pinimg.com/236x/64/d3/0c/x.jpg',
      media: {
        all: [
          { type: 'image', quality: 'original', extension: 'jpg', url: 'https://i.pinimg.com/236x/64/d3/0c/x.jpg' },
          { type: 'image', quality: 'large', extension: 'jpg', url: 'https://i.pinimg.com/236x/64/d3/0c/x.jpg' },
          { type: 'image', quality: 'medium', extension: 'jpg', url: 'https://i.pinimg.com/236x/64/d3/0c/x.jpg' },
        ],
        images: [],
        videos: [],
        audio: [],
      },
    },
  },
  'pinterest',
  'https://pin.it/6DCGo4G0e',
);
assert.equal(pin.formats.length, 1, 'duplicate URLs must collapse');
assert.equal(pin.kind, 'photo');
assert.equal(pin.caption, undefined, 'whitespace-only caption becomes undefined');
assert.equal(pin.via, 'wavy');

// Instagram double-wraps as result.result and sends author as an object.
const ig = normalize(
  {
    success: true,
    result: {
      result: {
        title: '',
        author: { username: 'jedaberfikir' },
        cover: 'https://scontent.example/c.jpg',
        media: {
          all: [{ type: 'video', quality: 'hd', extension: 'mp4', url: 'https://cdn.example/v.mp4', size: 0 }],
        },
      },
    },
  },
  'instagram',
  'https://www.instagram.com/reels/DaJim16SB1T/',
);
assert.equal(ig.title, 'jedaberfikir', 'blank title falls back to author');
assert.equal(ig.kind, 'video');
assert.equal(ig.formats[0].label, 'MP4_HD');
assert.equal(ig.formats[0].filesize, undefined, 'size 0 means unknown, not zero bytes');

// Typed buckets are the fallback when `all` is absent.
const spotify = normalize(
  {
    success: true,
    result: {
      title: 'Never Gonna Give You Up',
      media: { audio: [{ type: 'audio', quality: '320kbps', extension: 'mp3', url: 'https://cdn.example/a.mp3' }] },
    },
  },
  'spotify',
  'https://open.spotify.com/track/x',
);
assert.equal(spotify.formats.length, 1);
assert.equal(spotify.kind, 'audio');
assert.equal(spotify.formats[0].label, 'MP3_320KBPS');

// Upstream error text reaches the user; a text-only post fails loudly.
assert.throws(
  () => normalize({ success: false, error: 'Invalid Instagram URL!' }, 'instagram', 'u'),
  /Invalid Instagram URL!/,
);
// Meta answers 200 with a login-wall payload for non-public posts.
assert.throws(
  () =>
    normalize(
      { success: true, result: { title: 'Threads • Log in', media: { all: [] } } },
      'threads',
      'https://www.threads.com/@a/post/1',
    ),
  /login wall/,
);
// ...but a real caption containing "log in" must still extract.
const th = normalize(
  {
    success: true,
    result: {
      title: 'cara log in tanpa password',
      media: { all: [{ type: 'video', quality: 'hd', extension: 'mp4', url: 'https://cdn.example/t.mp4' }] },
    },
  },
  'threads',
  'https://www.threads.com/@a/post/1',
);
assert.equal(th.formats.length, 1);
assert.equal(th.kind, 'video');

// Threads leads with a cover JPEG on video posts; headline kind must be video.
const mixed = normalize(
  {
    success: true,
    result: {
      title: '@cloud_shafira on Threads',
      media: {
        all: [
          { type: 'image', quality: 'normal', extension: 'jpg', url: 'https://cdn.example/cover.jpg' },
          { type: 'video', quality: 'normal', extension: 'mp4', url: 'https://cdn.example/a.mp4' },
          { type: 'video', quality: 'normal', extension: 'mp4', url: 'https://cdn.example/b.mp4' },
        ],
      },
    },
  },
  'threads',
  'https://www.threads.com/@cloud_shafira/post/DbckLFKE3EQ/media',
);
assert.equal(mixed.kind, 'video', 'a leading cover image must not decide the kind');
assert.equal(mixed.formats.length, 3, 'the cover stays downloadable');
assert.throws(
  () => normalize({ success: true, result: { title: 'x', media: { all: [] } } }, 'twitter', 'u'),
  /No media files/,
);
// Non-http URLs from upstream must never reach the download proxy.
assert.throws(
  () => normalize({ success: true, result: { media: { all: [{ url: 'javascript:alert(1)' }] } } }, 'tiktok', 'u'),
  /No media files/,
);

// The job map must live on globalThis, otherwise /api/extract and /api/status
// get separate module instances in dev and every status poll 404s.
// Planting into the existing map (not replacing it) because jobQueue captured
// its reference at import time. Done status so no real extraction fires.
const planted: Job = {
  id: 'planted-job',
  status: 'done',
  url: 'https://www.tiktok.com/@a/video/1',
  platform: 'tiktok',
  createdAt: Date.now(),
};
const globalJobs = (globalThis as typeof globalThis & { __linzyJobs?: Map<string, Job> }).__linzyJobs;
assert.ok(globalJobs, 'jobQueue must publish its map on globalThis');
globalJobs.set(planted.id, planted);
const plantedBack = await getJob('planted-job');
assert.equal(plantedBack?.platform, 'tiktok', 'getJob must read the globalThis-pinned map');
