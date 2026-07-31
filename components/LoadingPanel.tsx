'use client';

import { useEffect, useState } from 'react';

const LOG_LINES = [
  '> RESOLVING HOST...',
  '> DECRYPTING PAYLOAD...',
  '> ANALYZING DOM STRUCTURE...',
  '> INJECTING NEON TOKENS...',
  '> COMPILING ASSETS [32%]',
  '> COMPILING ASSETS [64%]',
  '> COMPILING ASSETS [98%]',
  '> ESTABLISHING CYBER LINK...',
];

/** Loading state — mirrors desain/linzy_loading_cyberpunk. Progress is cosmetic. */
export function LoadingPanel({ platform }: { platform?: string }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 700);
    return () => clearInterval(t);
  }, []);

  const pct = Math.min(95, 12 + tick * 11);
  const lines = LOG_LINES.slice(0, Math.min(LOG_LINES.length, tick + 1));

  return (
    <div className="w-full max-w-3xl flex flex-col gap-8" role="status" aria-live="polite">
      <div className="glitch-panel p-6 sm:p-8">
        <span className="material-symbols-outlined text-primary text-4xl border-2 border-primary p-2 inline-block">
          terminal
        </span>
        <h1 className="font-headline-lg text-headline-md md:text-headline-lg text-primary mt-6 uppercase drop-shadow-[0_0_12px_rgba(255,171,243,0.8)]">
          Fetching URL...
        </h1>
        <p className="font-label-md text-label-md text-secondary-fixed-dim uppercase tracking-widest mt-2">
          ESTABLISHING SECURE UPLINK <span className="cursor-blink">_</span>
        </p>
      </div>

      <div className="border border-secondary-fixed-dim p-4 sm:p-6 flex flex-col gap-4 bg-[#050505]">
        <div className="font-label-md text-label-md text-secondary-fixed-dim uppercase border-b border-secondary-fixed-dim/40 pb-2">
          DATA STREAM INTEGRITY
        </div>
        {[
          ['NODE_ALPHA', 'STABLE [OK]', 'text-tertiary'],
          ['NODE_BETA', 'STABLE [OK]', 'text-tertiary'],
          ['NODE_GAMMA', 'SYNCING...', 'text-primary'],
        ].map(([k, v, c]) => (
          <div key={k} className="flex justify-between font-label-md text-label-md">
            <span className="text-on-surface">{k}:</span>
            <span className={c}>{v}</span>
          </div>
        ))}
        <div className="border-t border-[#333] pt-4 font-label-md text-label-md">
          <p className="text-on-surface-variant">ENCRYPTION PROTOCOL</p>
          <p className="text-secondary-fixed-dim">SHA-256 (GCM) ACTIVE</p>
        </div>
      </div>

      <div className="glitch-panel p-4 sm:p-6 relative">
        <div className="absolute top-0 right-0 bg-surface-container-high text-on-surface font-label-sm text-label-sm px-2 py-1">
          EXTRACTION_SEQUENCE
        </div>
        <div className="flex justify-between gap-3 font-label-md text-label-md mt-6">
          <span className="text-on-surface uppercase">
            SYSTEM DATA LOADING {platform ? `:: ${platform.toUpperCase()}` : ''}
          </span>
          <span className="text-secondary-fixed-dim">{pct}%</span>
        </div>
        <div className="w-full h-3 border border-[#333] mt-2">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary-fixed-dim transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-4 bg-[#0a0a0a] border border-[#222] p-3 font-label-sm text-label-sm text-tertiary flex flex-col gap-1 min-h-[9rem]">
          {lines.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
