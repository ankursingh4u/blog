import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';

/**
 * Replaces the seeded author biographies.
 *
 * The originals read as real people with verifiable careers — "nine years doing
 * desktop support for mid-size businesses", "covered lower-league football for a
 * regional paper" — and three of them described a verification practice the site
 * does not perform: keeping a rack of test machines, testing every walkthrough
 * on a clean install, being "the reason every guide here says what it was tested
 * on". No post in the database has ever had `testedOnBuild` set.
 *
 * Invented résumés attached to AI-drafted articles are a misrepresentation of a
 * person, and claiming checks that never happen misrepresents the work. These
 * replacements describe the beat and the editorial standard instead, which is
 * true and is what a reader actually wants to know.
 *
 * Writes to the database and to prisma/seed.ts, so re-seeding cannot restore
 * the old ones. Dry run by default; pass `--force` to apply.
 */
const BIOS: Record<string, string> = {
  'maya-orsini':
    'The tech and Windows byline. Platform and release coverage: what changed, who it affects, ' +
    'and what has actually been confirmed as opposed to what is being assumed. Where the cause ' +
    'of a problem is not known, the page says so.',

  'devan-brooks':
    'The Windows fix-it and gaming-hardware byline. Methods run from least destructive to most, ' +
    'and anything that edits the registry, resets components or deletes data carries its warning ' +
    'before the steps rather than after them.',

  'priya-raghunathan':
    'The walkthrough and education byline. Steps are numbered one action at a time and say what ' +
    'you should see afterwards, so you can tell whether it worked. Exam and admissions coverage ' +
    'sticks to dates and requirements that have actually been published.',

  'nadia-fenn':
    'The entertainment and travel byline. Release dates, platforms and prices up front, opinion ' +
    'kept plainly separate from fact, and no plot point spoiled without warning first.',

  'theo-abara':
    'The sports byline. Results, fixtures and transfers — the result first, the context after. ' +
    'A transfer claim is attributed to whoever reported it and labelled as reporting rather than ' +
    'fact until it is confirmed.',

  'rosa-linden':
    'The money byline. Markets, budgets and personal finance without jargon, and every figure ' +
    'explained in terms of what it means for an ordinary household. Never individual investment ' +
    'advice, and never a recommendation to buy anything.',

  'sam-okonkwo':
    'The health byline. Fitness, nutrition and sleep reported from published research, naming the ' +
    'study or body behind a claim and saying plainly when the evidence is thin. Never medical ' +
    'advice — that is a conversation for a clinician who knows your situation.',

  'iris-vale':
    'The gaming and consumer-tech byline. Specific about platforms, versions and what a patch ' +
    'actually changed, quoting the official notes where they exist, and stating the hardware ' +
    'behind any performance claim.',
};

async function main() {
  const force = process.argv.includes('--force');

  const authors = await prisma.author.findMany({ orderBy: { name: 'asc' } });
  const missing = authors.filter((a) => !BIOS[a.slug]).map((a) => a.slug);
  if (missing.length > 0) {
    console.log(`No replacement written for: ${missing.join(', ')} — leaving those alone.\n`);
  }

  for (const author of authors) {
    const next = BIOS[author.slug];
    if (!next || next === author.bio) continue;
    console.log(`${author.name}\n  old: ${author.bio.slice(0, 96)}…\n  new: ${next.slice(0, 96)}…\n`);
    if (force) await prisma.author.update({ where: { id: author.id }, data: { bio: next } });
  }

  // Keep the seed in step, or `npm run db:seed` puts the invented careers back.
  const seedPath = path.join(process.cwd(), 'prisma', 'seed.ts');
  const seed = await readFile(seedPath, 'utf8');
  let updated = seed;
  for (const [slug, bio] of Object.entries(BIOS)) {
    // Match the bio string that follows this slug in the AUTHORS array.
    const pattern = new RegExp(
      `(slug: '${slug}',[\\s\\S]{0,400}?bio:\\s*\\n?\\s*)'(?:[^'\\\\]|\\\\.)*'`,
      'm',
    );
    updated = updated.replace(pattern, `$1${JSON.stringify(bio)}`);
  }

  if (force) {
    await writeFile(seedPath, updated, 'utf8');
    console.log('Database and prisma/seed.ts updated.');
  } else {
    console.log(
      updated === seed
        ? 'DRY RUN — seed.ts would NOT change (check the slugs matched).'
        : 'DRY RUN — nothing written. seed.ts would be rewritten too.',
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
