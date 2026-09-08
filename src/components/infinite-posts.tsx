'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { PostCard } from '@/components/post-card';
import { buttonClass } from '@/components/ui/primitives';
import type { PostCard as PostCardData } from '@/lib/posts';

/**
 * Appends further pages of articles as the reader nears the bottom.
 *
 * Progressive enhancement, deliberately:
 *
 *   - The first page is rendered on the server by the page that mounts this,
 *     and passed in as `initial`. Nothing here is needed to see it.
 *   - The sentinel is only observed after mount, so a crawler — or anyone with
 *     JavaScript disabled — gets the server page plus the "Load more" link,
 *     which is a real `<a href>` to the numbered route. Infinite scroll that
 *     hides its content behind an event handler is invisible to search, which
 *     matters rather a lot for a site whose whole purpose is organic traffic.
 *
 * The observer is armed ~600px early so the next page is usually in place
 * before the reader reaches the end, and requests are guarded so a fast
 * scroll cannot fire several at once.
 */

/** Dates arrive as ISO strings over JSON and have to be revived for the card. */
interface WirePost extends Omit<PostCardData, 'publishedAt' | 'updatedAt' | 'lastVerifiedAt'> {
  publishedAt: string | null;
  updatedAt: string | null;
  lastVerifiedAt: string | null;
}

function revive(post: WirePost): PostCardData {
  return {
    ...post,
    publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
    updatedAt: post.updatedAt ? new Date(post.updatedAt) : new Date(0),
    lastVerifiedAt: post.lastVerifiedAt ? new Date(post.lastVerifiedAt) : null,
  } as PostCardData;
}

export function InfinitePosts({
  initial,
  hasMoreInitially,
  categorySlug,
  authorSlug,
  /** Free-text search; takes precedence over the category/author filters. */
  searchQuery,
  pageSize = 12,
  /**
   * How many articles the page already showed *above* this list. The homepage
   * leads with a briefing built from the newest posts, so its list starts part
   * way down the feed; without this the first fetch would re-request from zero
   * and repeat what the reader has just scrolled past.
   */
  skipOffset = 0,
  className = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3',
  /** Shown to non-JS readers and crawlers; also the manual fallback on error. */
  fallbackHref,
}: {
  initial: PostCardData[];
  hasMoreInitially: boolean;
  categorySlug?: string;
  authorSlug?: string;
  searchQuery?: string;
  pageSize?: number;
  skipOffset?: number;
  className?: string;
  fallbackHref?: string;
}) {
  const [posts, setPosts] = useState<PostCardData[]>(initial);
  const [hasMore, setHasMore] = useState(hasMoreInitially);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const sentinel = useRef<HTMLDivElement | null>(null);
  // Ref rather than state: the observer callback closes over its first render,
  // and a stale `loading` there would let a fast scroll fire duplicate pages.
  const busy = useRef(false);

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);

    try {
      const params = new URLSearchParams({
        skip: String(skipOffset + posts.length),
        take: String(pageSize),
      });
      if (searchQuery) params.set('q', searchQuery);
      else {
        if (categorySlug) params.set('categorySlug', categorySlug);
        if (authorSlug) params.set('authorSlug', authorSlug);
      }

      const response = await fetch(`/api/posts?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as { posts: WirePost[]; hasMore: boolean };

      setPosts((current) => {
        // The feed is ordered by publish date, so a post published while the
        // reader scrolls shifts the offset and can repeat an id. Drop repeats
        // rather than letting React see duplicate keys.
        const seen = new Set(current.map((p) => p.id));
        return [...current, ...data.posts.filter((p) => !seen.has(p.id)).map(revive)];
      });
      setHasMore(data.hasMore);
    } catch {
      // Leave `hasMore` true so the reader can retry with the button.
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [authorSlug, categorySlug, hasMore, pageSize, posts.length, searchQuery, skipOffset]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || failed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '600px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [failed, hasMore, loadMore]);

  return (
    <>
      <div className={className}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {hasMore ? (
        <div ref={sentinel} className="mt-10 flex flex-col items-center gap-3">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading more
            </p>
          ) : null}

          {failed ? (
            <p className="text-sm text-danger">Could not load more articles.</p>
          ) : null}

          {/* Real link when we have a route to fall back to, so this works
              without JavaScript; otherwise a button that retries. */}
          {fallbackHref ? (
            <Link href={fallbackHref} className={buttonClass('outline', 'md')}>
              {failed ? 'Try again' : 'Load more articles'}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loading}
              className={buttonClass('outline', 'md')}
            >
              {failed ? 'Try again' : 'Load more articles'}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          {posts.length > 0 ? "That's everything here." : 'Nothing published here yet.'}
        </p>
      )}

      <div aria-live="polite" className="sr-only">
        {loading ? 'Loading more articles' : `${posts.length} articles loaded`}
      </div>
    </>
  );
}
