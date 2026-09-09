import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';

/**
 * Loads a `export-data.ts` dump into whatever DATABASE_URL points at.
 *
 * Engine-agnostic: it goes through Prisma rather than emitting SQL, so the same
 * file restores into SQLite or Postgres. That is what makes the migration a
 * copy rather than a rewrite.
 *
 * Rows are upserted by primary key, so ids and every relation survive and the
 * script is safe to run twice. Insert order follows the foreign keys —
 * categories (parents first), authors, posts, keywords, settings — because
 * Postgres enforces them, unlike the SQLite file this data came from.
 *
 * Refuses to touch a database that already holds posts unless `--force` is
 * given: pointing this at the wrong DATABASE_URL should not silently overwrite
 * a live site.
 *
 *   npx tsx scripts/import-data.ts --file=data-export.json
 */
interface Dump {
  exportedAt: string;
  counts: Record<string, number>;
  categories: Array<Record<string, unknown>>;
  authors: Array<Record<string, unknown>>;
  posts: Array<Record<string, unknown>>;
  keywords: Array<Record<string, unknown>>;
  settings: Array<Record<string, unknown>>;
}

/** JSON has no date type, so anything that looks like one is revived. */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function revive<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = typeof value === 'string' && ISO.test(value) ? new Date(value) : value;
  }
  return out as T;
}

async function main() {
  const force = process.argv.includes('--force');
  const fileArg = process.argv.find((a) => a.startsWith('--file='))?.split('=')[1];
  const file = path.resolve(process.cwd(), fileArg ?? 'data-export.json');

  const dump = JSON.parse(await readFile(file, 'utf8')) as Dump;
  const target = process.env.DATABASE_URL?.startsWith('file:') ? 'SQLite' : 'Postgres';

  console.log(`importing ${file}`);
  console.log(`   exported : ${dump.exportedAt}`);
  console.log(`   target   : ${target}`);
  console.log(`   contents : ${Object.entries(dump.counts).map(([k, v]) => `${k}=${v}`).join(' ')}`);

  const existingPosts = await prisma.post.count();
  if (existingPosts > 0 && !force) {
    console.log(
      `\nRefusing to import: the target already has ${existingPosts} post(s). ` +
        'Check DATABASE_URL points where you think it does, then re-run with --force.',
    );
    return;
  }

  // Categories first, and parents before children — the self-relation is a
  // foreign key that Postgres will actually enforce.
  const roots = dump.categories.filter((c) => !c.parentId);
  const children = dump.categories.filter((c) => c.parentId);
  for (const row of [...roots, ...children]) {
    const data = revive(row);
    await prisma.category.upsert({
      where: { id: data.id as string },
      create: data as never,
      update: data as never,
    });
  }
  console.log(`\n   categories  ${dump.categories.length}`);

  for (const row of dump.authors) {
    const data = revive(row);
    await prisma.author.upsert({
      where: { id: data.id as string },
      create: data as never,
      update: data as never,
    });
  }
  console.log(`   authors     ${dump.authors.length}`);

  for (const row of dump.posts) {
    const data = revive(row);
    await prisma.post.upsert({
      where: { id: data.id as string },
      create: data as never,
      update: data as never,
    });
  }
  console.log(`   posts       ${dump.posts.length}`);

  for (const row of dump.keywords) {
    const data = revive(row);
    await prisma.keyword.upsert({
      where: { id: data.id as string },
      create: data as never,
      update: data as never,
    });
  }
  console.log(`   keywords    ${dump.keywords.length}`);

  for (const row of dump.settings) {
    const data = revive(row);
    await prisma.setting.upsert({
      where: { key: data.key as string },
      create: data as never,
      update: data as never,
    });
  }
  console.log(`   settings    ${dump.settings.length}`);

  // Verify rather than assume: a silent partial import is the failure mode
  // that only shows up when a page 404s in production.
  const after = {
    categories: await prisma.category.count(),
    authors: await prisma.author.count(),
    posts: await prisma.post.count(),
    keywords: await prisma.keyword.count(),
    settings: await prisma.setting.count(),
  };
  console.log('\nverifying:');
  let ok = true;
  for (const [table, expected] of Object.entries(dump.counts)) {
    const actual = after[table as keyof typeof after];
    const match = actual >= expected;
    if (!match) ok = false;
    console.log(`   ${table.padEnd(12)} expected ${expected}, found ${actual} ${match ? 'ok' : 'MISMATCH'}`);
  }
  console.log(ok ? '\nImport complete.' : '\nImport finished with mismatches — investigate before deploying.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
