import 'dotenv/config';
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';

/**
 * Removes the hand-written development fixtures and any cover image they leave
 * behind.
 *
 * The fixtures were always meant to be deleted before launch — they are sample
 * content with stock photography, written to give the site something to render
 * during the build. They are not pipeline output.
 *
 * `generatedBy: 'HUMAN'` is the selector. `scripts/seed-content.ts` stamps every
 * fixture with it and the pipeline never writes it, so it separates the two
 * populations exactly. Matching on slug or date would not.
 *
 * Cover files are swept afterwards rather than per post, because storage is
 * content-addressed (`src/lib/storage.ts`) and several fixtures share a file —
 * 47 files for 53 posts. Deleting a file per post would remove one that a
 * surviving post still points at. Instead: delete the rows, then drop only the
 * files no post references any more.
 *
 * Dry run by default. Pass `--force` to actually delete.
 */

const COVERS_DIR = path.join(process.cwd(), 'public', 'uploads', 'covers');

async function main() {
  const force = process.argv.includes('--force');

  const fixtures = await prisma.post.findMany({
    where: { generatedBy: 'HUMAN' },
    select: { id: true, slug: true, featuredImage: true },
  });
  const generated = await prisma.post.count({ where: { generatedBy: 'AI' } });

  console.log(`fixtures (generatedBy=HUMAN) : ${fixtures.length}`);
  console.log(`pipeline posts (AI), kept    : ${generated}`);

  if (fixtures.length === 0) {
    console.log('\nNothing to delete.');
    return;
  }

  if (!force) {
    console.log('\nDRY RUN — nothing deleted. Re-run with --force to apply.');
    console.log('Would delete these posts:');
    for (const post of fixtures.slice(0, 10)) console.log(`  ${post.slug}`);
    if (fixtures.length > 10) console.log(`  … and ${fixtures.length - 10} more`);
    return;
  }

  const { count } = await prisma.post.deleteMany({ where: { generatedBy: 'HUMAN' } });
  console.log(`\ndeleted ${count} post(s)`);

  // Sweep covers that nothing references any more.
  const stillReferenced = new Set(
    (
      await prisma.post.findMany({
        where: { featuredImage: { not: null } },
        select: { featuredImage: true },
      })
    ).map((p) => path.basename(p.featuredImage!)),
  );

  let files: string[];
  try {
    files = await readdir(COVERS_DIR);
  } catch {
    console.log('no covers directory; nothing to sweep');
    return;
  }

  let removed = 0;
  for (const file of files) {
    if (stillReferenced.has(file)) continue;
    await unlink(path.join(COVERS_DIR, file));
    removed += 1;
  }
  console.log(`removed ${removed} orphaned cover file(s); ${stillReferenced.size} still in use`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
