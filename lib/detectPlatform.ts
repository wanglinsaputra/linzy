import type { Platform } from './types';

// Host suffix -> platform. Trust boundary: only these hosts are ever fetched.
const HOSTS: Array<[Platform, string[]]> = [
  ['tiktok', ['tiktok.com', 'vt.tiktok.com', 'vm.tiktok.com']],
  ['twitter', ['twitter.com', 'x.com', 't.co']],
  ['instagram', ['instagram.com', 'instagr.am']],
  ['facebook', ['facebook.com', 'fb.watch', 'fb.com', 'm.facebook.com']],
  ['threads', ['threads.net', 'threads.com']],
  ['pinterest', ['pinterest.com', 'pin.it', 'id.pinterest.com']],
  ['spotify', ['spotify.com', 'open.spotify.com', 'spotify.link']],
  ['capcut', ['capcut.com', 'capcut.net']],
];

export const SUPPORTED_PLATFORMS = HOSTS.map(([p]) => p);

/** Returns null when the URL is malformed or the host is not allow-listed. */
export function detectPlatform(raw: string): { platform: Platform; url: string } | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;

  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  for (const [platform, suffixes] of HOSTS) {
    if (suffixes.some((s) => host === s || host.endsWith('.' + s))) {
      return { platform, url: canonical(platform, u) };
    }
  }
  return null;
}

/** Upstream 404s on Twitter's /photo/N and /video/N suffixes; the bare status works. */
function canonical(platform: Platform, u: URL): string {
  if (platform === 'twitter') {
    u.pathname = u.pathname.replace(/\/(photo|video)\/\d+\/?$/, '');
  }
  return u.toString();
}
