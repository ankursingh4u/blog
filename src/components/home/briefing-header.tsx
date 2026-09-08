import Link from 'next/link';
import { Bookmark, Newspaper } from 'lucide-react';

/**
 * The dated masthead an aggregator opens with. A news reader wants to know how
 * current the page is before anything else, so the date is the first thing on
 * it.
 *
 * The panel on the right occupies the slot Google News gives to local weather.
 * Weather needs a third-party API and the reader's location, neither of which
 * this site has any business collecting, so it shows what a publisher actually
 * knows: how much is here, and what the reader has saved.
 */
export function BriefingHeader({
  totalPosts,
  sections,
  date,
}: {
  totalPosts: number;
  sections: number;
  /** Passed in from the server so the rendered date matches the cached page. */
  date: string;
}) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your briefing</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{date}</p>
      </div>

      <div className="surface flex items-center gap-5 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand/10 text-brand">
            <Newspaper className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-sm">
            <strong className="block font-semibold leading-none">{totalPosts}</strong>
            <span className="text-xs text-muted-foreground">
              {totalPosts === 1 ? 'article' : 'articles'} in {sections} sections
            </span>
          </span>
        </div>

        <span className="h-8 w-px bg-border" aria-hidden="true" />

        <Link
          href="/saved"
          className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-brand"
        >
          <Bookmark className="h-4 w-4" aria-hidden="true" />
          Saved
        </Link>
      </div>
    </div>
  );
}
