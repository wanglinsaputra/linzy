export type MediaKind = 'video' | 'photo' | 'audio';

// Only platforms confirmed working against the upstream API are listed.
// Reddit and Bluesky stay out until verified with real URLs.
export type Platform =
  | 'tiktok'
  | 'twitter'
  | 'instagram'
  | 'facebook'
  | 'threads'
  | 'pinterest'
  | 'spotify'
  | 'capcut';

export interface MediaFormat {
  id: string;
  label: string; // "MP4_HD_1080p"
  kind: MediaKind;
  ext: string;
  url: string;
  width?: number;
  height?: number;
  filesize?: number; // bytes
  note?: string;
}

export interface ExtractResult {
  platform: Platform;
  kind: MediaKind;
  title: string;
  caption?: string;
  thumbnail?: string;
  duration?: number;
  sourceUrl: string;
  formats: MediaFormat[];
  via: 'wavy';
  notice?: string;
}

export type JobStatus = 'processing' | 'done' | 'error';

export interface Job {
  id: string;
  status: JobStatus;
  url: string;
  platform: Platform;
  result?: ExtractResult;
  error?: string;
  createdAt: number;
}
