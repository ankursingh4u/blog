import { Cover } from '@/components/ui/cover-art';
import Link from 'next/link';

import type { PostCard } from '@/lib/posts';
import { RelativeTime } from '@/components/ui/relative-time';
import { SaveButton } from '@/components/save-button';

/**
 * The right-hand rail: a dense list of recent pieces with thumbnails, the way an
 * aggregator surfaces "more for you" beside the lead cluster.
 *
 * On a single-publisher site the source favicon has no equivalent, so the
 * category acts as the label instead — it is the thing that actually tells a
 * reader whether the item is for them.
 */
export function PicksRail({
  posts,
  heading = 'Picks for you',
  description,
}: {
  posts: PostCard[];
  heading?: string;
  description?: string;
}) {
  if (posts.length === 0) return null;

  const id = `${heading.toLowerCase().replace(/[^a-z]+/g, '-')}-heading`;

  return (
    <section aria-labelledby={id} className="surface p-5 sm:p-6">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {heading}
      </h2>
      {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}

      <ul className="mt-4 divide-y divide-border">
        {posts.map((post) => (
          <li key={post.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-brand">
                {post.category.name}
              </p>
              <Link href={post.href} className="group">
                <h3 className="mt-1 text-pretty text-sm font-semibold leading-snug transition-colors group-hover:text-brand">
                  {post.title}
                </h3>
              </Link>
              <p className="mt-1.5 text-xs text-muted-foreground">
                <RelativeTime value={post.publishedAt} />
              </p>
            </div>

            <Link href={post.href} className="shrink-0">
              <div className="relative h-14 w-14 overflow-hidden rounded-md border border-border bg-muted">
                <Cover post={post} sizes="56px" />
              </div>
            </Link>

            <SaveButton slug={post.slug} title={post.title} size="sm" />
          </li>
        ))}
      </ul>
    </section>
  );
}
