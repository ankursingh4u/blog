import { redirect, permanentRedirect } from 'next/navigation';

/**
 * /sitemaps hands off to the real XML sitemap.
 *
 * There is one sitemap and it is /sitemap.xml — that filename is what crawlers
 * probe for by default and what robots.txt declares, so it stays where it is.
 * This exists because /sitemaps is the address a person is likely to try, and
 * landing them on an HTML page when they wanted the machine-readable file is the
 * wrong answer.
 *
 * A 308 rather than serving the same XML from two URLs: duplicating it would
 * give search engines two sitemaps to reconcile, and a permanent redirect says
 * plainly which one is real.
 *
 * The browsable index of everything published lives at /archive.
 */
export const dynamic = 'force-dynamic';

export function GET(): never {
  permanentRedirect('/sitemap.xml');
  // Unreachable — permanentRedirect throws. Kept so the signature stays honest
  // if the call above is ever made conditional.
  redirect('/sitemap.xml');
}
