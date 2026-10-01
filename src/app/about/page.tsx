import Link from 'next/link';
import type { Metadata } from 'next';

import { Container, JsonLd, SectionHeading, buttonClass } from '@/components/ui/primitives';
import { ScrollExpandMedia } from '@/components/ui/scroll-expansion-hero';
import { getHouseBylines } from '@/lib/posts';
import { HOUSE_BYLINES } from '@/lib/bylines';
import { StringArray, parseJson } from '@/lib/json';
import { breadcrumbLd, buildMetadata, jsonLdGraph, personLd } from '@/lib/seo';
import { SITE } from '@/lib/site';

/**
 * An hour, not a day.
 *
 * The masthead is built from the database, and the page was last rendered in
 * the gap between a deploy and the task that created seven of the eight
 * authors, so the live site showed one person and a stale bio for a full day
 * while the data behind it was correct the whole time. An hour keeps this
 * effectively static while making an editorial change to a bio visible in a
 * reasonable time rather than tomorrow.
 */
export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: `About ${SITE.name}`,
  description:
    'What this site covers, where its facts come from, and what has to happen before any page goes live.',
  path: '/about',
});

// Stock photography stands in for the newsroom shots. Replace both with your
// own assets before launch, see README, "Placeholder assets".
const HERO_MEDIA =
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600&auto=format&fit=crop';
const HERO_BG =
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop';

export default async function AboutPage() {
  const authors = await getHouseBylines();

  const structuredData = jsonLdGraph(
    ...authors.map((a) => personLd(a)),
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'About', path: '/about' },
    ]),
  );

  return (
    <>
      <JsonLd data={structuredData} />

      <ScrollExpandMedia
        mediaType="image"
        mediaSrc={HERO_MEDIA}
        bgImageSrc={HERO_BG}
        title="Trending, explained"
        date="Eight sections, one standard"
        scrollToExpand="Scroll"
        textBlend
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight">Why this site exists</h2>
          <p className="mt-6 text-lg text-muted-foreground">
            A story breaks, and the first ten search results are the same wire copy reworded ten
            times, padded out to hit a word count. That is the gap this site covers: a page that
            says what actually happened, what is confirmed and what is not, and why it matters to
            you, in that order, across tech, entertainment, sport, money, health, gaming, travel
            and education.
          </p>
          <p className="mt-5 text-lg text-muted-foreground">
            Every article leads with a quick answer you can read in under a minute. The detail sits
            below it for anyone who wants it. Where a source did not say something, the page says
            so rather than filling the gap, you will see plain sentences like &ldquo;the report did
            not give a time&rdquo; instead of a confident guess.
          </p>
        </div>
      </ScrollExpandMedia>

      <Container className="py-16">
        <SectionHeading
          eyebrow="The rules"
          title="What we will and will not do"
          description="Short list, strictly kept."
        />

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Rule title="No source, no article">
            Before anything is written, we look for published reporting that is actually about the
            story. If we cannot find it, the topic is dropped and no page is produced. That is not a
            rare event, most trending topics we look at never become an article, because a
            plausible page with nothing behind it is worse than no page.
          </Rule>
          <Rule title="Figures are never invented">
            Prices, dates, scores, quotes and study results have to appear in a source. A draft that
            states one that does not is blocked from publishing, whatever else it scored. The same
            check covers version and reference numbers on our Windows pages.
          </Rule>
          <Rule title="Sources are listed, not implied">
            Everything an article is drawn from is linked at the bottom of it, so you can go and
            read the original rather than taking our word for the summary.
          </Rule>
          <Rule title="No affiliate links, nothing to buy">
            The site is funded by display slots we sell and serve ourselves. There are no affiliate
            links, no buy buttons and no sponsored placements inside articles.
          </Rule>
        </div>
      </Container>

      <section className="border-t border-border bg-muted/20 py-16">
        <Container>
          <SectionHeading
            eyebrow="Bylines"
            title="Who writes here"
            description="The people behind the site. Every article is drafted with AI assistance and approved by a person before it publishes, the editorial policy sets out exactly which parts are which."
          />

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {authors.map((author) => {
              // Roles and interests come from the masthead list rather than the
              // database: they are who the person is, not what the pipeline
              // routes to them, and the category slugs shown here before were
              // pipeline plumbing leaking onto a page about people.
              const profile = HOUSE_BYLINES.find((p) => p.slug === author.slug);
              const focus = profile?.roles ?? parseJson(author.categoryFocus, StringArray, []);
              return (
                <article key={author.id} className="surface p-6">
                  <span
                    aria-hidden="true"
                    className="grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-lg font-semibold text-brand"
                  >
                    {author.name.charAt(0)}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">
                    <Link href={`/author/${author.slug}`} className="hover:text-brand">
                      {author.name}
                    </Link>
                  </h3>
                  <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    {focus.join(' · ')}
                  </p>
                  {/* Masthead list first, database row second. See the note on
                      the author page: the row is a copy, and a page built
                      before the seed ran showed the previous wording. */}
                  <p className="mt-3 text-sm text-muted-foreground">
                    {profile?.bio ?? author.bio}
                  </p>
                  {/*
                    Interests and the article count share one muted line. As
                    three stacked blocks they made each card taller than the
                    thing it was describing.
                  */}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {[
                      profile?.interests.join(', '),
                      author._count.posts > 0
                        ? `${author._count.posts} article${author._count.posts === 1 ? '' : 's'}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-12">
            <Link href="/editorial-policy" className={buttonClass('primary', 'lg')}>
              Read the full editorial policy
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
