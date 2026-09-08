import 'dotenv/config';
import { prisma } from '@/lib/db';
import { postPath } from '@/lib/urls';

/**
 * Publishes every post currently in REVIEW.
 *
 * Mirrors the guards in `setPostStatus` (src/lib/admin/actions.ts) rather than
 * writing the status blindly: a post still needs a featured image, a meta
 * description and a real body before it can go live. Bypassing those from a
 * script would defeat the point of having them in the admin action.
 *
 * `publishedAt` is set once and preserved on re-runs, so the canonical
 * publication date does not move if a post is unpublished and republished.
 *
 * Dry run by default; pass `--force` to apply.
 */
async function main() {
  const force = process.argv.includes('--force');

  const posts = await prisma.post.findMany({
    where: { status: 'REVIEW' },
    include: { category: { include: { parent: { select: { slug: true } } } } },
  });

  if (posts.length === 0) {
    console.log('Nothing in REVIEW.');
    return;
  }

  const ready: typeof posts = [];
  for (const post of posts) {
    const problems: string[] = [];
    if (!post.featuredImage) problems.push('no featured image');
    if (post.body.trim().length < 200) problems.push('body is too short');
    if (!post.metaDescription) problems.push('no meta description');
    // A zero means the quality gate never returned, not that the draft scored
    // badly — so the article has never been checked against its sources. The
    // editorial policy states that every article is, which makes publishing one
    // a false claim rather than a judgement call. Re-grade it first
    // (scripts/regrade.ts) or edit it by hand.
    if (post.qualityScore === 0) problems.push('quality gate never ran (score 0)');

    if (problems.length > 0) {
      console.log(`SKIP  ${post.slug}\n        ${problems.join(', ')}`);
      continue;
    }
    ready.push(post);
    console.log(`READY ${postPath(post)}`);
  }

  if (!force) {
    console.log(`\nDRY RUN — ${ready.length} would publish. Re-run with --force.`);
    return;
  }

  for (const post of ready) {
    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: post.publishedAt ?? new Date(),
      },
    });
    console.log(`published ${postPath(post)}`);
  }
  console.log(`\n${ready.length} post(s) published.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
