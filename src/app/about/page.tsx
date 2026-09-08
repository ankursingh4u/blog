import Link from 'next/link';
import type { Metadata } from 'next';

import { Container, JsonLd, SectionHeading, buttonClass } from '@/components/ui/primitives';
import { ScrollExpandMedia } from '@/components/ui/scroll-expansion-hero';
import { getAuthors } from '@/lib/posts';
import { StringArray, parseJson } from '@/lib/json';
import { breadcrumbLd, buildMetadata, jsonLdGraph, personLd } from '@/lib/seo';
import { SITE } from '@/lib/site';

export const revalidate = 86400;

export const metadata: Metadata = buildMetadata({
  title: `About ${SITE.name}`,
  description:
    'What this site covers, where its facts come from, and what has to happen before any page goes live.',
  path: '/about',
});

// Stock photography stands in for the newsroom shots. Replace both with your
// own assets before launch — see README, "Placeholder assets".
const HERO_MEDIA =
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600&auto=format&fit=crop';
const HERO_BG =
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop';

export default async function AboutPage() {
  const authors = await getAuthors();

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
            you — in that order, across tech, entertainment, sport, money, health, gaming, travel
            and education.
          </p>
          <p className="mt-5 text-lg text-muted-foreground">
            Every article leads with a quick answer you can read in under a minute. The detail sits
            below it for anyone who wants it. Where a source did not say something, the page says
            so rather than filling the gap — you will see plain sentences like &ldquo;the report did
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
            rare event — most trending topics we look at never become an article, because a
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
            description="Eight bylines, one per beat. Every article is drafted with AI assistance and approved by a person before it publishes — the editorial policy sets out exactly which parts are which."
          />

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {authors.map((author) => {
              const focus = parseJson(author.categoryFocus, StringArray, []);
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
                  <p className="mt-4 text-sm text-muted-foreground">{author.bio}</p>
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
