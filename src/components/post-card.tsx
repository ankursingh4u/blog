import Image from 'next/image';
import { CoverArt, coverPhoto } from '@/components/ui/cover-art';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import type { PostCard as PostCardData } from '@/lib/posts';
import { Badge } from '@/components/ui/primitives';
import { cn, formatDate, isoDate } from '@/lib/utils';
import { categoryPath } from '@/lib/urls';

/**
 * Article card. Every variant reserves its cover box with an explicit aspect
 * ratio, so nothing can shift the grid — the CLS budget for a listing page is
 * spent almost entirely here.
 *
 * The cover is a licensed photograph when one has been chosen, and drawn art
 * otherwise (see `CoverArt`) — never the OG card, which has the headline baked
 * into it. The old `priority` prop went when the drawn fallback arrived and
 * there was no longer always an image request to prioritise.
 */
export function PostCard({
  post,
  variant = 'default',
  className,
}: {
  post: PostCardData;
  variant?: 'default' | 'featured' | 'compact';
  className?: string;
}) {
  const published = formatDate(post.publishedAt);
  const photo = coverPhoto(post);
  const verified = post.testedOnBuild && post.lastVerifiedAt;

  if (variant === 'compact') {
    return (
      <article className={cn('group', className)}>
        <Link href={post.href} className="flex gap-4">
          <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md bg-muted">
            {photo ? (
              <Image
                src={photo}
                alt=""
                fill
                sizes="96px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <CoverArt
                seed={post.category.slug}
                className="transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-brand">
              {post.title}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {post.category.name}
              {published ? ` · ${published}` : ''}
            </p>
          </div>
        </Link>
      </article>
    );
  }

  const isFeatured = variant === 'featured';

  return (
    <article
      className={cn(
        'group surface flex flex-col overflow-hidden transition-colors hover:border-brand/40',
        isFeatured && 'lg:flex-row',
        className,
      )}
    >
      <Link
        href={post.href}
        className={cn(
          'relative block shrink-0 overflow-hidden bg-muted',
          isFeatured ? 'aspect-[16/9] lg:aspect-auto lg:w-1/2' : 'aspect-[16/9]',
        )}
        tabIndex={-1}
        aria-hidden="true"
      >
        {photo ? (
          <Image
            src={photo}
            alt=""
            fill
            sizes={isFeatured ? '(max-width: 1024px) 100vw, 50vw' : '(max-width: 768px) 100vw, 33vw'}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <>
            <CoverArt
              seed={post.category.slug}
              className="transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="relative grid h-full w-full place-items-center">
              <span className="font-mono text-xs uppercase tracking-widest text-white/70">
                {post.category.name}
              </span>
            </div>
          </>
        )}
      </Link>

      <div className={cn('flex flex-1 flex-col p-5', isFeatured && 'lg:p-8')}>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={categoryPath(post.category)} className="shrink-0">
            <Badge tone="brand">{post.category.name}</Badge>
          </Link>
          {post.affectedBuilds.slice(0, 1).map((build) => (
            <Badge key={build}>{build}</Badge>
          ))}
        </div>

        <h3
          className={cn(
            'mt-3 text-balance font-semibold leading-snug tracking-tight',
            isFeatured ? 'text-2xl lg:text-3xl' : 'text-lg',
          )}
        >
          <Link href={post.href} className="transition-colors hover:text-brand">
            {post.title}
          </Link>
        </h3>

        <p
          className={cn(
            'mt-3 text-pretty text-sm text-muted-foreground',
            isFeatured ? 'line-clamp-4' : 'line-clamp-3',
          )}
        >
          {post.excerpt}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-5 text-xs text-muted-foreground">
          <Link href={`/author/${post.author.slug}`} className="hover:text-foreground">
            {post.author.name}
          </Link>
          {published ? (
            <>
              <span aria-hidden="true">·</span>
              <time dateTime={isoDate(post.publishedAt)}>{published}</time>
            </>
          ) : null}
          {/* No "verification pending" counterpart — see article-meta.tsx. */}
          {verified ? (
            <span className="inline-flex items-center gap-1 text-ok">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Tested on {post.testedOnBuild}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
