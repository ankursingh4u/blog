import { CoverArt } from '@/components/ui/cover-art';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import type { PostCard } from '@/lib/posts';
import { RelativeTime } from '@/components/ui/relative-time';
import { SaveButton } from '@/components/save-button';

/**
 * A per-section block: one lead with an image, then the next few as headlines.
 * Repeating this shape down the page is what makes an aggregator homepage
 * scannable — the reader learns the pattern once and then only reads headlines.
 */
export function SectionCluster({
  name,
  href,
  posts,
}: {
  name: string;
  href: string;
  posts: PostCard[];
}) {
  if (posts.length === 0) return null;

  const [lead, ...rest] = posts;
  const id = `section-${href.replace(/\W+/g, '-')}`;

  return (
    <section aria-labelledby={id} className="surface p-5 sm:p-6">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        <Link href={href} className="group inline-flex items-center gap-1.5 hover:text-brand">
          {name}
          <ChevronRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </h2>

      <article className="mt-4">
        <Link href={lead.href} className="group block">
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-border bg-muted">
            <CoverArt
              seed={lead.category.slug}
              className="transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
          <h3 className="mt-3 text-pretty font-semibold leading-snug transition-colors group-hover:text-brand">
            {lead.title}
          </h3>
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            <RelativeTime value={lead.publishedAt} />
          </p>
          <SaveButton slug={lead.slug} title={lead.title} size="sm" className="ml-auto" />
        </div>
      </article>

      {rest.length > 0 ? (
        <ul className="mt-4 divide-y divide-border border-t border-border">
          {rest.map((post) => (
            <li key={post.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <Link href={post.href} className="group">
                  <h3 className="text-pretty text-sm font-medium leading-snug transition-colors group-hover:text-brand">
                    {post.title}
                  </h3>
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  <RelativeTime value={post.publishedAt} />
                </p>
              </div>
              <SaveButton slug={post.slug} title={post.title} size="sm" />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
