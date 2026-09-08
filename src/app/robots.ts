import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /admin is unauthenticated in this phase; keep it out of the index.
        // This is a crawl hint, not access control — real auth lands at go-live.
        disallow: ['/admin', '/admin/', '/api/', '/search?'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
