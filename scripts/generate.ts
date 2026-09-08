/**
 * `npm run generate` — one pipeline run from the command line.
 *
 * Flags:
 *   --skip-ingest   Use the existing keyword queue; do not poll the feeds.
 *   --limit=N       Override POSTS_PER_DAY for this run (capped at 3).
 */
import { config } from 'dotenv';
import { runPipeline } from '../src/pipeline/run';
import { prisma } from '../src/lib/db';

config();

async function main() {
  const args = process.argv.slice(2);
  const skipIngest = args.includes('--skip-ingest');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : undefined;

  const result = await runPipeline({
    skipIngest,
    limit: Number.isFinite(limit) ? limit : undefined,
  });

  console.log('\n─── Run summary ───────────────────────────────');
  console.log(`  new keywords : ${result.ingested}`);
  console.log(`  attempted    : ${result.attempted}`);
  console.log(`  published    : ${result.published}`);
  console.log(`  in review    : ${result.inReview}`);
  console.log(`  failed       : ${result.failed}`);

  for (const outcome of result.outcomes) {
    const detail =
      outcome.status === 'FAILED'
        ? outcome.error
        : `score ${outcome.score}${outcome.blocked ? ' (BLOCKED)' : ''} → /${outcome.slug}`;
    console.log(`  · [${outcome.status}] ${outcome.keyword} — ${detail}`);
  }
  console.log('───────────────────────────────────────────────\n');

  if (result.failed > 0 && result.published + result.inReview === 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
