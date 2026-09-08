'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useSaved } from '@/lib/saved';
import { cn } from '@/lib/utils';

/**
 * Save-for-later toggle, the equivalent of the bookmark control on a news
 * aggregator. Renders in the unsaved state until localStorage has been read, so
 * server and client markup match.
 */
export function SaveButton({
  slug,
  title,
  className,
  size = 'md',
}: {
  slug: string;
  title: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const { isSaved, toggle, ready } = useSaved();
  const saved = ready && isSaved(slug);
  const box = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={(event) => {
        // Cards wrap these in links; without this the click navigates instead.
        event.preventDefault();
        event.stopPropagation();
        toggle(slug);
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove "${title}" from saved` : `Save "${title}" for later`}
      title={saved ? 'Saved — click to remove' : 'Save for later'}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full border transition-colors',
        box,
        saved
          ? 'border-brand/40 bg-brand/10 text-brand'
          : 'border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-brand',
        className,
      )}
    >
      {saved ? (
        <BookmarkCheck className={icon} aria-hidden="true" />
      ) : (
        <Bookmark className={icon} aria-hidden="true" />
      )}
    </button>
  );
}
