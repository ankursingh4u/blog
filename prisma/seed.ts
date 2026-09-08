/**
 * Seeds the eight top-level verticals, the Windows sub-section, the author
 * roster and default settings.
 *
 * Safe to re-run: everything is upserted by slug.
 *
 * It also carries a one-time migration (relocateLegacyPosts) for installs that
 * predate the move from the Windows-only category set. That step moves posts
 * off the five retired Windows categories into /tech/windows and then removes
 * the empty categories. It is a no-op once there is nothing left to move.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Top-level verticals. `slug` is permanent — it is the URL. */
const CATEGORIES = [
  {
    slug: 'tech',
    name: 'Tech',
    position: 1,
    accent: 'violet',
    description:
      'Phones, laptops, software and AI — what launched, what changed, and whether it is worth your money or your time.',
  },
  {
    slug: 'entertainment',
    name: 'Entertainment',
    position: 2,
    accent: 'fuchsia',
    description:
      'Film, television, streaming and music: what is out, what is worth watching, and what everyone is arguing about this week.',
  },
  {
    slug: 'sports',
    name: 'Sports',
    position: 3,
    accent: 'orange',
    description:
      'Results, fixtures, transfers and the stories behind them, across the leagues and tournaments people actually follow.',
  },
  {
    slug: 'money',
    name: 'Money',
    position: 4,
    accent: 'emerald',
    description:
      'Business, markets and personal finance explained without jargon — what moved, why it matters, and what it means for your own budget.',
  },
  {
    slug: 'health',
    name: 'Health',
    position: 5,
    accent: 'rose',
    description:
      'Fitness, nutrition, sleep and wellbeing, reported from published research rather than from whatever is trending on social media.',
  },
  {
    slug: 'gaming',
    name: 'Gaming',
    position: 6,
    accent: 'cyan',
    description:
      'Console and PC games, hardware and patch notes — release dates, what actually changed in an update, and how it runs.',
  },
  {
    slug: 'travel',
    name: 'Travel',
    position: 7,
    accent: 'sky',
    description:
      'Destinations, flights, visas and costs. Practical planning detail, including the parts that are inconvenient to mention.',
  },
  {
    slug: 'education',
    name: 'Education',
    position: 8,
    accent: 'amber',
    description:
      'Exams, admissions, courses and careers — deadlines, what changed in the process, and how to prepare for it.',
  },
];

/**
 * Sub-sections. One level deep only; `parentSlug` must name a top-level
 * category above. Posts here live at /{parent}/{slug}/{post}.
 */
const SUBCATEGORIES = [
  {
    slug: 'windows',
    name: 'Windows',
    parentSlug: 'tech',
    position: 1,
    accent: 'violet',
    description:
      'Windows updates, error codes and post-update breakage: what shipped in a build, what it broke, and the fix — ordered from least destructive to most.',
  },
];

/** Categories retired in the move to broad verticals. Their posts move to `windows`. */
const LEGACY_CATEGORY_SLUGS = [
  'windows-updates',
  'update-problems',
  'error-codes',
  'app-not-working',
  'how-to',
];

const AUTHORS = [
  {
    slug: 'maya-orsini',
    name: 'Maya Orsini',
    avatar: null,
    bio:
      'Maya has spent nine years doing desktop support for mid-size businesses, most of it cleaning up after patch Tuesday. She writes the platform and release coverage here and keeps a rack of test machines on old and current builds so she can check a claim before it goes out.',
    categoryFocus: ['tech', 'windows'],
    stylePrompt:
      'Write like a support engineer briefing a colleague at the start of a shift. Lead with what changed and who is affected. Short declarative sentences. Name the exact setting path or command rather than describing it. Never speculate about causes the vendor has not confirmed — if the cause is unknown, say so plainly.',
  },
  {
    slug: 'devan-brooks',
    name: 'Devan Brooks',
    avatar: null,
    bio:
      'Devan builds and repairs PCs and has been troubleshooting install and driver failures since the Windows 7 days. He handles the error-code guides and the hardware side of gaming, and he is stubborn about ordering fixes from least destructive to most.',
    categoryFocus: ['windows', 'gaming'],
    stylePrompt:
      'Write like a repair-bench technician. Always order methods from least destructive to most destructive, and say what each one risks before the reader runs it. Give exact commands in code blocks with the elevation requirement stated. Warn clearly before anything that touches the registry, resets components, or deletes files.',
  },
  {
    slug: 'priya-raghunathan',
    name: 'Priya Raghunathan',
    avatar: null,
    bio:
      'Priya writes documentation for a living and tests every walkthrough on a clean install before publishing it. She covers step-by-step guides and study and admissions explainers, and she is the reason every guide here says what it was tested on.',
    categoryFocus: ['windows', 'education'],
    stylePrompt:
      'Write like a technical writer producing product documentation. Number every step and keep one action per step. Describe exactly what the reader should see on screen after each step so they can tell whether it worked. Prefer the GUI or official path first and give the alternative second.',
  },
  {
    slug: 'nadia-fenn',
    name: 'Nadia Fenn',
    avatar: null,
    bio:
      'Nadia has written about film and television for independent outlets for six years and watches far more of it than is reasonable. She covers releases and streaming here, and travels on a budget in the gaps between deadlines.',
    categoryFocus: ['entertainment', 'travel'],
    stylePrompt:
      'Write with a clear point of view but keep opinion separate from fact — say plainly which is which. Give release dates, platforms and running times up front. Never spoil a plot point without warning the reader first. Avoid hype language and studio marketing phrasing.',
  },
  {
    slug: 'theo-abara',
    name: 'Theo Abara',
    avatar: null,
    bio:
      'Theo covered lower-league football for a regional paper before moving online, and still prefers a match report to a hot take. He handles results, fixtures and transfer coverage.',
    categoryFocus: ['sports'],
    stylePrompt:
      'Lead with the result or the concrete news, then the context. Attribute every transfer or injury claim to a named source and say when it is unconfirmed reporting rather than fact. Use exact dates and kick-off times with the timezone stated. No breathless speculation.',
  },
  {
    slug: 'rosa-linden',
    name: 'Rosa Linden',
    avatar: null,
    bio:
      'Rosa spent seven years in bookkeeping for small businesses before writing full time. She explains market and budget news here in the terms an ordinary household actually deals with.',
    categoryFocus: ['money'],
    stylePrompt:
      'Explain money without jargon, defining any term the first time it appears. Always state what a figure means in practical terms for a normal budget. Never give individual investment advice or recommend a specific security — describe what happened and what it generally means, and say when something depends on personal circumstances.',
  },
  {
    slug: 'sam-okonkwo',
    name: 'Sam Okonkwo',
    avatar: null,
    bio:
      'Sam is a former gym instructor who now reads studies for a living and reports what they actually found. He covers fitness, nutrition and sleep, and is quick to say when the evidence is thin.',
    categoryFocus: ['health'],
    stylePrompt:
      'Report from published research and name the study or body you are citing. Distinguish clearly between strong evidence, weak evidence and marketing claims. Never present health information as medical advice — state plainly that readers should speak to a clinician about their own situation. Avoid before-and-after framing and miracle language.',
  },
  {
    slug: 'iris-vale',
    name: 'Iris Vale',
    avatar: null,
    bio:
      'Iris has been playing and writing about games since the PS2 and reads patch notes for fun. She covers releases, updates and the hardware they run on, plus the consumer-tech side of things.',
    categoryFocus: ['gaming', 'tech'],
    stylePrompt:
      'Be specific about platforms, versions and file sizes. When covering a patch, say exactly what changed and what it broke, quoting the official notes where they exist. Give performance claims with the hardware they were measured on. No review scores without stating what was tested.',
  },
];

const KEYWORDS = [
  { phrase: 'best budget phones this year', categorySlug: 'tech' },
  { phrase: 'streaming releases this week', categorySlug: 'entertainment' },
  { phrase: 'transfer window latest', categorySlug: 'sports' },
  { phrase: 'interest rates explained', categorySlug: 'money' },
  { phrase: 'how much sleep do adults need', categorySlug: 'health' },
  { phrase: 'new game releases this month', categorySlug: 'gaming' },
  { phrase: 'cheapest time to book flights', categorySlug: 'travel' },
  { phrase: 'exam results appeal process', categorySlug: 'education' },
];

// Ad slot HTML is stored, not executed — it is rendered into a sandboxed
// placement container. Empty by default so nothing ships with placeholder markup.
const SETTINGS: Record<string, string> = {
  POSTS_PER_DAY: '2',
  AUTO_PUBLISH: 'false',
  QUALITY_THRESHOLD: '85',
  SITE_TAGLINE: 'Trending stories, explained properly.',
  AD_SLOT_HEADER: '',
  AD_SLOT_IN_ARTICLE: '',
  AD_SLOT_SIDEBAR: '',
  AD_SLOT_FOOTER: '',
  GA4_ID: '',
  GSC_VERIFICATION: '',
  INDEXNOW_KEY: '',
};

/**
 * Moves posts and keywords off the retired Windows categories into the
 * /tech/windows sub-section, then deletes the empty categories. No-op after
 * the first run, and skipped entirely on a fresh database.
 */
async function relocateLegacyPosts(windowsId: string) {
  const legacy = await prisma.category.findMany({
    where: { slug: { in: LEGACY_CATEGORY_SLUGS } },
    select: { id: true, slug: true, _count: { select: { posts: true } } },
  });
  if (legacy.length === 0) return;

  const ids = legacy.map((c) => c.id);

  const posts = await prisma.post.updateMany({
    where: { categoryId: { in: ids } },
    data: { categoryId: windowsId },
  });
  const keywords = await prisma.keyword.updateMany({
    where: { categoryId: { in: ids } },
    data: { categoryId: windowsId },
  });
  await prisma.category.deleteMany({ where: { id: { in: ids } } });

  console.log(
    `  migration: ${posts.count} post(s) and ${keywords.count} keyword(s) moved to /tech/windows; ` +
      `${legacy.length} retired categor${legacy.length === 1 ? 'y' : 'ies'} removed`,
  );
}

async function main() {
  console.log('Seeding…');

  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, position: c.position, accent: c.accent },
      create: c,
    });
  }
  console.log(`  categories: ${CATEGORIES.length}`);

  for (const s of SUBCATEGORIES) {
    const parent = await prisma.category.findUniqueOrThrow({ where: { slug: s.parentSlug } });
    await prisma.category.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        description: s.description,
        position: s.position,
        accent: s.accent,
        parentId: parent.id,
      },
      create: {
        slug: s.slug,
        name: s.name,
        description: s.description,
        position: s.position,
        accent: s.accent,
        parentId: parent.id,
      },
    });
  }
  console.log(`  sub-sections: ${SUBCATEGORIES.length}`);

  const windows = await prisma.category.findUniqueOrThrow({ where: { slug: 'windows' } });
  await relocateLegacyPosts(windows.id);

  for (const a of AUTHORS) {
    await prisma.author.upsert({
      where: { slug: a.slug },
      update: {
        name: a.name,
        bio: a.bio,
        categoryFocus: JSON.stringify(a.categoryFocus),
        stylePrompt: a.stylePrompt,
      },
      create: {
        slug: a.slug,
        name: a.name,
        avatar: a.avatar,
        bio: a.bio,
        categoryFocus: JSON.stringify(a.categoryFocus),
        stylePrompt: a.stylePrompt,
      },
    });
  }
  console.log(`  authors: ${AUTHORS.length}`);

  for (const k of KEYWORDS) {
    const category = await prisma.category.findUnique({ where: { slug: k.categorySlug } });
    await prisma.keyword.upsert({
      where: { phrase: k.phrase },
      update: {},
      create: {
        phrase: k.phrase,
        categoryId: category?.id ?? null,
        source: 'MANUAL',
        status: 'QUEUED',
      },
    });
  }
  console.log(`  keywords: ${KEYWORDS.length}`);

  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // Settings are otherwise left alone on re-seed so editor changes survive. The
  // tagline is the exception: if it is still the retired Windows-only default,
  // it describes a product that no longer exists, so replace it.
  const RETIRED_TAGLINE = 'Windows updates, decoded. Fixes that actually work.';
  const { count } = await prisma.setting.updateMany({
    where: { key: 'SITE_TAGLINE', value: RETIRED_TAGLINE },
    data: { value: SETTINGS.SITE_TAGLINE },
  });
  console.log(`  settings: ${Object.keys(SETTINGS).length}${count ? ' (tagline updated)' : ''}`);

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
