/**
 * One-off maintenance tasks, runnable inside the deployed container.
 *
 * The production database listens on 127.0.0.1 only, so anything that has to
 * touch it directly must run on the server. The route in is a Coolify scheduled
 * task, whose `command` field is capped at a few hundred characters — far too
 * short to inline a real script, which is why this file exists and is copied
 * into the runtime image.
 *
 *   node scripts/maintenance.cjs ensure-author
 *   node scripts/maintenance.cjs list-authors
 *
 * Plain CommonJS on purpose: the runtime image installs production dependencies
 * only, so there is no tsx and no TypeScript toolchain to run a .ts file with.
 *
 * Every task here must be idempotent. A scheduled task fires on a cron and the
 * cheapest way to run one "once" is to let it fire and then delete it, which
 * means it may well run two or three times first.
 */

const { PrismaClient } = require('@prisma/client');

const VERTICALS = [
  'tech',
  'entertainment',
  'sports',
  'money',
  'health',
  'gaming',
  'travel',
  'education',
  'windows',
];

/**
 * The byline generated articles are published under.
 *
 * The bio states only what is verifiable: who runs the site, how the articles
 * are produced, and who is answerable for them. It deliberately claims no
 * credentials, experience or history — this is a real person, and inventing a
 * background for them is the one thing the project's rule about honest bios
 * exists to prevent. Edit it in /admin/authors to say what you want it to say.
 */
const AUTHOR = {
  name: 'Ankur Singh',
  slug: 'ankur-singh',
  bio:
    'Ankur Singh founded Favo News and edits it. Articles are drafted with AI ' +
    'assistance and checked against their sources before they are published. ' +
    'He is responsible for everything that appears under this byline.',
  stylePrompt:
    'Write plainly for a general reader. Lead with what happened and why it ' +
    'matters to them, then the detail. Short paragraphs. Attribute every figure, ' +
    'date and quote to the source it came from. No hype, no filler, and never ' +
    'pad to reach a length.',
  categoryFocus: JSON.stringify(VERTICALS),
  isGuest: false,
};

async function ensureAuthor(prisma) {
  const existing = await prisma.author.findUnique({ where: { slug: AUTHOR.slug } });

  // An existing row keeps its bio and style prompt: those are editorial copy a
  // human may well have rewritten, and a rerun must not quietly revert that.
  // Only the fields that decide whether the byline works are enforced.
  const author = await prisma.author.upsert({
    where: { slug: AUTHOR.slug },
    update: {
      name: AUTHOR.name,
      categoryFocus: AUTHOR.categoryFocus,
      isGuest: false,
    },
    create: AUTHOR,
  });

  console.log(
    existing ? 'AUTHOR_UPDATED' : 'AUTHOR_CREATED',
    author.id,
    author.slug,
    author.name,
  );
}

async function listAuthors(prisma) {
  const authors = await prisma.author.findMany({
    select: { slug: true, name: true, isGuest: true, categoryFocus: true },
    orderBy: { name: 'asc' },
  });
  for (const a of authors) {
    console.log(`AUTHOR ${a.slug} | ${a.name} | guest=${a.isGuest} | ${a.categoryFocus}`);
  }
  console.log('AUTHOR_COUNT', authors.length);
}

/**
 * Prints what a draft actually came out as.
 *
 * The admin UI is behind a password and the database behind localhost, so there
 * was no way to answer "how long is it, did it get a photograph, what did the
 * quality gate say" without a human opening a browser. That made the first real
 * generation much harder to debug than it needed to be.
 *
 *   node scripts/maintenance.cjs show-post <slug>
 *   node scripts/maintenance.cjs show-post            (most recent draft)
 */
async function showPost(prisma) {
  const slug = process.argv[3];
  const post = slug
    ? await prisma.post.findUnique({ where: { slug }, include: { author: true, category: true } })
    : await prisma.post.findFirst({
        where: { status: { in: ['REVIEW', 'DRAFT'] } },
        orderBy: { createdAt: 'desc' },
        include: { author: true, category: true },
      });

  if (!post) {
    console.log('POST_NOT_FOUND', slug || '(no draft in review)');
    return;
  }

  // Same rule as structure.ts: fenced code must not count towards prose length.
  const words = post.body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`|-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  let credit = null;
  try {
    credit = post.imageCredit ? JSON.parse(post.imageCredit) : null;
  } catch {
    credit = { parseError: true };
  }

  console.log('SLUG        ', post.slug);
  console.log('TITLE       ', post.title);
  console.log('STATUS      ', post.status);
  console.log('CATEGORY    ', post.category.name);
  console.log('AUTHOR      ', post.author.name, `(${post.author.slug})`);
  console.log('WORDS       ', words);
  console.log('SCORE       ', post.qualityScore);
  console.log('H2 COUNT    ', (post.body.match(/^##\s/gm) || []).length);
  console.log('FAQ COUNT   ', (JSON.parse(post.faq || '[]') || []).length);
  console.log('SOURCES     ', (JSON.parse(post.sourceUrls || '[]') || []).length);
  console.log('RELATED     ', (JSON.parse(post.relatedSlugs || '[]') || []).length);
  console.log('IMAGE       ', post.featuredImage);
  console.log('IMAGE TYPE  ', credit && credit.license ? `photo (${credit.license})` : 'generated card');
  if (credit && credit.creator) console.log('CREDIT      ', credit.creator, '|', credit.sourceName);
  console.log('META TITLE  ', post.metaTitle);
  console.log('QUICK ANSWER', post.quickAnswer);
  console.log('--- QUALITY NOTES ---');
  console.log(post.qualityNotes || '(none)');
  console.log('--- FIRST 600 CHARS OF BODY ---');
  console.log(post.body.slice(0, 600));
}

const TASKS = {
  'ensure-author': ensureAuthor,
  'list-authors': listAuthors,
  'show-post': showPost,
};

async function main() {
  const name = process.argv[2];
  const task = TASKS[name];
  if (!task) {
    console.error(`Unknown task "${name}". Known: ${Object.keys(TASKS).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    await task(prisma);
  } catch (error) {
    console.error('TASK_FAILED', error && error.message ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
