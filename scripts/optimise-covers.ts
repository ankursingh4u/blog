import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { storage } from '@/lib/storage';

/**
 * Re-encodes cover photographs already on disk, in place.
 *
 * `storeImage` now downscales on the way in, but the covers stored before that
 * are archive masters — 34 articles came to 53 MB, one of them a single 5.2 MB
 * JPEG. Those files are committed to the repo and baked into the deployment
 * image, so the weight is paid on every clone and every build.
 *
 * Re-running the picker would fix the size but choose different photographs,
 * throwing away picks that were reviewed by hand. This keeps each article's
 * image and its credit, and changes only the bytes.
 *
 * Storage is content-addressed, so a re-encode lands on a new path; the post is
 * repointed and the original deleted. Dry run unless `--apply`.
 *
 *   npx tsx scripts/optimise-covers.ts
 *   npx tsx scripts/optimise-covers.ts --apply
 */
const STORE_WIDTH = 1600;

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const apply = process.argv.includes('--apply');

  const posts = await prisma.post.findMany({
    where: { imageCredit: { not: '' }, featuredImage: { not: null } },
    select: { id: true, slug: true, featuredImage: true },
  });

  console.log(`${posts.length} cover(s); ${apply ? 'APPLYING' : 'dry run'}\n`);

  const sharp = (await import('sharp')).default;
  let before = 0;
  let after = 0;
  let changed = 0;

  for (const post of posts) {
    const rel = post.featuredImage as string;
    if (!rel.startsWith('/uploads/')) continue;

    const abs = path.join(process.cwd(), 'public', rel.replace(/^\//, ''));
    let source: Buffer;
    try {
      source = await readFile(abs);
    } catch {
      console.log(`MISSING ${rel}`);
      continue;
    }

    const image = sharp(source, { failOn: 'none' });
    const meta = await image.metadata();
    if (!meta.width) {
      console.log(`UNREADABLE ${rel}`);
      continue;
    }

    const body = await image
      .rotate()
      .resize({ width: Math.min(meta.width, STORE_WIDTH), withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    before += source.byteLength;

    if (body.byteLength >= source.byteLength) {
      after += source.byteLength;
      console.log(`keep    ${post.slug}  ${mb(source.byteLength)} (re-encode was no smaller)`);
      continue;
    }

    after += body.byteLength;
    changed += 1;
    console.log(
      `${apply ? 'shrink ' : 'would  '} ${post.slug.padEnd(52).slice(0, 52)} ` +
        `${mb(source.byteLength)} -> ${mb(body.byteLength)}  (${meta.width}px -> ${Math.min(meta.width, STORE_WIDTH)}px)`,
    );

    if (!apply) continue;

    const stored = await storage.put({
      body,
      filename: `${post.slug}-cover.webp`,
      contentType: 'image/webp',
      prefix: 'covers',
    });
    await prisma.post.update({ where: { id: post.id }, data: { featuredImage: stored.url } });
    // Only after the post points elsewhere, so a crash cannot leave it dangling.
    // `remove` takes a key relative to the upload root ("covers/x.jpg"), not the
    // public path ("/uploads/covers/x.jpg") that is stored on the post.
    if (stored.url !== rel) await storage.remove(rel.replace(/^\/uploads\//, ''));
  }

  console.log(
    `\n${changed} re-encoded. Total ${mb(before)} -> ${mb(after)} ` +
      `(${before > 0 ? Math.round((1 - after / before) * 100) : 0}% smaller)`,
  );
  if (!apply && changed > 0) console.log('Re-run with --apply.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
