/**
 * `npx tsx scripts/check-sources.ts`
 *
 * Fetches every URL referenced in the content fixtures and reports any that do
 * not resolve. Fixture sources are presented to readers as real references, so
 * a dead or invented link is a correctness bug, not a cosmetic one.
 *
 * Exits non-zero if anything fails, so it can gate a commit.
 */
import { ARTICLES } from './content/articles';
import { VERTICAL_ARTICLES } from './content/verticals';

const TIMEOUT_MS = 20_000;

async function check(url: string): Promise<{ ok: boolean; detail: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Some sites reject HEAD outright, so use GET and abandon the body.
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // A bare fetch UA is blocked by several government and health sites.
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    });
    return { ok: res.ok, detail: `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : 'failed' };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const all = [...ARTICLES, ...VERTICAL_ARTICLES];
  const urls = new Map<string, string[]>();

  for (const article of all) {
    for (const source of article.sources) {
      const slugs = urls.get(source.url) ?? [];
      slugs.push(article.slug);
      urls.set(source.url, slugs);
    }
  }

  console.log(`Checking ${urls.size} distinct source URL(s) across ${all.length} article(s)…\n`);

  const failures: string[] = [];
  for (const [url, slugs] of urls) {
    const { ok, detail } = await check(url);
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${detail.padEnd(12)}  ${url}`);
    if (!ok) failures.push(`${url} (${detail}) — used by: ${slugs.join(', ')}`);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} unreachable source(s):`);
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log('\nAll source URLs resolved.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
