import type { Metadata } from 'next';

import { Container } from '@/components/ui/primitives';
import { SavedList } from '@/components/saved-list';
import { getPublishedPosts } from '@/lib/posts';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Saved articles',
    description: 'Articles you have saved to read later on this device.',
    path: '/saved',
  }),
  // The contents differ per device and are meaningless to a crawler.
  robots: { index: false, follow: true },
};

export default async function SavedPage() {
  // The whole published list, filtered client-side against localStorage.
  const posts = await getPublishedPosts();

  return (
    <Container className="max-w-[80rem] py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Saved</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Kept on this device only. Clearing your browser data removes them.
      </p>

      <div className="mt-10">
        <SavedList posts={posts} />
      </div>
    </Container>
  );
}
