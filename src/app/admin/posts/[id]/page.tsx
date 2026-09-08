import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';

import { prisma } from '@/lib/db';
import {
  FaqArray,
  ScreenshotArray,
  SourceRefArray,
  StringArray,
  parseJson,
} from '@/lib/json';
import { deletePost } from '@/lib/admin/actions';
import { categoryPath } from '@/lib/urls';
import { PostEditor, type EditorPost } from '@/components/admin/post-editor';
import { buttonClass } from '@/components/ui/primitives';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function EditPostPage({ params }: { params: Params }) {
  const { id } = await params;

  const [post, categories, authors, publishedPosts] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: { category: { include: { parent: { select: { slug: true } } } } },
    }),
    prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { parent: { select: { name: true } } },
    }),
    prisma.author.findMany({ orderBy: { name: 'asc' } }),
    prisma.post.findMany({
      where: { status: 'PUBLISHED', NOT: { id } },
      orderBy: { publishedAt: 'desc' },
      take: 200,
      select: { slug: true, title: true, category: { select: { name: true } } },
    }),
  ]);

  if (!post) notFound();

  const editorPost: EditorPost = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    categoryId: post.categoryId,
    categoryPath: categoryPath(post.category),
    authorId: post.authorId,
    quickAnswer: post.quickAnswer,
    body: post.body,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    affectedBuilds: parseJson(post.affectedBuilds, StringArray, []),
    testedOnBuild: post.testedOnBuild ?? '',
    featuredImage: post.featuredImage ?? '',
    faq: parseJson(post.faq, FaqArray, []),
    screenshots: parseJson(post.screenshots, ScreenshotArray, []),
    relatedSlugs: parseJson(post.relatedSlugs, StringArray, []),
    qualityScore: post.qualityScore,
    qualityNotes: post.qualityNotes ?? '',
    sources: parseJson(post.sourceUrls, SourceRefArray, []),
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/posts" className={buttonClass('ghost', 'sm')}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          All posts
        </Link>

        <form action={deletePost}>
          <input type="hidden" name="id" value={post.id} />
          <button type="submit" className={buttonClass('ghost', 'sm', 'text-danger hover:bg-danger/10')}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete permanently
          </button>
        </form>
      </div>

      <h2 className="mt-4 text-xl font-bold tracking-tight">{post.title}</h2>

      <div className="mt-6">
        <PostEditor
          post={editorPost}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          authors={authors.map((a) => ({ id: a.id, name: a.name }))}
          relatedOptions={publishedPosts.map((p) => ({
            slug: p.slug,
            title: p.title,
            categoryName: p.category.name,
          }))}
        />
      </div>
    </div>
  );
}
