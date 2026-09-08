'use client';

import Link from 'next/link';
import { Bookmark } from 'lucide-react';

import type { PostCard as PostCardData } from '@/lib/posts';
import { PostCard } from '@/components/post-card';
import { buttonClass } from '@/components/ui/primitives';
import { useSaved } from '@/lib/saved';

/**
 * Renders whatever the reader has saved.
 *
 * Saved slugs live in localStorage, so the server cannot know them. The full
 * published list is passed in and filtered here — at this corpus size that is a
 * few kilobytes and avoids an API round-trip on every visit.
 */
export function SavedList({ posts }: { posts: PostCardData[] }) {
  const { slugs, ready, clear } = useSaved();

  if (!ready) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Loading your saved articles…
      </p>
    );
  }

  // Keep the reader's own ordering — most recently saved first.
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  const saved = slugs.map((slug) => bySlug.get(slug)).filter((p): p is PostCardData => Boolean(p));

  if (saved.length === 0) {
    return (
      <div className="surface p-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand/10 text-brand">
          <Bookmark className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Nothing saved yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Use the bookmark button on any article to keep it here. Saved articles stay on this
          device and are never sent anywhere.
        </p>
        <Link href="/" className={buttonClass('primary', 'md', 'mt-6')}>
          Browse the briefing
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {saved.length} saved {saved.length === 1 ? 'article' : 'articles'}
        </p>
        <button type="button" onClick={clear} className={buttonClass('outline', 'sm')}>
          Clear all
        </button>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {saved.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </>
  );
}
