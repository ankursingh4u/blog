import type { Keyword } from '@prisma/client';
import { log } from '@/pipeline/log';
import { decode, type CategorySlug } from '@/pipeline/parser';
import { findGeneralSources, findSolutionSources } from '@/pipeline/discovery';
import { botUserAgent } from '@/lib/site';

/**
 * Step 4 — research.
 *
 * Collects the source material an article is allowed to be written from. The
 * generator sees only what comes back from here, and the quality gate checks
 * every identifier in the draft against this text.
 *
 * There are two routes, because the two kinds of content have different
 * authorities:
 *
 *   - **Windows troubleshooting** — Microsoft's own documentation, found through
 *     Learn search and a handful of fixed fallback pages. Unchanged.
 *   - **The seven general verticals** — the publisher and official-body feeds in
 *     `findGeneralSources`. These used to fall through the Windows route, which
 *     handed a travel or sport keyword two Windows Update pages as its sources:
 *     always fetchable, always irrelevant, and dangerous precisely because the
 *     draft is then required to stick to them.
 */

export interface ResearchSource {
  url: string;
  title: string;
  text: string;
}

const FETCH_TIMEOUT_MS = 15_000;
const MAX_CHARS_PER_SOURCE = 12_000;
const TARGET_SOURCES = 5;

/**
 * A URL carried on the keyword itself, if it is worth fetching.
 *
 * Google News article links are excluded by host. They look like ordinary links
 * but resolve to a JavaScript interstitial that never leaves google.com and
 * contains no link to the publisher, so fetching one costs a request and always
 * yields too little text to use. Dropping it here keeps that failure out of the
 * warning log, where it would look like a transient network problem.
 */
function keywordUrl(keyword: Keyword): string[] {
  // Keywords discovered from autocomplete or trends carry a `discovery:` marker
  // rather than a URL — there is no source page behind a search query.
  if (!keyword.sourceUrl || keyword.sourceUrl.startsWith('discovery:')) return [];

  try {
    const host = new URL(keyword.sourceUrl).hostname.replace(/^www\./, '');
    if (host === 'news.google.com') {
      log.info(`research: "${keyword.phrase}" came from Google News; finding citable sources`);
      return [];
    }
  } catch {
    return [];
  }

  return [keyword.sourceUrl];
}

/** Microsoft documentation the pipeline can always reach for Windows context. */
function windowsFallbackUrls(keyword: Keyword): string[] {
  const urls: string[] = [];

  if (keyword.kbNumber) {
    const digits = keyword.kbNumber.replace(/\D/g, '');
    urls.push(`https://support.microsoft.com/help/${digits}`);
  }

  if (keyword.errorCode) {
    urls.push(
      `https://learn.microsoft.com/en-us/windows/deployment/update/windows-update-error-reference`,
      `https://learn.microsoft.com/en-us/troubleshoot/windows-client/installing-updates-features-roles/windows-update-issues-troubleshooting`,
    );
  }

  urls.push(
    'https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information',
    'https://support.microsoft.com/en-us/windows/windows-update-troubleshooting-19bc41ca-ad72-ae67-af3c-89ce169755dd',
  );

  return urls;
}

export async function research(
  keyword: Keyword,
  /**
   * The vertical the post will be filed under. Defaults to the troubleshooting
   * route so an existing caller that does not pass it keeps its old behaviour.
   */
  categorySlug: CategorySlug = 'windows',
): Promise<ResearchSource[]> {
  const sources: ResearchSource[] = [];
  const isTroubleshooting = categorySlug === 'windows';

  // Pages specifically about this topic, found by search, ahead of any
  // fallbacks. The Windows route is restricted to Microsoft-owned domains — see
  // the note in discovery.ts for why forum results are deliberately discarded.
  const discovered = isTroubleshooting
    ? await findSolutionSources(keyword.phrase)
    : await findGeneralSources(keyword.phrase, categorySlug);

  const urls = [
    ...keywordUrl(keyword),
    ...discovered.map((s) => s.url),
    // Only troubleshooting posts get fixed fallbacks. There is no general-interest
    // equivalent: a page that is always reachable is by definition not about
    // today's story, and handing one over would put unrelated facts in front of a
    // generator that is required to write only what its sources say.
    ...(isTroubleshooting ? windowsFallbackUrls(keyword) : []),
  ];

  if (discovered.length > 0) {
    log.info(`research: ${discovered.length} source page(s) found for "${keyword.phrase}"`);
  }

  for (const url of [...new Set(urls)]) {
    if (sources.length >= TARGET_SOURCES) break;
    try {
      const source = await fetchSource(url);
      if (source.text.length < 400) {
        log.warn(`research: ${url} returned too little text; skipping`);
        continue;
      }
      sources.push(source);
    } catch (error) {
      log.warn(`research: ${url} failed — ${error instanceof Error ? error.message : error}`);
    }
  }

  log.info(`research: ${sources.length} source(s) for "${keyword.phrase}"`);
  return sources;
}

/**
 * Exported so a post's sources can be re-fetched after the fact — the post
 * stores each source's URL and title but not its text, so re-running the
 * quality gate on an already-generated draft has to go back to the page.
 */
export async function fetchSource(url: string): Promise<ResearchSource> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': botUserAgent(),
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    return {
      url: response.url || url,
      title: extractTitle(html) || url,
      text: extractText(html).slice(0, MAX_CHARS_PER_SOURCE),
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractTitle(html: string): string {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match ? decode(match[1]) : '';
}

/** Strips scripts, styles, nav chrome and tags, leaving readable prose. */
export function extractText(html: string): string {
  return decode(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<header\b[\s\S]*?<\/header>/gi, ' ')
      .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' '),
  );
}
