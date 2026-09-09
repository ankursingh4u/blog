import 'dotenv/config';
import { prisma } from '@/lib/db';
import { generateFeaturedImage } from '@/pipeline/featured-image';

/**
 * Re-renders the branded OG card for posts whose stored image is stale.
 *
 * The card has the title drawn into the PNG, so editing a title in the admin
 * leaves the image showing the old wording. That is exactly what happened after
 * the "amid game injury" title was corrected — the post read correctly
 * everywhere except its own featured image, which still carried the mangled
 * headline into every card and social preview.
 *
 * Pass post slugs to target specific posts, or `--all` for every published one.
 * Requires the dev server to be running: the image is rendered by /api/og.
 */
async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--all');
  const all = process.argv.includes('--all');

  const posts = await prisma.post.findMany({
    where: all ? { status: 'PUBLISHED' } : { slug: { in: args } },
    include: { category: true },
  });

  if (posts.length === 0) {
    console.log('No matching posts. Pass slugs, or --all for every published post.');
    return;
  }

  let done = 0;
  let failed = 0;

  for (const post of posts) {
    const before = post.featuredImage;
    const url = await generateFeaturedImage({
      title: post.title,
      category: post.category.name,
      build: post.testedOnBuild,
      slug: post.slug,
    });

    if (!url) {
      failed += 1;
      console.log(`FAILED ${post.slug} — /api/og did not render (is the dev server up?)`);
      continue;
    }

    await prisma.post.update({ where: { id: post.id }, data: { featuredImage: url } });
    done += 1;
    console.log(`${post.slug}\n   was: ${before}\n   now: ${url}`);
  }

  // A tally, and a non-zero exit when anything failed. Without this a run where
  // every single render failed still exits 0 and reads as success in a log —
  // which is exactly what happened when the fetch target pointed at a domain
  // that did not resolve yet.
  console.log(`\n${done} regenerated, ${failed} failed, of ${posts.length}`);
  if (failed > 0) {
    console.log(
      'Set OG_RENDER_ORIGIN to the server actually serving /api/og ' +
        '(e.g. http://127.0.0.1:3000) when NEXT_PUBLIC_SITE_URL is not reachable.',
    );
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
