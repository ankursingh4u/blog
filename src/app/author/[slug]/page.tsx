import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Badge, Container, JsonLd, buttonClass } from '@/components/ui/primitives';
import { InfinitePosts } from '@/components/infinite-posts';

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
    title: `${author.name}, author`,
    description: author.bio,
    path: `/author/${author.slug}`,
    image: author.avatar,
  });
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

      {/*
        A masthead header, not a poster.

        The name used to be set at 15vw across a 30rem-tall hero: it filled the
        screen, pushed everything the page is actually about below the fold, and
        left the right-hand half of the layout empty. A profile is a person,
        their work and their writing, sized so you can see all three at once.
      */}
      <div className="grid-bg border-b border-border">
        <Container className="flex flex-col gap-6 py-12 sm:flex-row sm:items-center">
          <span
            aria-hidden="true"
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-brand/15 text-3xl font-bold text-brand"
          >
            {author.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Author
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{author.name}</h1>
            {profile ? (
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {profile.roles.join(' · ')}
              </p>
            ) : null}
            <p className="mt-3 max-w-xl text-base text-muted-foreground">{author.bio}</p>
          </div>
        </Container>
      </div>

      {/*
        Two columns: the writing on the left, who they are on the right. One
        column left the right-hand half of every profile blank.
      */}
      <Container className="grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14">
        <div className="min-w-0">
          <p className="text-lg leading-relaxed text-foreground/90">
            {profile ? profile.biography : author.bio}
          </p>

          {/*
            The disclosure is still owed to the reader, but it is a footnote about
            the process, not a description of the person. It reads as one now.
          */}
          <p className="mt-6 text-xs text-muted-foreground">
          Articles under this byline are drafted with AI assistance and checked against their
          sources before a person approves them -{' '}
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
           * site rather than a new one, and most of the masthead will sit at
           * zero until the pipeline has been round a few times. Point the
           * reader at the sections this person writes on instead of at nothing.
           */
            <div className="mt-4 space-y-4">
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
        </div>

        {/* The right-hand column: the facts about the person, at a glance. */}
        <aside className="space-y-8 lg:border-l lg:border-border lg:pl-10">
          {focus.length > 0 ? (
            <section>
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {profile ? 'Writes on' : 'Covers'}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {focus.map((category) => (
                  <Link key={category.slug} href={`/${category.slug}`}>
                    <Badge tone="brand">{category.name}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {profile && profile.interests.length > 0 ? (
            <section>
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Off the clock
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {profile.interests.join(', ')}
              </p>
            </section>
          ) : null}

          {/*
            What this person builds, where they have said so. On a site that
            covers technology, an author who ships software is a disclosure as
            much as a credit, the reader should be able to see it.
          */}
          {profile?.links?.length ? (
            <section>
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Also builds
              </h2>
              <ul className="mt-3 space-y-3">
                {profile.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium underline-offset-4 hover:text-brand hover:underline"
                    >
                      {link.label}
                    </a>
                    {link.note ? (
                      <span className="block text-xs text-muted-foreground">{link.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Masthead
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              <Link href="/about" className="underline hover:text-foreground">
                Everyone who writes here
              </Link>
            </p>
          </section>
        </aside>
      </Container>
    </>
  );
}
