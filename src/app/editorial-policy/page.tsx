import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, JsonLd } from '@/components/ui/primitives';
import { breadcrumbLd, buildMetadata, jsonLdGraph } from '@/lib/seo';
import { SITE } from '@/lib/site';

export const revalidate = 86400;

export const metadata: Metadata = buildMetadata({
  title: 'Editorial policy',
  description:
    'How articles are researched, drafted, checked and corrected — including exactly where AI is used and where a human has to sign off.',
  path: '/editorial-policy',
});

export default function EditorialPolicyPage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph(
          breadcrumbLd([
            { name: 'Home', path: '/' },
            { name: 'Editorial policy', path: '/editorial-policy' },
          ]),
        )}
      />

      <Container className="py-14">
        <div className="mx-auto max-w-prose">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-brand">Editorial</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Editorial policy</h1>
          <p className="mt-5 text-lg text-muted-foreground">
            This page describes how an article on {SITE.name} gets made, where AI is involved, and
            what a human has to do before anything goes live. It is deliberately specific, because
            &ldquo;human-reviewed&rdquo; means nothing without the detail.
          </p>

          <div className="prose prose-lg mt-12 max-w-none dark:prose-invert">
            <h2>Where the topics come from</h2>
            <p>
              The site reads Google News every day — the section feeds for technology,
              entertainment, sport, business and health, searches for the areas Google has no
              section for, and the top-stories feed — across the Indian and US editions. Daily
              Google Trends and search autocomplete are read alongside them. Topics are never
              chosen by guessing what might rank.
            </p>
            <p>
              The Windows section at <Link href="/tech/windows">/tech/windows</Link> additionally
              polls Microsoft&rsquo;s release-health feed and its Windows blogs, and extracts
              reference numbers, build numbers and error codes from them.
            </p>

            <h2>Where the facts come from</h2>
            <p>
              A Google News link is a pointer, not a source — it resolves to Google, not to the
              publisher. So before anything is written we go and find reporting we can actually
              read: the RSS feeds of established outlets, which publish their own article URLs, plus
              the official bodies for a given beat. Windows pages use Microsoft&rsquo;s own
              documentation.
            </p>
            <p>
              A candidate source only counts if it is demonstrably about the same story, measured by
              how much of the topic it shares rather than by which section it came from.{' '}
              <strong>
                If nothing clears that bar, the topic is dropped and no article is written.
              </strong>{' '}
              Most trending topics we look at never become a page. We would rather publish less than
              hand a writer — human or otherwise — an unrelated article and let it fill the gaps.
            </p>

            <h2>How a draft is written</h2>
            <p>
              The fetched source text is stored with the post, and a draft is produced by a large
              language model that is given those sources and instructed that it may state only what
              is present in them. Where a source is silent, the draft is required to say so rather
              than infer.
            </p>
            <p>
              We are direct about this:{' '}
              <strong>the first draft of every article is AI-generated.</strong> That draft is not
              what you read. It is an input to the checks below.
            </p>

            <h2>The checks</h2>
            <p>Four run on every draft, before a person sees it.</p>
            <ul>
              <li>
                <strong>Shape</strong> — a mechanical check, not a judgement call: a real
                introduction, section headings, at least one list, a conclusion that tells you what
                to do next, paragraphs that stay short, and a length floor. Failing any of these
                stops the draft.
              </li>
              <li>
                <strong>Accuracy against sources</strong> — a second model, given the sources but
                not the first model&rsquo;s reasoning, scores every claim for whether the fetched
                material actually supports it, and quotes back anything it could not trace.
              </li>
              <li>
                <strong>Invented specifics</strong> — ordinary code, not a model, checks every
                figure and identifier in the draft against the source text. This one cannot be
                talked around, and a draft it flags is blocked from publishing regardless of its
                score. There is no threshold that overrides it.
              </li>
              <li>
                <strong>Prose tells</strong> — the vocabulary and tics that mark unedited machine
                writing are counted and reported to the editor. Advisory rather than blocking, since
                the words involved are legitimate in the right place.
              </li>
            </ul>

            <h2>Human sign-off</h2>
            <p>
              Nothing publishes on its own. Every draft stops in a review queue, and a person has to
              open it and press publish; a page cannot go live at all without a description and a
              real body behind it. The checks above decide what reaches that queue and what an
              editor is warned about — they never decide to publish.
            </p>
            <p>
              On the Windows troubleshooting pages there is one extra step: someone runs the steps
              on a machine on the affected build and records which build that was, and the page
              carries it. Until that has happened the page is labelled{' '}
              <strong>&ldquo;verification pending&rdquo;</strong> — the label is never omitted to
              make a page look more authoritative than it is.
            </p>

            <h2>Corrections</h2>
            <p>
              When an article turns out to be wrong, the page is updated in place and its
              last-updated date changes. Substantive corrections are noted in the article rather
              than quietly edited away. If you have found an error, the{' '}
              <Link href="/contact">contact page</Link> is the fastest route.
            </p>

            <h2>Funding and independence</h2>
            <p>
              The site is funded by display advertising sold and served by us. There are no
              affiliate links, no buy buttons, no sponsored placements inside articles and no paid
              inclusion. No advertiser sees an article before it publishes, and nothing is covered
              because someone paid for it to be.
            </p>

            <h2>Affiliation</h2>
            <p>
              {SITE.name} is independent and is not affiliated with, endorsed by or sponsored by any
              company, organisation or governing body it writes about. Product and company names are
              the trademarks of their respective owners.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
