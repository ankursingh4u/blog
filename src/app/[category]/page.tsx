import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { CategoryView } from '@/components/category/category-view';
import { getCategories, getCategoryBySlug } from '@/lib/posts';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ category: c.slug }));
}

type Params = Promise<{ category: string }>;
type Search = Promise<{ page?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  // Only top-level categories live at this depth; a child slug here is a 404.
  if (!category || category.parentId) {
    return { title: 'Not found', robots: { index: false, follow: false } };
  }

  return buildMetadata({
    title: category.name,
    description: category.description,
    path: `/${category.slug}`,
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { category: slug } = await params;
  const { page } = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category || category.parentId) notFound();

  return <CategoryView category={category} page={page} />;
}
