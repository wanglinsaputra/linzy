import type { MetadataRoute } from 'next';

const SITE = 'https://linzy.web.id';

// Single-page app, so a single entry. Add rows here if routes are ever added.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 }];
}
