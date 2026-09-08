import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db';
import {
  NewPostForm,
  type SectionOption,
  type TopicOption,
} from '@/components/admin/new-post-form';

export const dynamic = 'force-dynamic';

/**
 * Start a new article by hand.
 *
 * The topic list is the same Google News queue the pipeline draws from, so the
 * discovery work is shared — but nothing on this page spends anything. Ingest
 * is RSS, the sources are ordinary HTTP, and the cover is rendered locally.
 *
 * Source-bearing topics are offered first. A keyword discovered from
 * autocomplete or trends has no article behind it, so it is a subject rather
 * than a story, and the writer has to find their own material.
 */
export default async function NewPostPage() {
  const [keywords, categories] = await Promise.all([
    prisma.keyword.findMany({
      where: { status: 'QUEUED' },
      orderBy: [{ sourceUrl: 'desc' }, { createdAt: 'desc' }],
      take: 120,
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.category.findMany({ orderBy: [{ parentId: 'asc' }, { position: 'asc' }] }),
  ]);

  const now = Date.now();
  const topics: TopicOption[] = keywords.map((keyword) => ({
    id: keyword.id,
    phrase: keyword.phrase,
    categoryId: keyword.category?.id ?? null,
    categoryName: keyword.category?.name ?? null,
    hasSource: Boolean(keyword.sourceUrl?.startsWith('http')),
    ageHours: keyword.createdAt ? (now - keyword.createdAt.getTime()) / 3_600_000 : null,
  }));

  const sections: SectionOption[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/posts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All posts
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">New article</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Pick a story the daily Google News ingest has already found, or start from nothing.
          Choosing a topic brings its section and its sources with it. Nothing on this page calls a
          language model, so writing here costs nothing.
        </p>
      </div>

      <NewPostForm topics={topics} sections={sections} />
    </div>
  );
}
