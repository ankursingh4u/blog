import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { Container, SectionHeading } from '@/components/ui/primitives';
import { RelativeTime } from '@/components/ui/relative-time';
import { prisma } from '@/lib/db';
import { categoryPath } from '@/lib/urls';

/**
 * The briefing: today's headlines from across the web, linked out.
 *
 * This is a reading surface, not a publishing one. It lists what the morning
 * ingest found — headline, publisher and a link to the original — and writes
 * nothing of its own.
 *
 * **It is deliberately noindex.** A page of other people's headlines is what
 * Google's guidelines call scraped content, and this site's whole purpose is
 * ranking its own articles in Search and Discover. Letting a thin link list
 * compete with them risks the domain rather than the page. Blocked in the
 * metadata below and again in robots.txt, so it never becomes an SEO liability
 * while still giving a returning reader something that changes every day at no
 * cost.
 *
 * Every link is `nofollow noopener` and opens in a new tab: readers should come
 * back here, and none of this link equity is ours to pass on.
 */

export const metadata: Metadata = {
  title: 'Briefing',
  description: 'Today’s headlines from across the web, with links to the original reporting.',
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: undefined },
};

// The ingest runs once a morning; an hour is plenty and keeps the page cheap.
export const revalidate = 3600;

/** How many links to show per section before it stops being skimmable. */
const PER_SECTION = 8;
/** Only the last few days — older headlines are no longer a briefing. */
const WINDOW_DAYS = 3;

/**
 * Who to credit for a headline.
 *
 * `publisher` is taken off the Google News headline at ingest and is the only
 * reliable source, but rows collected before that field existed do not have it.
 * For those, the link's own host works — except for `news.google.com`, which is
 * a redirect rather than a publisher and would credit the wrong party entirely.
 * Better to show nothing than to attribute someone else's reporting to Google.
 */
function attribution(publisher: string | null, sourceUrl: string | null): string | null {
  if (publisher) return publisher;
  if (!sourceUrl) return null;
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, '');
    return host === 'news.google.com' ? null : host;
  } catch {
    return null;
  }
}

export default async function BriefingPage() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [categories, keywords] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.keyword.findMany({
      where: {
        status: 'QUEUED',
        createdAt: { gte: since },
        // A headline with nowhere to send the reader is not a link.
        sourceUrl: { not: null },
        categoryId: { not: null },
        NOT: [
          { sourceUrl: { startsWith: 'discovery:' } },
          /**
           * Google News links are excluded outright.
           *
           * They are not publisher URLs — the article id is an opaque token that
           * Google resolves on its own servers, so the link goes to google.com
           * and the reader has to be bounced onward. On a page that exists to
           * send people to the publications doing the reporting, a redirect
           * through Google credits the wrong party and is a worse experience
           * than simply not listing the story. Publisher RSS supplies real
           * article URLs, and those are what this page shows.
           */
          { sourceUrl: { contains: 'news.google.com' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phrase: true,
        sourceUrl: true,
        publisher: true,
        createdAt: true,
        categoryId: true,
      },
      // Bounded: the queue holds thousands and this page shows a few dozen.
      take: 600,
    }),
  ]);

  const byCategory = new Map<string, typeof keywords>();
  for (const keyword of keywords) {
    if (!keyword.categoryId) continue;
    const bucket = byCategory.get(keyword.categoryId) ?? [];
    if (bucket.length >= PER_SECTION) continue;
    bucket.push(keyword);
    byCategory.set(keyword.categoryId, bucket);
  }

  const sections = categories
    .map((category) => ({ category, items: byCategory.get(category.id) ?? [] }))
    .filter((section) => section.items.length > 0);

  const total = sections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <Container className="py-10 sm:py-14">
      <SectionHeading
        eyebrow="Briefing"
        title="What the web is reporting today"
        description={
          total > 0
            ? `${total} stories our morning scan picked up across ${sections.length} sections. These are links to other people’s reporting — our own writing is in the sections above.`
            : 'Nothing has come in yet today. The scan runs each morning.'
        }
      />

      {sections.length === 0 ? (
        <p className="surface mt-8 p-8 text-center text-sm text-muted-foreground">
          No headlines in the last {WINDOW_DAYS} days.
        </p>
      ) : (
        <div className="mt-8 grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(({ category, items }) => (
            <section key={category.id} className="surface p-5 sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight">
                <Link href={categoryPath(category)} className="hover:text-brand">
                  {category.name}
                </Link>
              </h2>

              <ul className="mt-4 divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <a
                      href={item.sourceUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="group block"
                    >
                      <p className="text-pretty text-[15px] font-medium leading-snug transition-colors group-hover:text-brand">
                        {item.phrase}
                        <ArrowUpRight
                          className="ml-1 inline h-3.5 w-3.5 align-text-top opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        {(() => {
                          const source = attribution(item.publisher, item.sourceUrl);
                          return source ? (
                            <span className="font-medium text-foreground/70">{source}</span>
                          ) : null;
                        })()}
                        <RelativeTime value={item.createdAt} />
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-10 text-xs text-muted-foreground">
        Headlines and links belong to the publishers who wrote them; each links straight to the
        original. Nothing on this page is ours and nothing here is indexed.
      </p>
    </Container>
  );
}
