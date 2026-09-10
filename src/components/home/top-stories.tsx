import { Cover } from '@/components/ui/cover-art';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import type { PostCard } from '@/lib/posts';
import { RelativeTime } from '@/components/ui/relative-time';
import { SaveButton } from '@/components/save-button';
import { categoryPath } from '@/lib/urls';

/**
 * The lead cluster: one story given the full width of the card, with the next
 * few headlines listed beside it. This is the shape news aggregators use because
 * it establishes a clear first read without burying everything else.
 */
export function TopStories({ lead, rest }: { lead: PostCard; rest: PostCard[] }) {
  return (
    <section
      aria-labelledby="top-stories-heading"
      className="surface overflow-hidden p-5 sm:p-7"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="top-stories-heading" className="text-xl font-semibold tracking-tight">
          <Link href={categoryPath(lead.category)} className="group inline-flex items-center gap-1.5 hover:text-brand">
            Top stories
            <ChevronRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </h2>
      </div>

      <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-9">
        {/* Lead */}
        <article className="min-w-0">
          <Link href={lead.href} className="group block">
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-muted">
              <Cover
                post={lead}
                sizes="(min-width: 1024px) 620px, 100vw"
                className="transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>

            <p className="mt-4 flex items-center gap-2 text-xs font-medium text-brand">
              <span>{lead.category.name}</span>
            </p>

            <h3 className="mt-2 text-balance text-2xl font-bold leading-snug tracking-tight transition-colors group-hover:text-brand sm:text-3xl">
              {lead.title}
            </h3>
          </Link>

          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{lead.excerpt}</p>

          <div className="mt-4 flex items-center gap-3">
            <ByLine post={lead} />
            <SaveButton slug={lead.slug} title={lead.title} size="sm" className="ml-auto" />
          </div>
        </article>

        {/* Secondary headlines */}
        <div className="min-w-0 divide-y divide-border border-t border-border lg:border-t-0 lg:pt-0">
          {rest.map((post) => (
            <article key={post.id} className="flex items-start gap-4 py-4 first:pt-0 lg:first:pt-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-brand">{post.category.name}</p>
                <Link href={post.href} className="group">
                  <h3 className="mt-1 text-pretty text-[15px] font-semibold leading-snug transition-colors group-hover:text-brand">
                    {post.title}
                  </h3>
                </Link>
                <div className="mt-2">
                  <ByLine post={post} />
                </div>
              </div>

              <Link href={post.href} className="shrink-0">
                <div className="relative h-[72px] w-[104px] overflow-hidden rounded-md border border-border bg-muted">
                  <Cover post={post} sizes="104px" />
                </div>
              </Link>

              <SaveButton slug={post.slug} title={post.title} size="sm" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ByLine({ post }: { post: PostCard }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <Link href={`/author/${post.author.slug}`} className="font-medium hover:text-foreground">
        {post.author.name}
      </Link>
      <span aria-hidden="true">·</span>
      <RelativeTime value={post.publishedAt} />
    </p>
  );
}
