import 'dotenv/config';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/utils';

/**
 * Renames the house bylines to Indian names.
 *
 * The site's primary audience is India — news discovery is weighted 2:1 towards
 * the India edition — and the bylines did not reflect that. Only the name and
 * slug change: the bios and style prompts describe a beat rather than a person,
 * so they carry over untouched, and the avatars are drawn from initials so they
 * follow automatically.
 *
 * Guest contributors are never touched. Their name is their own.
 *
 * Slugs change with the names, which changes /author/... URLs. Worth doing now
 * rather than later: the site has been live for days, the author pages are
 * barely indexed, and a mismatch between a byline and its URL only gets more
 * expensive to fix.
 *
 *   npx tsx scripts/rename-authors.ts
 *   npx tsx scripts/rename-authors.ts --apply
 */
const RENAMES: Array<{ from: string; to: string }> = [
  { from: 'Devan Brooks', to: 'Rohan Desai' },
  { from: 'Iris Vale', to: 'Ananya Iyer' },
  { from: 'Maya Orsini', to: 'Kabir Malhotra' },
  { from: 'Nadia Fenn', to: 'Meera Krishnan' },
  { from: 'Rosa Linden', to: 'Arjun Mehta' },
  { from: 'Sam Okonkwo', to: 'Sneha Reddy' },
  { from: 'Theo Abara', to: 'Vikram Chauhan' },
  // Priya Raghunathan is left alone — already an Indian name.
];

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`${RENAMES.length} rename(s); ${apply ? 'APPLYING' : 'dry run'}\n`);

  let done = 0;
  let missed = 0;

  for (const { from, to } of RENAMES) {
    const author = await prisma.author.findFirst({
      where: { name: from, isGuest: false },
      select: { id: true, slug: true, _count: { select: { posts: true } } },
    });

    if (!author) {
      console.log(`SKIP  "${from}" — no house author by that name`);
      missed += 1;
      continue;
    }

    // A guest could already hold the slug; two different people must not share
    // one author page.
    let slug = slugify(to);
    for (let n = 2; ; n += 1) {
      const clash = await prisma.author.findUnique({ where: { slug }, select: { id: true } });
      if (!clash || clash.id === author.id) break;
      slug = `${slugify(to)}-${n}`;
    }

    console.log(`${from} -> ${to}`);
    console.log(`   /author/${author.slug} -> /author/${slug}   (${author._count.posts} posts)`);

    if (apply) {
      await prisma.author.update({ where: { id: author.id }, data: { name: to, slug } });
      done += 1;
    }
  }

  console.log(`\n${done} renamed, ${missed} skipped`);
  if (!apply) console.log('Re-run with --apply.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
