import { SITE, absoluteUrl } from '@/lib/site';
import { getSetting } from '@/lib/settings';

/**
 * Search-engine notification on publish.
 *
 * Local dev has no public URL, so both calls no-op and log instead of firing.
 * At go-live: set the INDEXNOW_KEY setting from /admin/settings and serve
 * /{key}.txt (handled by src/app/[key]/route.ts). Nothing else changes.
 */

interface PingResult {
  ok: boolean;
  skipped?: string;
  detail?: string;
}

function isLocal() {
  return SITE.url.includes('localhost') || SITE.url.includes('127.0.0.1');
}

export async function pingIndexNow(paths: string[]): Promise<PingResult> {
  const key = await getSetting('INDEXNOW_KEY');
  if (!key) return { ok: false, skipped: 'INDEXNOW_KEY is not set' };
  if (isLocal()) return { ok: false, skipped: 'site URL is localhost' };
  if (paths.length === 0) return { ok: false, skipped: 'no URLs' };

  const host = new URL(SITE.url).host;
  const body = {
    host,
    key,
    keyLocation: absoluteUrl(`/${key}.txt`),
    urlList: paths.map((p) => absoluteUrl(p)),
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, detail: `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : 'fetch failed' };
  }
}

/**
 * Google retired sitemap pings in 2023. There is nothing to call.
 *
 * `https://www.google.com/ping?sitemap=` answers 404 now, and this ran on every
 * publish and logged a failure for it. Google's replacement is the one already
 * in place: a sitemap submitted once in Search Console, re-fetched on their own
 * schedule, with `<lastmod>` telling them which entries moved. Nothing a site
 * can send makes that happen sooner.
 *
 * Kept as a function so callers stay unchanged and the reason stays recorded,
 * rather than someone re-adding the ping in a year.
 */
export async function pingSitemap(): Promise<PingResult> {
  if (isLocal()) return { ok: false, skipped: 'site URL is localhost' };
  return { ok: false, skipped: 'Google retired sitemap pings; Search Console re-fetches it' };
}

/** Called from the publish action. Never throws, indexing must not block a publish. */
export async function notifyPublished(paths: string[]) {
  const [indexNow, sitemap] = await Promise.all([pingIndexNow(paths), pingSitemap()]);
  const summarise = (label: string, r: PingResult) =>
    `${label}: ${r.ok ? 'ok' : r.skipped ? `skipped (${r.skipped})` : `failed (${r.detail})`}`;
  console.info(
    `[indexing] ${paths.length} URL(s), ${summarise('IndexNow', indexNow)}; ${summarise('sitemap', sitemap)}`,
  );
  return { indexNow, sitemap };
}
