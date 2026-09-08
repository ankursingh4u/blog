import { storage } from '@/lib/storage';
import { absoluteUrl } from '@/lib/site';
import { log } from '@/pipeline/log';

/**
 * Step 8 — featured image.
 *
 * Renders the branded 1200x630 card from /api/og and stores the bytes, rather
 * than pointing the post at the live endpoint. Two reasons: Google Discover
 * wants a stable image URL that does not change when the title is edited, and
 * a stored PNG survives the OG route being slow or unavailable at crawl time.
 */
export async function generateFeaturedImage({
  title,
  category,
  build,
  slug,
}: {
  title: string;
  category: string;
  build?: string | null;
  slug: string;
}): Promise<string | null> {
  const params = new URLSearchParams({ title, category });
  if (build) params.set('build', build);

  const url = absoluteUrl(`/api/og?${params.toString()}`);

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const stored = await storage.put({
      body: buffer,
      filename: `${slug}.png`,
      contentType: 'image/png',
      prefix: 'og',
    });
    log.info(`image: stored ${stored.url} (${Math.round(stored.size / 1024)} KB)`);
    return stored.url;
  } catch (error) {
    // A missing featured image downgrades the post, it does not fail the run —
    // the publish step refuses to auto-publish without one.
    log.warn(
      `image: could not render OG card for "${slug}" — ${error instanceof Error ? error.message : error}`,
    );
    return null;
  }
}
