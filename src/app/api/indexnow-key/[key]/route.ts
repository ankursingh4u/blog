import { getSetting } from '@/lib/settings';

/**
 * Serves the IndexNow key file at the site root as /{key}.txt.
 *
 * IndexNow will not accept a submission unless the key is retrievable as plain
 * text from the root of the host. The key lives in the INDEXNOW_KEY setting so
 * it can be rotated from /admin/settings without a deploy, which means it cannot
 * be a static file. A rewrite in next.config.ts maps `/{key}.txt` here.
 *
 * The key arrives as a **path segment**, not a query parameter. The previous
 * version took `?key=` and never worked: the rewrite matched and the request
 * reached the handler, but `:key` was not substituted into the destination
 * query, so the handler compared the configured key against `undefined` and
 * answered 404 for the exact URL IndexNow fetches. Calling
 * `/api/indexnow-key?key=…` by hand returned the key the whole time, which is
 * what made it look configured for as long as it did. Path params substitute
 * reliably; query params, on this version, do not.
 *
 * The root path cannot be `app/[key]/route.ts`, that collides with
 * `app/[category]`, and Next.js does not allow two differently-named dynamic
 * segments at the same level. Nested under /api it is unambiguous.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key: requested } = await params;
  const configured = await getSetting('INDEXNOW_KEY');

  // Compared with both sides trimmed: a key pasted into the admin form with a
  // trailing space would otherwise fail against a URL that cannot carry one,
  // and the resulting 404 looks identical to "not configured".
  if (!configured.trim() || !requested || requested.trim() !== configured.trim()) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(configured.trim(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
