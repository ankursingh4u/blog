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
        //
        // /briefing is excluded for a different reason: it is a list of other
        // people's headlines linking off-site, which is what Google's guidelines
        // call scraped content. Indexing it would put a thin aggregate page in
        // front of the articles this site exists to rank, so it is blocked here
        // and sent `noindex` in its own metadata — belt and braces, since robots
        // only asks politely.
        disallow: ['/admin', '/admin/', '/login', '/api/', '/search?', '/briefing'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
