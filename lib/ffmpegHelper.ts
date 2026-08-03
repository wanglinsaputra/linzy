import { spawn } from 'node:child_process';

/**
 * Remux/transcode a remote media URL to another container on the fly.
 * ponytail: streams straight through, no temp files, no progress reporting.
 * Ceiling: no seeking or size probing. Upgrade path: write to /tmp (or S3/R2)
 * and register a cron cleanup if you need resumable downloads.
 */
export function ffmpegStream(inputUrl: string, format: 'mp3' | 'mp4'): NodeJS.ReadableStream {
  const args =
    format === 'mp3'
      ? ['-i', inputUrl, '-vn', '-b:a', '192k', '-f', 'mp3', 'pipe:1']
      : ['-i', inputUrl, '-c', 'copy', '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4', 'pipe:1'];

  const proc = spawn(process.env.FFMPEG_PATH ?? 'ffmpeg', args, { stdio: ['ignore', 'pipe', 'ignore'] });
  proc.on('error', (e) => console.error('[ffmpeg] failed to start:', e.message));
  return proc.stdout;
}
