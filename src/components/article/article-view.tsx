import { CoverArt } from '@/components/ui/cover-art';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, ExternalLink, Zap } from 'lucide-react';

import { Badge, Callout, Container, JsonLd, buttonClass } from '@/components/ui/primitives';
import { ArticleMeta } from '@/components/article/article-meta';
import { TableOfContents } from '@/components/article/table-of-contents';
import { FaqSection } from '@/components/article/faq-section';
import { PostCard } from '@/components/post-card';
import { AdSlot } from '@/components/ad-slot';

import { getCategories, getPublishedPosts, getRelatedPosts, type FullPost } from '@/lib/posts';
import { SectionRail } from '@/components/article/section-rail';
import { extractToc, renderMarkdown } from '@/lib/markdown';
import { authorPath, categoryPath } from '@/lib/urls';
import { articleLd, breadcrumbLd, faqLd, jsonLdGraph, personLd } from '@/lib/seo';

/**
 * The article page body, shared by the flat route (/tech/x) and the nested one
 * (/tech/windows/x). Both routes resolve the post themselves — how a URL maps
 * to a post differs between them — and hand the result here to render.
 */
export async function ArticleView({ post }: { post: FullPost }) {
  // Eight rather than four: the first four fill the grid at the foot of the
  // article, the rest become the compact list in the sidebar. Splitting one
  // query keeps the two rails from showing the same four links twice.
  const [html, relatedAll, sections] = await Promise.all([
    renderMarkdown(post.body),
    getRelatedPosts(post, 10),
    getCategories(),
  ]);
  const related = relatedAll.slice(0, 4);

  // The rail's suggestions come after the four in the grid so the two never
  // repeat. When the site is small there is nothing left over, so it falls back
  // to the newest articles elsewhere rather than rendering an empty box.
  let sidebarLinks = relatedAll.slice(4, 10);
  if (sidebarLinks.length < 4) {
    const shown = new Set([post.id, ...relatedAll.slice(0, 4).map((p) => p.id)]);
    const latest = await getPublishedPosts({ take: 12 });
    sidebarLinks = [...sidebarLinks, ...latest.filter((p) => !shown.has(p.id))].slice(0, 6);
  }

  const toc = extractToc(post.body);

  // A post in a child category gets both rungs, so the trail reads
  // Home > Tech > Windows > title.
  const crumbs = [
    { name: 'Home', path: '/' },
    ...(post.category.parent
      ? [{ name: post.category.parent.name, path: `/${post.category.parent.slug}` }]
      : []),
    { name: post.category.name, path: categoryPath(post.category) },
    { name: post.title, path: post.href },
  ];

  const structuredData = jsonLdGraph(
    articleLd({
      title: post.title,
      description: post.metaDescription,
      path: post.href,
      image: post.featuredImage,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      author: post.author,
      categoryName: post.category.name,
      categorySlug: post.category.slug,
      sources: post.sources,
      wordCount: post.wordCount,
    }),
    personLd(post.author),
    breadcrumbLd(crumbs),
    faqLd(post.faq),
  );

  return (
    <>
      <JsonLd data={structuredData} />

      {/* Wider than the site default. The article page carries a sidebar, so at
          the standard max-w-6xl the reading column and the rail together left a
          large dead margin on either side of a desktop screen. */}
      <Container className="max-w-[80rem] py-8 lg:py-12">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {crumbs.slice(0, -1).map((crumb) => (
              <li key={crumb.path} className="flex items-center gap-1.5">
                <Link href={crumb.path} className="transition-colors hover:text-foreground">
                  {crumb.name}
                </Link>
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </li>
            ))}
            <li aria-current="page" className="truncate text-foreground/70">
              {post.title}
            </li>
          </ol>
        </nav>

        {/* Three columns from `xl`: sections on the left, the article, then the
            22rem rail — wide enough to hold the contents, an ad and a link list
            without running out of content halfway down. Below `xl` the left
            rail drops and the layout is the previous two-column one; below
            `lg`, a single column. */}
        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[11rem_minmax(0,1fr)_22rem]">
          <SectionRail
            sections={sections}
            activeSlug={post.category.slug}
            parentSlug={post.category.parent?.slug}
          />

          <article className="min-w-0">
            <header>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={categoryPath(post.category)}>
                  <Badge tone="brand">{post.category.name}</Badge>
                </Link>
                {post.affectedBuilds.map((build) => (
                  <Badge key={build}>{build}</Badge>
                ))}
              </div>

              <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {post.title}
              </h1>

              <ArticleMeta
                author={post.author}
                publishedAt={post.publishedAt}
                updatedAt={post.updatedAt}
                lastVerifiedAt={post.lastVerifiedAt}
                testedOnBuild={post.testedOnBuild}
                readingMinutes={post.readingMinutes}
              />
            </header>

            {/*
              Deliberately not `post.featuredImage`. That is the OG card, with
              the headline drawn into it — directly beneath the same headline as
              an H1 it read as a stuttering duplicate. It stays the `og:image`
              for social previews, where the baked text is the point.
            */}
            <div className="relative mt-8 aspect-[1200/630] overflow-hidden rounded-lg border border-border bg-muted">
              <CoverArt seed={post.category.slug} />
            </div>

            <Callout
              title="Quick answer"
              tone="brand"
              icon={<Zap className="h-4 w-4 text-brand" />}
              className="mt-8"
            >
              {post.quickAnswer}
            </Callout>

            <div className="mt-8">
              <AdSlot placement="AD_SLOT_IN_ARTICLE" size="rectangle" />
            </div>

            {/* Sanitised in src/lib/markdown.ts — raw HTML from the generator is
                dropped at parse time and again by the rehype allow-list. */}
            <div
              className="prose prose-lg mt-10 max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {post.screenshots.length > 0 ? (
              <section aria-labelledby="screenshots-heading" className="mt-12">
                <h2 id="screenshots-heading" className="text-2xl font-bold tracking-tight">
                  Screenshots
                </h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {post.screenshots.map((shot) => (
                    <figure key={shot.url}>
                      <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-muted">
                        <Image
                          src={shot.url}
                          alt={shot.alt}
                          fill
                          sizes="(max-width: 640px) 100vw, 380px"
                          className="object-cover"
                        />
                      </div>
                      {shot.alt ? (
                        <figcaption className="mt-2 text-xs text-muted-foreground">
                          {shot.alt}
                        </figcaption>
                      ) : null}
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}

            <FaqSection faq={post.faq} />

            {post.sources.length > 0 ? (
              <section aria-labelledby="sources-heading" className="mt-14">
                <h2 id="sources-heading" className="text-2xl font-bold tracking-tight">
                  Sources
                </h2>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {post.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        rel="nofollow noopener noreferrer"
                        target="_blank"
                        className="inline-flex items-start gap-1.5 text-brand hover:underline"
                      >
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{source.title || source.url}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <ReadNextCta category={post.category} />
            <AuthorCard author={post.author} />
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-8">
              <TableOfContents entries={toc} />
              <AdSlot placement="AD_SLOT_SIDEBAR" size="rectangle" />
              {sidebarLinks.length > 0 ? (
                <nav aria-labelledby="more-in-heading" className="surface p-5">
                  <h2
                    id="more-in-heading"
                    className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {/* Small categories get topped up from the rest of the site,
                        so only claim the category when every link is from it. */}
                    {sidebarLinks.every((item) => item.category.slug === post.category.slug)
                      ? `More in ${post.category.name}`
                      : 'More reading'}
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {sidebarLinks.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className="text-sm font-medium leading-snug text-foreground/85 transition-colors hover:text-brand"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={categoryPath(post.category)}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                  >
                    All {post.category.name}
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </nav>
              ) : null}
            </div>
          </aside>
        </div>

        {related.length > 0 ? (
          <section aria-labelledby="related-heading" className="mt-20 border-t border-border pt-12">
            <h2 id="related-heading" className="text-2xl font-bold tracking-tight">
              Related reading
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <PostCard key={item.id} post={item} />
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </>
  );
}

/**
 * Closing call to action. The written conclusion belongs to the post body; this
 * is the structural "what next" that every article ends on, so a reader who
 * finishes always has somewhere to go.
 */
function ReadNextCta({
  category,
}: {
  category: { name: string; slug: string; parent?: { name: string; slug: string } | null };
}) {
  return (
    <section
      aria-labelledby="read-next-heading"
      className="mt-14 rounded-lg border border-brand/25 bg-brand-soft/60 p-6 sm:p-8"
    >
      <h2 id="read-next-heading" className="text-xl font-bold tracking-tight">
        Where to go next
      </h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        If this answered your question, the rest of our {category.name} coverage works the same
        way — the short answer first, then the detail, and every source listed.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={categoryPath(category)} className={buttonClass('primary', 'md')}>
          More {category.name}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link href="/search" className={buttonClass('outline', 'md')}>
          Search the site
        </Link>
      </div>
    </section>
  );
}

function AuthorCard({
  author,
}: {
  author: { name: string; slug: string; bio: string; avatar: string | null };
}) {
  return (
    <section className="surface mt-14 flex gap-5 p-6">
      {author.avatar ? (
        <Image
          src={author.avatar}
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand/15 text-lg font-semibold text-brand"
        >
          {author.name.charAt(0)}
        </span>
      )}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Written by</p>
        <Link href={authorPath(author)} className="text-lg font-semibold hover:text-brand">
          {author.name}
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">{author.bio}</p>
      </div>
    </section>
  );
}
