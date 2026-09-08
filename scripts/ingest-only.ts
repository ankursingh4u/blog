import 'dotenv/config';
import { prisma } from '@/lib/db';
import { ingest } from '@/pipeline/ingest';

/**
 * Runs discovery + ingest on their own, with no generation.
 *
 * Useful because it exercises every feed and writes keywords without spending a
 * single Anthropic token — the expensive half of `npm run generate` is steps
 * 4–6, not this. Run it to check the feeds are alive and classifying sensibly
 * before committing to a paid generation run.
 */
async function main() {
  const result = await ingest();

  console.log('\n--- ingest result ---');
  console.log(`feeds read     : ${result.feedsRead}/${result.feedsRead + result.feedsFailed.length}`);
  if (result.feedsFailed.length > 0) console.log(`feeds failed   : ${result.feedsFailed.join(', ')}`);
  console.log(`items seen     : ${result.itemsSeen}`);
  console.log(`candidates     : ${result.candidates}`);
  console.log(`inserted       : ${result.inserted}`);
  console.log(`by channel     : ${JSON.stringify(result.bySource)}`);

  const queued = await prisma.keyword.groupBy({
    by: ['categoryId'],
    where: { status: 'QUEUED' },
    _count: { _all: true },
  });
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));

  console.log('\n--- queued keywords by category ---');
  for (const row of queued.sort((a, b) => b._count._all - a._count._all)) {
    const label = row.categoryId ? slugById.get(row.categoryId) ?? '???' : '(none)';
    console.log(`  ${String(row._count._all).padStart(4)}  ${label}`);
  }

  console.log('\n--- a sample of what was ingested ---');
  const sample = await prisma.keyword.findMany({
    where: { status: 'QUEUED' },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { phrase: true, category: { select: { slug: true } } },
  });
  for (const k of sample) {
    console.log(`  [${(k.category?.slug ?? 'none').padEnd(13)}] ${k.phrase}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
