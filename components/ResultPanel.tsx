'use client';

import { useMemo, useState } from 'react';
import type { ExtractResult, MediaKind } from '@/lib/types';

const KB = 1024;
function human(bytes?: number) {
  if (!bytes) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= KB && i < u.length - 1) {
    n /= KB;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

function hhmmss(sec?: number) {
  if (!sec) return '--:--';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

const TABS: Array<{ key: 'all' | MediaKind; label: string }> = [
  { key: 'all', label: 'ALL' },
  { key: 'video', label: 'VIDEO' },
  { key: 'photo', label: 'PHOTO' },
  { key: 'audio', label: 'AUDIO' },
];

export function ResultPanel({
  jobId,
  result,
  onBack,
}: {
  jobId: string;
  result: ExtractResult;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<'all' | MediaKind>('all');
  const [copied, setCopied] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: result.formats.length, video: 0, photo: 0, audio: 0 };
    for (const f of result.formats) c[f.kind]++;
    return c;
  }, [result.formats]);

  const shown = tab === 'all' ? result.formats : result.formats.filter((f) => f.kind === tab);

  async function copyCaption() {
    if (!result.caption) return;
    await navigator.clipboard.writeText(result.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="w-full max-w-container-max grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-12 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-md md:text-headline-lg text-primary mb-2 tracking-tight uppercase drop-shadow-[0_0_12px_rgba(255,171,243,0.6)]">
            EXTRACTION_COMPLETE
          </h1>
          <p className="font-label-md text-label-md text-secondary-fixed-dim uppercase tracking-widest">
            [DATA_PAYLOAD_READY]
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="font-label-sm text-label-sm uppercase tracking-widest border border-secondary-fixed-dim text-secondary-fixed-dim px-4 py-2 flex items-center gap-2 hover:bg-secondary-fixed-dim hover:text-black transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">keyboard_backspace</span>
          [ BACK ]
        </button>
      </div>

      {/* Media preview */}
      <div className="lg:col-span-7">
        <div className="glitch-panel relative overflow-hidden group">
          <div className="absolute top-0 left-0 bg-primary text-black font-label-sm text-label-sm px-2 py-1 z-20 font-bold">
            MEDIA_01
          </div>
          <div className="absolute top-4 right-4 z-20 flex flex-wrap justify-end gap-2 max-w-[calc(100%-2rem)]">
            <span className="bg-tertiary text-black font-label-md text-label-md px-3 py-1 font-bold tracking-wider border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {result.kind.toUpperCase()}
            </span>
            <span className="bg-secondary-fixed-dim text-black font-label-sm text-label-sm px-2 py-1 font-bold tracking-wider">
              AUTO_DETECTED :: {result.platform.toUpperCase()}
            </span>
          </div>

          <div className="relative w-full aspect-video border border-primary/50 group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(255,171,243,0.3)] transition-all duration-500 bg-[#0a0a0a]">
            {result.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.thumbnail}
                alt={result.title}
                className="w-full h-full object-cover opacity-80 mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-label-md text-outline-variant">
                NO_PREVIEW_SIGNAL
              </div>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,255,255,0.05)_50%)] bg-[length:100%_4px] pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 border-2 border-primary flex items-center justify-center bg-black/50 backdrop-blur-sm shadow-[0_0_20px_rgba(255,171,243,0.5)] group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-primary text-4xl">play_arrow</span>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-[#222222] bg-[#050505] flex justify-between items-center font-label-sm text-label-sm text-on-surface-variant">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">timer</span> {hhmmss(result.duration)}
            </span>
            <span className="flex items-center gap-2 text-secondary-fixed-dim">
              {result.formats[0]?.width
                ? `${result.formats[0].width}x${result.formats[0].height}`
                : 'N/A'}
              <span className="material-symbols-outlined text-lg">aspect_ratio</span>
            </span>
          </div>
        </div>

        {/* Caption block */}
        <div className="glitch-panel mt-6 p-4 flex flex-col gap-3">
          <div className="font-label-sm text-label-sm text-secondary-fixed-dim uppercase tracking-widest">
            CAPTION_RAW
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
            {result.caption?.trim() || '[NO CAPTION]'}
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={copyCaption}
              disabled={!result.caption}
              className="font-label-sm text-label-sm uppercase tracking-widest border border-secondary-fixed-dim text-secondary-fixed-dim px-3 py-2 hover:bg-secondary-fixed-dim hover:text-black transition-colors disabled:opacity-40"
            >
              {copied ? '[COPIED]' : '[ COPY CAPTION ]'}
            </button>
            <a
              href={result.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="font-label-sm text-label-sm uppercase tracking-widest border border-outline-variant text-on-surface-variant px-3 py-2 hover:border-primary hover:text-primary transition-colors"
            >
              [ VIEW ORIGINAL ]
            </a>
          </div>
        </div>

        {result.notice && (
          <p className="mt-4 border border-primary/50 bg-primary/10 text-primary font-label-sm text-label-sm p-3 uppercase tracking-wider">
            ! {result.notice}
          </p>
        )}
      </div>

      {/* Format packets */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="font-label-md text-label-md text-on-surface uppercase tracking-widest border-b border-[#333333] pb-2">
          AVAILABLE_PACKETS
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by media type">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`font-label-sm text-label-sm uppercase tracking-widest px-3 py-2 border transition-colors ${
                tab === t.key
                  ? 'bg-primary text-black border-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-secondary-fixed-dim hover:text-secondary-fixed-dim'
              }`}
            >
              {t.label} [{counts[t.key] ?? 0}]
            </button>
          ))}
        </div>

        {shown.length === 0 && (
          <p className="font-label-md text-label-md text-outline-variant">[EMPTY :: NO_PACKET]</p>
        )}

        {shown.map((f, i) => (
          <div key={f.id} className="data-packet p-4 sm:p-6 flex flex-col gap-4 relative">
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-secondary-fixed-dim m-2 opacity-50" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-secondary-fixed-dim m-2 opacity-50" />
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h3 className="font-label-md text-label-md text-secondary-fixed-dim mb-1 break-all">&gt;_ {f.label}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {f.note ?? (f.width ? `${f.width}x${f.height} payload.` : `${f.kind} stream.`)}
                </p>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-container-highest px-2 py-1 text-on-surface whitespace-nowrap">
                {human(f.filesize)}
              </span>
            </div>
            <a
              href={`/api/download?job=${encodeURIComponent(jobId)}&format=${encodeURIComponent(f.id)}`}
              className={
                i === 0
                  ? 'btn-primary w-full py-3 font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-2'
                  : 'w-full py-3 font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-2 bg-transparent border border-secondary-fixed-dim text-secondary-fixed-dim hover:bg-secondary-fixed-dim hover:text-black transition-colors duration-300'
              }
            >
              <span className="material-symbols-outlined">
                {f.kind === 'audio' ? 'graphic_eq' : 'download'}
              </span>
              {f.kind === 'audio' ? 'DOWNLOAD AUDIO' : 'DOWNLOAD FILE'}
            </a>
            {f.kind === 'video' && (
              <a
                href={`/api/download?job=${encodeURIComponent(jobId)}&format=${encodeURIComponent(f.id)}&to=mp3`}
                className="w-full py-2 font-label-sm text-label-sm uppercase tracking-wider flex items-center justify-center gap-2 bg-transparent border border-outline-variant text-on-surface-variant hover:border-tertiary hover:text-tertiary transition-colors duration-300"
              >
                <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
                EXTRACT MP3
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
