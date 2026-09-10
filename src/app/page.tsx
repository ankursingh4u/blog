import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

import { Container, SectionHeading, buttonClass } from '@/components/ui/primitives';
import { InfinitePosts } from '@/components/infinite-posts';
import { AdSlot } from '@/components/ad-slot';
import { BriefingHeader } from '@/components/home/briefing-header';
import { TopStories } from '@/components/home/top-stories';
import { PicksRail } from '@/components/home/picks-rail';
import { SectionCluster } from '@/components/home/section-cluster';
import { CategoryGrid, type CategoryTile } from '@/components/home/category-grid';
import { ErrorCodeCloud, type CodeChip } from '@/components/home/error-code-cloud';
import { ProcessSection } from '@/components/home/process-section';

import { prisma } from '@/lib/db';
import { countPublishedPosts, getCategories, getPublishedPosts } from '@/lib/posts';
import { categoryRefSelect, postPath } from '@/lib/urls';
import { getSettings } from '@/lib/settings';
import { buildMetadata } from '@/lib/seo';
import { SITE } from '@/lib/site';

// The homepage changes whenever a post is published; revalidate hourly and let
// the publish action revalidate the path on demand.
export const revalidate = 3600;

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata({
    // The full description here made a 122-character title. Google shows roughly
    // the first 60, so the tail was cut off in results and the brand was the only
    // part reliably visible. The description already carries the vertical list.
    title: `${SITE.name} — trending stories, explained properly`,
    description: settings.SITE_TAGLINE || SITE.description,
    path: '/',
  });
}

export default async function HomePage() {
  const [latest, categories, totalPosts, moreStories] = await Promise.all([
    getPublishedPosts({ take: 14 }),
    getCategories(),
    countPublishedPosts(),
    // The first page of the "keep reading" list, starting after the briefing.
    getPublishedPosts({ take: 12, skip: 14 }),
  ]);

  const counts = await prisma.post.groupBy({
    by: ['categoryId'],
    where: { status: 'PUBLISHED' },
    _count: { _all: true },
  });
  const countByCategory = new Map(counts.map((c) => [c.categoryId, c._count._all]));

  // Each section shows its own three most recent pieces, fetched per category so
  // a busy section cannot crowd a quiet one off the page.
  const sections = await Promise.all(
    categories.map(async (category) => ({
      name: category.name,
      href: `/${category.slug}`,
      posts: await getPublishedPosts({ categorySlug: category.slug, take: 3 }),
    })),
  );

  const [lead, ...following] = latest;
  const topRest = following.slice(0, 4);
  const picks = following.slice(4, 10);

  /**
   * Newest cover photograph per section, for the browse tiles.
   *
   * Only photographs qualify — a non-empty `imageCredit` is what distinguishes
   * one from a generated OG card, and a card would put a full article headline
   * underneath the tile's own section label.
   *
   * A section's own posts sit in that category or in one of its children, which
   * is how /tech picks up the /tech/windows back-catalogue.
   */
  const tileImages = new Map<string, string>();
  for (const category of categories) {
    const newest = await prisma.post.findFirst({
      where: {
        status: 'PUBLISHED',
        imageCredit: { not: '' },
        featuredImage: { not: null },
        OR: [{ categoryId: category.id }, { category: { parentId: category.id } }],
      },
      orderBy: { publishedAt: 'desc' },
      select: { featuredImage: true },
    });
    if (newest?.featuredImage) tileImages.set(category.slug, newest.featuredImage);
  }

  const tiles: CategoryTile[] = categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    description: category.description,
    count: countByCategory.get(category.id) ?? 0,
    image: tileImages.get(category.slug) ?? null,
  }));

  // Chips come from real published guides; if there are none the section is
  // skipped rather than shown with invented codes.
  const errorGuides = await prisma.post.findMany({
    where: { status: 'PUBLISHED', category: { slug: 'windows' } },
    orderBy: { publishedAt: 'desc' },
    take: 20,
    select: { title: true, slug: true, category: { select: categoryRefSelect } },
  });
  const chips: CodeChip[] = errorGuides
    .map((post) => {
      const code = /0x[0-9a-f]{4,8}/i.exec(post.title)?.[0];
      return code ? { label: code.toLowerCase(), href: postPath(post) } : null;
    })
    .filter((c): c is CodeChip => c !== null)
    .slice(0, 8);

  if (!lead) {
    return (
      <Container className="py-20">
        <div className="surface p-10 text-center">
          <h1 className="text-xl font-semibold">No posts published yet</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Run <code className="rounded bg-muted px-1.5 py-0.5 font-mono">npm run generate</code> to
            produce drafts from the keyword queue, then publish them from the admin.
          </p>
          <Link href="/admin" className={buttonClass('primary', 'md', 'mt-6')}>
            Open admin
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="max-w-[80rem] py-8 lg:py-10">
      <BriefingHeader
        totalPosts={totalPosts}
        sections={categories.length}
        date={DATE_FMT.format(new Date())}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <TopStories lead={lead} rest={topRest} />
          <AdSlot placement="AD_SLOT_HEADER" size="leaderboard" />
        </div>

        <div className="space-y-6">
          <PicksRail posts={picks} description="Recent across every section." />
          <AdSlot placement="AD_SLOT_SIDEBAR" size="rectangle" />
        </div>
      </div>

      {/* Per-section clusters, the way an aggregator lays out its front page. */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <SectionCluster
            key={section.href}
            name={section.name}
            href={section.href}
            posts={section.posts}
          />
        ))}
      </div>

      {chips.length >= 3 ? (
        <section className="mt-14">
          <SectionHeading
            eyebrow="Error codes"
            title="Straight to the hex"
            description="The codes people land here for most. Grab one."
            action={
              <Link href="/tech/windows" className={buttonClass('outline', 'sm')}>
                All Windows fixes
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          />
          <div className="mt-8">
            <ErrorCodeCloud chips={chips} />
          </div>
        </section>
      ) : null}

      {/* Everything the briefing above did not already show, appended as the
          reader scrolls. `latest` is the first 14; this starts after them so a
          story is never on the page twice. */}
      {totalPosts > latest.length ? (
        <section className="mt-16">
          <SectionHeading
            eyebrow="More"
            title="Keep reading"
            description="Everything else, newest first."
          />
          <div className="mt-8">
            <InfinitePosts
              initial={moreStories}
              hasMoreInitially={totalPosts > latest.length + moreStories.length}
              pageSize={12}
              skipOffset={latest.length}
            />
          </div>
        </section>
      ) : null}

      <section className="mt-16">
        <SectionHeading
          eyebrow="Browse"
          title="Pick a section"
          description="Eight sections, from what just launched to what it costs you."
        />
        <div className="mt-8">
          <CategoryGrid tiles={tiles} />
        </div>
      </section>

      <section className="mt-16 border-t border-border pt-12">
        <SectionHeading
          eyebrow="Editorial"
          title="How a story gets published"
          description="Four steps between a source and a page you can trust."
          action={
            <Link href="/editorial-policy" className={buttonClass('outline', 'sm')}>
              Full policy
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        />
        <div className="mt-8">
          <ProcessSection />
        </div>
      </section>
    </Container>
  );
}
