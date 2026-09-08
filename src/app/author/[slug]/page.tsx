import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Badge, Container, JsonLd } from '@/components/ui/primitives';
import { InfinitePosts } from '@/components/infinite-posts';
import { ProfileHero } from '@/components/ui/profile-hero';

import { getAuthorBySlug, getAuthors, getCategories, getPublishedPosts } from '@/lib/posts';
import { StringArray, parseJson } from '@/lib/json';
import { breadcrumbLd, buildMetadata, jsonLdGraph, personLd } from '@/lib/seo';

export const revalidate = 3600;

export async function generateStaticParams() {
  const authors = await getAuthors();
  return authors.map((a) => ({ slug: a.slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: 'Not found', robots: { index: false, follow: false } };

  return buildMetadata({
    title: `${author.name} — author`,
    description: author.bio,
    path: `/author/${author.slug}`,
    image: author.avatar,
  });
}

/** Splits a display name into the two lines the profile hero stacks. */
function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], ''];
  return [parts[0], parts.slice(1).join(' ')];
}

export default async function AuthorPage({ params }: { params: Params }) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const [posts, categories] = await Promise.all([
    getPublishedPosts({ authorSlug: slug, take: 12 }),
    getCategories(),
  ]);

  const focusSlugs = parseJson(author.categoryFocus, StringArray, []);
  const focus = categories.filter((c) => focusSlugs.includes(c.slug));

  const structuredData = jsonLdGraph(
    personLd(author),
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: author.name, path: `/author/${author.slug}` },
    ]),
  );

  return (
    <>
      <JsonLd data={structuredData} />

      <div className="grid-bg border-b border-border">
        <Container>
          <ProfileHero
            eyebrow="Author"
            nameLines={splitName(author.name)}
            tagline={author.bio}
            avatar={author.avatar}
            avatarAlt={author.name}
          />
        </Container>
      </div>

      <Container className="py-12">
        {focus.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Covers:</span>
            {focus.map((category) => (
              <Badge key={category.slug} tone="brand">
                {category.name}
              </Badge>
            ))}
          </div>
        ) : null}

        <h2 className="mt-10 text-2xl font-bold tracking-tight">
          {posts.length === 1 ? 'One article' : `Articles`} by {author.name}
        </h2>

        {posts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing published yet under this byline.
          </p>
        ) : (
          <div className="mt-8">
            <InfinitePosts
              initial={posts}
              hasMoreInitially={posts.length === 12}
              authorSlug={slug}
            />
          </div>
        )}
      </Container>
    </>
  );
}
