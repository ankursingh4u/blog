import { getSetting } from '@/lib/settings';

/**
 * Serves the IndexNow key file at the site root as /{key}.txt.
 *
 * IndexNow will not accept a submission unless the key is retrievable as plain
 * text from the root of the host. The key itself lives in the INDEXNOW_KEY
 * setting so it can be rotated from /admin/settings without a deploy, which
 * means it cannot be a static file.
 *
 * The root path is mapped here by a rewrite in next.config.ts rather than an
 * `app/[key]/route.ts`, because that would collide with `app/[category]` —
 * Next.js does not allow two differently-named dynamic segments at the same
 * level. Filesystem routes (/robots.txt, /sitemap.xml) still win over the
 * rewrite, so only an unmatched *.txt reaches this handler.
 */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('key');
  const configured = await getSetting('INDEXNOW_KEY');

  if (!configured || !requested || requested !== configured) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(configured, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
