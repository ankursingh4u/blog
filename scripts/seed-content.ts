/**
 * `npm run db:content` — populates a local install with the sample articles in
 * scripts/content/articles.ts (the Windows back-catalogue) and
 * scripts/content/verticals.ts (the eight broad verticals), each with a
 * locally-stored featured image.
 *
 * These are development fixtures, not pipeline output. See the header comments
 * in those files for what that means. Source URLs are verified by
 * `npx tsx scripts/check-sources.ts`.
 *
 * Images: each post gets a photograph downloaded from Unsplash and written into
 * public/uploads/covers/ via the storage abstraction, so the running site has no
 * external image dependency. If a download fails — offline, rate-limited — the
 * script falls back to rendering the branded 1200x630 card from /api/og, and if
 * that is unreachable too the post is still created without an image.
 *
 * Re-running is safe: posts are upserted by slug and images are content-addressed,
 * so nothing duplicates.
 *
 * Flags:
 *   --no-images   Skip image work entirely (fast, offline).
 *   --force       Overwrite the body/meta of posts that already exist.
 */
import { config } from 'dotenv';
import { prisma } from '../src/lib/db';
import { storage } from '../src/lib/storage';
import { toJson } from '../src/lib/json';
import { ARTICLES as WINDOWS_ARTICLES, type ArticleFixture } from './content/articles';
import { VERTICAL_ARTICLES } from './content/verticals';

/** Windows back-catalogue plus the broad-vertical fixtures, newest first. */
const ARTICLES: ArticleFixture[] = [...WINDOWS_ARTICLES, ...VERTICAL_ARTICLES].sort(
  (a, b) => a.daysAgo - b.daysAgo,
);

config();

/**
 * Unsplash photo IDs, cycled per category so a travel article does not get a
 * photograph of a motherboard. Cropped to the 1200x630 the article template and
 * OG tags expect.
 *
 * Every ID below was checked to return a real image before being added; an ID
 * that 404s falls through to the branded OG card, which is a silent downgrade
 * rather than a visible failure, so they are verified rather than assumed.
 *
 * `tech` doubles as the fallback for any category without its own pool.
 */
const COVER_IDS_BY_CATEGORY: Record<string, string[]> = {
  entertainment: [
    'photo-1489599849927-2ee91cede3ba', // cinema seats
    'photo-1440404653325-ab127d49abc1', // cinema screen
    'photo-1517604931442-7e0c8ed2963c', // clapperboard
    'photo-1478720568477-152d9b164e26', // film reel
    'photo-1524712245354-2c4e5e7121c0', // stage lighting
    'photo-1598899134739-24c46f58b8c0', // television set
  ],
  sports: [
    'photo-1431324155629-1a6deb1dec8d', // football on grass
    'photo-1461896836934-ffe607ba8211', // stadium crowd
    'photo-1571019613454-1cb2f99b2d8b', // running track
    'photo-1552667466-07770ae110d0', // football pitch from above
    'photo-1517649763962-0c623066013b', // floodlit stadium
  ],
  money: [
    'photo-1554224155-6726b3ff858f', // calculator and papers
    'photo-1526304640581-d334cdbbf45e', // banknotes
    'photo-1611974789855-9c2a0a7236a3', // market chart on screen
    'photo-1579621970563-ebec7560ff3e', // financial charts
    'photo-1553729459-efe14ef6055d', // savings jar
  ],
  health: [
    'photo-1490645935967-10de6ba17061', // healthy food flat lay
    'photo-1512621776951-a57141f2eefd', // vegetables
    'photo-1498837167922-ddd27525d352', // fresh produce
    'photo-1544367567-0f2fcb009e0b', // yoga stretch
    'photo-1518611012118-696072aa579a', // gym weights
  ],
  travel: [
    'photo-1488646953014-85cb44e25828', // globe and map
    'photo-1476514525535-07fb3b4ae5f1', // mountain road
    'photo-1436491865332-7a61a109cc05', // aircraft wing
    'photo-1507525428034-b723cf961d3e', // beach
    'photo-1469854523086-cc02fe5d8800', // coastal viewpoint
    'photo-1503220317375-aaad61436b1b', // backpacker
  ],
  education: [
    'photo-1541339907198-e08756dedf3f', // lecture hall
    'photo-1503676260728-1c00da094a0b', // classroom
    'photo-1481627834876-b7833e8f5570', // library shelves
    'photo-1434030216411-0b793f4b4173', // students studying
    'photo-1509062522246-3755977927d7', // school desks
  ],
  gaming: [
    'photo-1542751371-adc38448a05e', // console controller
    'photo-1552820728-8b83bb6b773f', // arcade lighting
    'photo-1493711662062-fa541adb3fc8', // retro console
    'photo-1550745165-9bc0b252726f', // retro hardware
    'photo-1511512578047-dfb367046420', // gaming controller close-up
    'photo-1587202372775-e229f172b9d7', // gaming setup
  ],
  tech: [
    'photo-1518770660439-4636190af475', // circuit board macro
    'photo-1498050108023-c5249f4df085', // laptop with code
    'photo-1461749280684-dccba630e2f6', // monitor showing code
    'photo-1451187580459-43490279c0fa', // blue network globe
    'photo-1526374965328-7f61d4dc18c5', // green data stream
    'photo-1517694712202-14dd9538aa97', // laptop on a desk
    'photo-1504384308090-c894fdcc538d', // laptop, warm light
    'photo-1550751827-4bd374c3f58b', // laptop in a dark room
    'photo-1517430816045-df4b7de11d1d', // laptop keyboard close-up
    'photo-1531297484001-80022131f5a1', // desk with monitor, soft light
    'photo-1484417894907-623942c8ee29', // code on screen, wide
    'photo-1555949963-aa79dcee981c', // terminal window
    'photo-1516116216624-53e697fedbea', // laptop and notebook
    'photo-1542751371-adc38448a05e', // hardware on a bench
    'photo-1593642632823-8f785ba67e45', // laptop, minimal desk
    'photo-1547082299-de196ea013d6', // workstation setup
    'photo-1573164713988-8665fc963095', // developer at a screen
    'photo-1581091226825-a6a2a5aee158', // two people at a laptop
    'photo-1517245386807-bb43f82c33c4', // desk, keyboard and mouse
    'photo-1524178232363-1fb2b075b655', // study desk with laptop
    'photo-1552664730-d307ca884978', // team around a screen
    'photo-1497366754035-f200968a6e72', // office interior
    'photo-1519389950473-47ba0277781c', // desks with monitors
    'photo-1460925895917-afdab827c52f', // laptop with charts
    'photo-1550745165-9bc0b252726f', // retro hardware
    'photo-1563986768609-322da13575f3', // laptop, dark desk
    'photo-1587831990711-23ca6441447b', // motherboard detail
    'photo-1629654297299-c8506221ca97', // storage drive close-up
  ],
};

/** Windows articles live under tech, so they share its pool. */
function coversFor(categorySlug: string): string[] {
  if (categorySlug === 'windows') return COVER_IDS_BY_CATEGORY.tech;
  return COVER_IDS_BY_CATEGORY[categorySlug] ?? COVER_IDS_BY_CATEGORY.tech;
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const FETCH_TIMEOUT_MS = 20_000;

const skipImages = process.argv.includes('--no-images');
const force = process.argv.includes('--force');

interface Counters {
  created: number;
  updated: number;
  skipped: number;
  photos: number;
  ogCards: number;
  noImage: number;
}

async function main() {
  const counters: Counters = {
    created: 0,
    updated: 0,
    skipped: 0,
    photos: 0,
    ogCards: 0,
    noImage: 0,
  };

  const [categories, authors] = await Promise.all([
    prisma.category.findMany(),
    prisma.author.findMany(),
  ]);

  if (categories.length === 0 || authors.length === 0) {
    throw new Error('No categories or authors found. Run `npm run db:seed` first.');
  }

  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const authorBySlug = new Map(authors.map((a) => [a.slug, a]));

  console.log(`Seeding ${ARTICLES.length} sample articles…\n`);

  // Cover photos come from a per-category pool, so the position used to pick one
  // must count within that category. Using the global index would let two
  // articles in the same category land on the same photo while others go unused.
  const ordinalByCategory = new Map<string, number>();

  for (const article of ARTICLES) {
    const index = ordinalByCategory.get(article.categorySlug) ?? 0;
    ordinalByCategory.set(article.categorySlug, index + 1);

    const category = categoryBySlug.get(article.categorySlug);
    const author = authorBySlug.get(article.authorSlug);
    if (!category || !author) {
      console.warn(`  ! ${article.slug}: unknown category or author; skipping`);
      counters.skipped += 1;
      continue;
    }

    const existing = await prisma.post.findUnique({
      where: { slug: article.slug },
      select: { id: true, featuredImage: true },
    });

    if (existing && !force) {
      // Backfill an image onto an existing post, but leave its content alone.
      if (!existing.featuredImage && !skipImages) {
        const image = await resolveImage(article, index, category.name, counters);
        if (image) {
          await prisma.post.update({ where: { id: existing.id }, data: { featuredImage: image } });
          console.log(`  ~ ${article.slug} — image added`);
          counters.updated += 1;
          continue;
        }
      }
      console.log(`  · ${article.slug} — already exists (use --force to rewrite)`);
      counters.skipped += 1;
      continue;
    }

    const featuredImage = skipImages
      ? (existing?.featuredImage ?? null)
      : await resolveImage(article, index, category.name, counters);

    const publishedAt = daysAgo(article.daysAgo);

    const data = {
      title: article.title,
      categoryId: category.id,
      authorId: author.id,
      status: 'PUBLISHED' as const,
      quickAnswer: article.quickAnswer,
      body: article.body,
      affectedBuilds: toJson(article.affectedBuilds),
      faq: toJson(article.faq),
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      featuredImage,
      screenshots: toJson([]),
      sourceUrls: toJson(article.sources),
      relatedSlugs: toJson([]),
      qualityScore: article.qualityScore,
      qualityNotes:
        article.categorySlug === 'windows'
          ? 'Development fixture — hand-written, not produced by the pipeline. Every identifier used is a real, publicly documented Windows error code, build or KB. Delete before launch.'
          : 'Development fixture — hand-written, not produced by the pipeline. Evergreen explainer with no dated claims; every source URL was checked to resolve. Delete before launch.',
      generatedBy: 'HUMAN' as const,
      testedOnBuild: article.testedOnBuild,
      lastVerifiedAt: article.testedOnBuild ? publishedAt : null,
      publishedAt,
    };

    if (existing) {
      await prisma.post.update({ where: { id: existing.id }, data });
      console.log(`  ~ ${article.slug} — rewritten`);
      counters.updated += 1;
    } else {
      await prisma.post.create({ data: { ...data, slug: article.slug } });
      console.log(`  + ${article.slug}`);
      counters.created += 1;
    }
  }

  await linkRelatedPosts();

  console.log(
    [
      '',
      '─── Summary ───────────────────────────────────',
      `  created        : ${counters.created}`,
      `  updated        : ${counters.updated}`,
      `  skipped        : ${counters.skipped}`,
      `  photos stored  : ${counters.photos}`,
      `  OG cards used  : ${counters.ogCards}`,
      `  without image  : ${counters.noImage}`,
      '───────────────────────────────────────────────',
      '',
      'These are development fixtures. Delete them from /admin/posts before launch.',
      '',
    ].join('\n'),
  );
}

/**
 * Cross-links every post to the newest others in its category, so the related
 * rail on each article has real entries rather than falling back every time.
 */
async function linkRelatedPosts() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, slug: true, categoryId: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
  });

  for (const post of posts) {
    const sameCategory = posts
      .filter((p) => p.categoryId === post.categoryId && p.id !== post.id)
      .slice(0, 3)
      .map((p) => p.slug);

    // Top up across categories so short categories still get a full rail.
    const others = posts
      .filter((p) => p.id !== post.id && !sameCategory.includes(p.slug))
      .slice(0, 4 - sameCategory.length)
      .map((p) => p.slug);

    await prisma.post.update({
      where: { id: post.id },
      data: { relatedSlugs: toJson([...sameCategory, ...others]) },
    });
  }

  console.log(`\n  related posts linked across ${posts.length} published post(s)`);
}

/** Photograph first, branded OG card second, nothing third. */
async function resolveImage(
  article: ArticleFixture,
  index: number,
  categoryName: string,
  counters: Counters,
): Promise<string | null> {
  const photo = await downloadCover(article.slug, index, article.categorySlug);
  if (photo) {
    counters.photos += 1;
    return photo;
  }

  const card = await renderOgCard(article, categoryName);
  if (card) {
    counters.ogCards += 1;
    return card;
  }

  counters.noImage += 1;
  return null;
}

async function downloadCover(
  slug: string,
  index: number,
  categorySlug: string,
): Promise<string | null> {
  const pool = coversFor(categorySlug);
  const id = pool[index % pool.length];
  // Ask Unsplash for exactly the aspect ratio the template reserves, so the
  // stored file needs no cropping and cannot shift layout.
  const url = `https://images.unsplash.com/${id}?w=1200&h=630&fit=crop&crop=entropy&q=75&auto=format&fm=jpg`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'FixDeskBot/0.1 (local development fixture)' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) throw new Error(`unexpected type "${contentType}"`);

    const stored = await storage.put({
      body: Buffer.from(await response.arrayBuffer()),
      filename: `${slug}.jpg`,
      contentType: contentType.split(';')[0].trim(),
      prefix: 'covers',
    });
    return stored.url;
  } catch (error) {
    console.warn(`    photo for ${slug} unavailable (${describe(error)}) — trying OG card`);
    return null;
  }
}

async function renderOgCard(article: ArticleFixture, categoryName: string): Promise<string | null> {
  const params = new URLSearchParams({ title: article.title, category: categoryName });
  if (article.affectedBuilds[0]) params.set('build', article.affectedBuilds[0]);

  try {
    const response = await fetch(`${SITE_URL}/api/og?${params}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const stored = await storage.put({
      body: Buffer.from(await response.arrayBuffer()),
      filename: `${article.slug}.png`,
      contentType: 'image/png',
      prefix: 'og',
    });
    return stored.url;
  } catch (error) {
    console.warn(
      `    OG card for ${article.slug} unavailable (${describe(error)}) — is the dev server running?`,
    );
    return null;
  }
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  // A believable publishing hour rather than whenever the script happened to run.
  date.setHours(9 + (days % 6), (days * 7) % 60, 0, 0);
  return date;
}

function describe(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
