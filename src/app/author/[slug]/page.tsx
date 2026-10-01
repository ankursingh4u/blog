import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Badge, Container, JsonLd, buttonClass } from '@/components/ui/primitives';
import { InfinitePosts } from '@/components/infinite-posts';
import { ProfileHero } from '@/components/ui/profile-hero';

import { getAuthorBySlug, getAuthors, getCategories, getPublishedPosts } from '@/lib/posts';
import { StringArray, parseJson } from '@/lib/json';
import { breadcrumbLd, buildMetadata, jsonLdGraph, personLd } from '@/lib/seo';
import { HOUSE_BYLINES } from '@/lib/bylines';

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
  // Null for the pre-pivot persona rows that still own the back catalogue.
  const profile = HOUSE_BYLINES.find((p) => p.slug === author.slug) ?? null;

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
        {/*
          Roles and interests come from the masthead list, not the database:
          they describe the person, where categoryFocus describes what the
          pipeline routes to them. A page about someone should lead with the
          first and mention the second.
        */}
        {profile ? (
          <div className="mb-6 space-y-2">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {profile.roles.join(' · ')}
            </p>
            {profile.interests.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Off the clock: </span>
                {profile.interests.join(', ')}
              </p>
            ) : null}
          </div>
        ) : null}

        {focus.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {profile ? 'Writes on:' : 'Covers:'}
            </span>
            {focus.map((category) => (
              <Badge key={category.slug} tone="brand">
                {category.name}
              </Badge>
            ))}
          </div>
        ) : null}

        {/*
          The biography is the page. It used to be one identical paragraph on
          all eight — "is a real person answerable for what appears here" —
          which is boilerplate, and boilerplate is the thing a reader skips. The
          one page about a person said nothing about them.
        */}
        {profile ? (
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-foreground/90">
            {profile.biography}
          </p>
        ) : (
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-foreground/90">{author.bio}</p>
        )}

        {/*
          The disclosure is still owed to the reader, but it is a footnote about
          the process, not a description of the person. It reads as one now.
        */}
        <p className="mt-6 max-w-2xl text-xs text-muted-foreground">
          Articles under this byline are drafted with AI assistance and checked against their
          sources before a person approves them —{' '}
          <Link href="/editorial-policy" className="underline hover:text-foreground">
            the editorial policy
          </Link>{' '}
          sets out which parts are which.
        </p>

        <h2 className="mt-10 text-2xl font-bold tracking-tight">
          {posts.length === 0
            ? `${author.name}'s articles`
            : posts.length === 1
              ? `One article by ${author.name}`
              : `Articles by ${author.name}`}
        </h2>

        {posts.length === 0 ? (
          /*
           * An empty byline page still has to be a finished page.
           *
           * "Nothing published yet" and a wall of white space reads as a broken
           * site rather than a new one — and most of the masthead will sit at
           * zero until the pipeline has been round a few times. Point the
           * reader at the sections this person writes on instead of at nothing.
           */
          <div className="mt-4 max-w-2xl space-y-4">
            <p className="text-sm text-muted-foreground">
              {author.name.split(' ')[0]} has not published here yet. The sections
              {focus.length > 0 ? '' : ' of the site'} below are where their work will appear.
            </p>
            {focus.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {focus.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/${category.slug}`}
                    className={buttonClass('outline', 'sm')}
                  >
                    Read {category.name}
                  </Link>
                ))}
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              <Link href="/about" className="underline hover:text-foreground">
                Meet the rest of the people who write here
              </Link>
              .
            </p>
          </div>
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
