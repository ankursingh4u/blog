import 'dotenv/config';
import { prisma } from '@/lib/db';

/**
 * Removes near-duplicate articles, keeping the best of each cluster.
 *
 * Two things produce them:
 *
 *   1. The same story reaches the keyword queue under several headlines. Ingest
 *      dedupes on the exact phrase, so "Transfer rumors: Arsenal want Rice" and
 *      "Arsenal in Rice talks — transfer rumors" both survive as distinct
 *      keywords and both get written up.
 *   2. Two pipeline processes running at once select the same keyword before
 *      either marks it USED. That is what the `-2` slug suffixes are: the slug
 *      collided, so `uniqueSlug` appended a counter.
 *
 * Clustering is on title-word overlap rather than slug, because case 1 produces
 * genuinely different slugs for the same story. The survivor is the highest
 * quality score, tie-broken by whichever was written first; a post whose gate
 * never ran (score 0) always loses to one that was actually graded.
 *
 * Dry run by default; pass `--force` to delete.
 */
// Same matcher ingest uses, so the guard and the clean-up cannot disagree about
// what counts as a duplicate.
import { isNearDuplicate, titleTokens } from '@/lib/similarity';

async function main() {
  const force = process.argv.includes('--force');

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, slug: true, title: true, qualityScore: true, status: true },
  });

  const enriched = posts.map((p) => ({ ...p, w: titleTokens(p.title) }));
  // Best first, so the head of each cluster is the one worth keeping.
  enriched.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));

  const claimed = new Set<string>();
  const toDelete: Array<{ slug: string; score: number | null; keptFor: string }> = [];

  for (const post of enriched) {
    if (claimed.has(post.id)) continue;
    claimed.add(post.id);

    for (const other of enriched) {
      if (claimed.has(other.id)) continue;
      if (isNearDuplicate(post.w, other.w)) {
        claimed.add(other.id);
        toDelete.push({ slug: other.slug, score: other.qualityScore, keptFor: post.slug });
      }
    }
  }

  console.log(`${posts.length} post(s); ${toDelete.length} near-duplicate(s) to remove\n`);
  for (const d of toDelete) {
    console.log(`remove ${d.slug} (score ${d.score})\n    kept ${d.keptFor}`);
  }

  if (!force) {
    console.log(`\nDRY RUN — nothing deleted. ${posts.length - toDelete.length} would remain.`);
    return;
  }

  const slugs = toDelete.map((d) => d.slug);
  const { count } = await prisma.post.deleteMany({ where: { slug: { in: slugs } } });
  console.log(`\ndeleted ${count}; ${posts.length - count} post(s) remain.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
