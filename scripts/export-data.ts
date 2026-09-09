import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';

/**
 * Dumps every row to a JSON file.
 *
 * Written for the SQLite→Postgres move, but it is the site's only content
 * backup either way: `prisma/dev.db` is gitignored, correctly — a binary
 * database does not belong in version control — which means git protects the
 * code and nothing at all protects the articles.
 *
 * Exports whole rows including ids, so relations survive the round trip and a
 * re-import reproduces the site exactly rather than approximately. Dates go out
 * as ISO strings and are revived on import.
 *
 *   npx tsx scripts/export-data.ts                 → data-export.json
 *   npx tsx scripts/export-data.ts --out=backup.json
 */
async function main() {
  const outArg = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1];
  const out = path.resolve(process.cwd(), outArg ?? 'data-export.json');

  // Order matters on import: parents before the rows that reference them.
  // Category has no createdAt, and its self-relation means parents must be
  // written before children — `parentId asc` puts the nulls (the top-level
  // sections) first on both engines.
  const [categories, authors, posts, keywords, settings] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ parentId: 'asc' }, { position: 'asc' }] }),
    prisma.author.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.post.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.keyword.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.setting.findMany({ orderBy: { key: 'asc' } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    source: process.env.DATABASE_URL?.startsWith('file:') ? 'sqlite' : 'postgres',
    counts: {
      categories: categories.length,
      authors: authors.length,
      posts: posts.length,
      keywords: keywords.length,
      settings: settings.length,
    },
    categories,
    authors,
    posts,
    keywords,
    settings,
  };

  await writeFile(out, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`wrote ${out}`);
  for (const [table, count] of Object.entries(payload.counts)) {
    console.log(`   ${table.padEnd(12)} ${count}`);
  }
  console.log(
    '\nThis file contains every article. Keep it somewhere other than this ' +
      'machine before touching the database.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
