'use client';

import { useEffect } from 'react';

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('[sw] registration failed:', e));
  }, []);
  return null;
}
