import type { Metadata, Viewport } from 'next';
import { RegisterSW } from '@/components/RegisterSW';
import './globals.css';

const SITE = 'https://linzy.web.id';
const TITLE = 'Linzy — Free Social Media Video & Photo Downloader';
const DESCRIPTION =
  'Paste a link from TikTok, Instagram, X (Twitter), Facebook, Threads, Pinterest, Spotify or CapCut and download the video, photo or audio without a watermark. No signup, no app install, works on desktop and mobile.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: '%s — Linzy' },
  description: DESCRIPTION,
  applicationName: 'Linzy',
  keywords: [
    'video downloader',
    'tiktok downloader',
    'instagram downloader',
    'twitter video downloader',
    'facebook video downloader',
    'threads downloader',
    'pinterest downloader',
    'spotify downloader',
    'capcut template downloader',
    'download without watermark',
  ],
  authors: [{ name: 'Wanglin Saputra', url: 'https://github.com/wanglinsaputra' }],
  creator: 'Wanglin Saputra',
  manifest: '/manifest.json',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'Linzy',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'Linzy' }],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/icons/icon-512.png'],
  },
  icons: {
    // app/icon.svg and app/favicon.ico are auto-injected by the App Router.
    // These are the extra sizes crawlers and older browsers ask for by name.
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'Linzy', statusBarStyle: 'black-translucent' },
  category: 'utilities',
};

export const viewport: Viewport = {
  themeColor: '#131313',
  width: 'device-width',
  initialScale: 1,
};

/** Rich result eligibility: tells crawlers this is a free web app, not a shop. */
const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Linzy',
  url: SITE,
  description: DESCRIPTION,
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript.',
  inLanguage: 'en',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Wanglin Saputra', url: 'https://github.com/wanglinsaputra' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="dark" lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Manrope:wght@400;500;600&family=Space+Grotesk:wght@600;700;800&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      </head>
      <body className="bg-background text-on-background font-body-md min-h-screen flex flex-col relative overflow-x-hidden selection:bg-primary selection:text-black">
        <div className="fixed inset-0 cyber-grid" aria-hidden="true" />
        <div className="fixed inset-0 scanlines" aria-hidden="true" />
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
