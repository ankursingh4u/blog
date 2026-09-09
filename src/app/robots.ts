import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /admin is password-protected, but a login page in the index invites
        // guessing and the URLs have no value to a reader either way.
        // A crawl hint, not access control — the middleware is what enforces it.
        disallow: ['/admin', '/admin/', '/login', '/api/', '/search?'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
