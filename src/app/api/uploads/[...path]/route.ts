import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * Serves files written to public/uploads after the server started.
 *
 * Next.js reads the public directory once, at boot, and serves from that list.
 * A cover baked into the image is in it; a picture a contributor uploaded two
 * minutes ago is not, so it returned 404 until the next deploy restarted the
 * container and rebuilt the list. The file was on disk the whole time — every
 * upload through /write and /admin was invisible until something unrelated
 * happened to redeploy.
 *
 * next.config.ts rewrites /uploads/:path* here. That rewrite runs *after*
 * filesystem routes, so anything in the boot-time list is still served by the
 * static handler at full speed and only the misses reach this.
 */

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');

const CONTENT_TYPES = new Map<string, string>([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path ?? [];

  // Resolve first, then check containment. Testing the segments for ".." misses
  // encodings; comparing the resolved path to the root cannot be talked around.
  const target = path.resolve(UPLOAD_ROOT, ...segments);
  if (target !== UPLOAD_ROOT && !target.startsWith(UPLOAD_ROOT + path.sep)) {
    return new Response('Not found', { status: 404 });
  }

  const type = CONTENT_TYPES.get(path.extname(target).toLowerCase());
  if (!type) return new Response('Not found', { status: 404 });

  let body: Buffer;
  try {
    const info = await stat(target);
    if (!info.isFile()) return new Response('Not found', { status: 404 });
    body = await readFile(target);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': type,
      'Content-Length': String(body.byteLength),
      // Uploads are content-addressed on write, so a URL's bytes never change.
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: `"${createHash('sha256').update(body).digest('hex').slice(0, 32)}"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
