import 'dotenv/config';
import { prisma } from '@/lib/db';
import { fetchSource, type ResearchSource } from '@/pipeline/research';
import { runQualityGate } from '@/pipeline/quality-gate';
import { FaqArray, SourceRefArray, StringArray, parseJson } from '@/lib/json';
import type { CategorySlug } from '@/pipeline/parser';

/**
 * Re-runs the quality gate on posts whose score is 0.
 *
 * A zero means the gate never returned — a transient API failure on the second
 * of the two calls, after the draft had already been written and paid for. The
 * pipeline correctly fails closed and parks the post in review, but the article
 * itself is usually fine; it has simply never been checked.
 *
 * That distinction matters before publishing. The editorial policy states that
 * every draft is scored against its sources, so shipping an ungated post would
 * make that page untrue. This re-grades them instead of discarding the work.
 *
 * Sources are re-fetched, because a post stores each source's URL and title but
 * not the extracted text the gate needs. A source that has since gone away is
 * dropped, and the gate scores against what is still reachable.
 *
 * Dry run by default; pass `--force` to write the scores back.
 */
async function main() {
  const force = process.argv.includes('--force');

  const posts = await prisma.post.findMany({
    where: { qualityScore: 0 },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  });

  if (posts.length === 0) {
    console.log('No posts with a zero score.');
    return;
  }
  console.log(`${posts.length} post(s) to re-grade${force ? '' : ' (dry run)'}\n`);

  let regraded = 0;
  for (const post of posts) {
    const refs = parseJson(post.sourceUrls, SourceRefArray, []);

    const sources: ResearchSource[] = [];
    for (const ref of refs) {
      try {
        const source = await fetchSource(ref.url);
        if (source.text.length >= 400) sources.push(source);
      } catch {
        // A source that has rotated off the publisher's site is simply gone.
      }
    }

    if (sources.length === 0) {
      console.log(`SKIP  ${post.slug}\n        no source could be re-fetched; leave for a human`);
      continue;
    }

    const draft = {
      title: post.title,
      slug: post.slug,
      quickAnswer: post.quickAnswer,
      body: post.body,
      affectedBuilds: parseJson(post.affectedBuilds, StringArray, []),
      faq: parseJson(post.faq, FaqArray, []),
      metaTitle: post.metaTitle ?? '',
      metaDescription: post.metaDescription ?? '',
      internalLinkSuggestions: [],
    };

    const verified = [post.testedOnBuild].filter((v): v is string => Boolean(v));

    const quality = await runQualityGate({
      draft,
      sources,
      verifiedIdentifiers: verified,
      keywordPhrase: post.title,
      categorySlug: post.category.slug as CategorySlug,
    });

    console.log(
      `${quality.score === 0 ? 'FAIL ' : 'OK   '} ${post.slug}\n` +
        `        score ${quality.score}${quality.blocked ? ' BLOCKED' : ''} ` +
        `from ${sources.length} source(s)`,
    );

    if (force && quality.score > 0) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          qualityScore: quality.score,
          qualityNotes: `${quality.notes}\n\n(Re-graded: the original run's quality call failed.)`,
        },
      });
      regraded += 1;
    }
  }

  console.log(`\n${force ? `${regraded} post(s) re-graded.` : 'Dry run — nothing written.'}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
