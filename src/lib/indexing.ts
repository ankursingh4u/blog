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

export async function pingSitemap(): Promise<PingResult> {
  if (isLocal()) return { ok: false, skipped: 'site URL is localhost' };
  const sitemap = encodeURIComponent(absoluteUrl('/sitemap.xml'));
  try {
    const res = await fetch(`https://www.google.com/ping?sitemap=${sitemap}`, {
      method: 'GET',
    });
    return { ok: res.ok, detail: `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : 'fetch failed' };
  }
}

/** Called from the publish action. Never throws — indexing must not block a publish. */
export async function notifyPublished(paths: string[]) {
  const [indexNow, sitemap] = await Promise.all([pingIndexNow(paths), pingSitemap()]);
  const summarise = (label: string, r: PingResult) =>
    `${label}: ${r.ok ? 'ok' : r.skipped ? `skipped (${r.skipped})` : `failed (${r.detail})`}`;
  console.info(
    `[indexing] ${paths.length} URL(s) — ${summarise('IndexNow', indexNow)}; ${summarise('sitemap', sitemap)}`,
  );
  return { indexNow, sitemap };
}
