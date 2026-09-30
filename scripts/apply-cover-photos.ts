import 'dotenv/config';
import { prisma } from '@/lib/db';
import { storeImage, type ImageCandidate } from '@/lib/images';

/**
 * Gives each article an openly-licensed photograph instead of the generated
 * OG card.
 *
 * `Post.featuredImage` holds one of two things: the branded card rendered by
 * /api/og, which carries no credit, or a real photograph, which does. Storing a
 * photo here replaces the card as both the in-page cover and `og:image` — see
 * `coverPhoto()` in components/ui/cover-art.tsx, which uses the presence of a
 * licence to tell them apart.
 *
 * Dry run by default. Applying pictures to 34 news articles unreviewed is how a
 * site ends up illustrating a story about one thing with a photograph of
 * another, so the intended flow is: run it, read the picks, then `--apply`.
 *
 *   npx tsx scripts/apply-cover-photos.ts                  # show picks, change nothing
 *   npx tsx scripts/apply-cover-photos.ts --apply          # store them
 *   npx tsx scripts/apply-cover-photos.ts --slug=foo --apply
 *   npx tsx scripts/apply-cover-photos.ts --apply --force  # redo posts that already have one
 *
 * On relevance: the subject comes from TOPIC_RULES below, not from the headline
 * text, with a per-vertical fallback behind it. That yields topical imagery — a
 * stadium for a match report, a trading floor for a markets piece — and not a
 * photograph of the specific event, which openly-licensed archives essentially
 * never have for this week's news.
 *
 * Generic-but-on-topic is the honest option here. The failure to avoid is an
 * image that looks like it depicts the event when it does not, which is why the
 * credit line naming the photographer and licence renders under every cover.
 */

/**
 * Subject rules, ranking, dedupe and the Openverse queries all live in
 * src/pipeline/cover-photo.ts now, so this script and the automated pipeline
 * pick images by identical logic. They were the same code by copy for one
 * session, which is exactly long enough for the two to start disagreeing about
 * which photograph a football story gets.
 */
import { findCoverPhoto, titleKey, type CoverPick } from '@/pipeline/cover-photo';

/** Kept as a local alias so the reporting code below reads unchanged. */
type Pick = CoverPick;
const bestFor = findCoverPhoto;

async function main() {
  const apply = process.argv.includes('--apply');
  const force = process.argv.includes('--force');
  const slug = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];

  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', ...(slug ? { slug } : {}) },
    include: { category: true },
    orderBy: { publishedAt: 'desc' },
  });

  console.log(`${posts.length} published post(s); ${apply ? 'APPLYING' : 'dry run — nothing will change'}\n`);

  let specific = 0;
  let generic = 0;
  let skipped = 0;
  let none = 0;
  const used = new Set<string>();

  /**
   * Cover paths already in use, across the whole table rather than this run.
   * Seeded from the database so a second, partial run cannot hand out a
   * photograph that an earlier one already assigned.
   */
  const taken = new Set(
    (
      await prisma.post.findMany({
        where: { featuredImage: { not: null }, ...(slug ? { NOT: { slug } } : {}) },
        select: { featuredImage: true, slug: true },
      })
    )
      .filter((p) => p.featuredImage && (!slug || p.slug !== slug))
      .map((p) => p.featuredImage as string),
  );

  for (const post of posts) {
    const hasPhoto = Boolean(post.imageCredit && post.imageCredit !== '');
    if (hasPhoto && !force) {
      skipped += 1;
      continue;
    }

    const pick = await bestFor(post.title, post.category.slug, used);
    if (!pick) {
      none += 1;
      console.log(`NO MATCH  [${post.category.slug}] ${post.title}\n`);
      continue;
    }

    const clean = (t: string) => t.replace(/<[^>]*>/g, '').trim().slice(0, 80);
    console.log(`[${post.category.slug}] ${post.title}`);
    console.log(`   match : ${pick.via === 'subject' ? 'subject' : 'category fallback'}  q="${pick.query}"`);

    if (!apply) {
      const c = pick.candidates[0];
      console.log(`   image : ${clean(c.title)}`);
      console.log(`   by    : ${c.creator} — ${c.license}`);
      console.log(`   size  : ${c.width}x${c.height}\n`);
      used.add(c.id);
      used.add(titleKey(c.title));
      if (pick.via === 'subject') specific += 1;
      else generic += 1;
      continue;
    }

    // Try each candidate in turn; oversize files and 403s are only discoverable
    // by fetching, so the first choice is not always the one that lands.
    let stored: Awaited<ReturnType<typeof storeImage>> | null = null;
    let chosen: ImageCandidate | null = null;
    for (const candidate of pick.candidates.slice(0, 40)) {
      try {
        const attempt = await storeImage(candidate, post.slug);

        // Storage is content-addressed, so the same photograph always lands on
        // the same path. That makes it the reliable duplicate check across runs
        // — the in-memory `used` set only covers the current one, which is how
        // eight posts ended up sharing a cover over several partial runs.
        if (taken.has(attempt.url)) {
          console.log(`   skip  : ${clean(candidate.title)} — already used by another post`);
          continue;
        }

        stored = attempt;
        chosen = candidate;
        break;
      } catch (error) {
        console.log(`   skip  : ${clean(candidate.title)} — ${error instanceof Error ? error.message : error}`);
      }
    }

    if (!stored || !chosen) {
      none += 1;
      console.log('   -> no usable image in this result set\n');
      continue;
    }

    used.add(chosen.id);
    used.add(titleKey(chosen.title));
    taken.add(stored.url);
    if (pick.via === 'subject') specific += 1;
    else generic += 1;

    await prisma.post.update({
      where: { id: post.id },
      data: { featuredImage: stored.url, imageCredit: JSON.stringify(stored.credit) },
    });
    console.log(`   image : ${clean(chosen.title)}`);
    console.log(`   by    : ${chosen.creator} — ${chosen.license}`);
    console.log(`   -> stored ${stored.url}\n`);
  }

  console.log(
    `\n${specific} matched the headline, ${generic} fell back to the vertical, ` +
      `${skipped} already had a photo, ${none} unmatched`,
  );
  if (!apply && specific + generic > 0) console.log('Re-run with --apply to store them.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
