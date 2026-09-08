import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Sticky section navigation down the left of an article.
 *
 * The article page is a wide three-column layout and the left gutter was dead
 * space — the reading column and the "on this page" rail both sat to the right
 * of it. This puts the eight sections there, so a reader who finishes a piece
 * can move sideways into another beat without going back to the nav or the
 * home page.
 *
 * Hidden below `xl`. Narrower than that there is not room for three columns,
 * and the same links are already in the header and the footer, so nothing is
 * lost — this is a convenience for wide screens, not the only route to a
 * section.
 */
export interface RailSection {
  name: string;
  slug: string;
}

export function SectionRail({
  sections,
  activeSlug,
  parentSlug,
}: {
  sections: RailSection[];
  /** The article's own category, so the reader can see where they are. */
  activeSlug: string;
  /** Set when the article sits in a sub-section, so the parent still lights up. */
  parentSlug?: string | null;
}) {
  return (
    <aside className="hidden xl:block">
      <nav aria-label="Sections" className="sticky top-24">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Sections
        </p>
        <ul className="mt-4 space-y-0.5">
          {sections.map((section) => {
            const active = section.slug === activeSlug || section.slug === parentSlug;
            return (
              <li key={section.slug}>
                <Link
                  href={`/${section.slug}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    // The left border is the active marker rather than a
                    // background fill, so it reads as a position in a list
                    // instead of a button.
                    'block border-l-2 py-1.5 pl-3 text-sm transition-colors',
                    active
                      ? 'border-brand font-medium text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                  )}
                >
                  {section.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
