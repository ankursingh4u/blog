import type { Metadata } from 'next';
import { SITE, absoluteUrl } from '@/lib/site';
import type { FaqItem, SourceRef } from '@/lib/json';

/** Every page description Google sees is clamped to something it will render. */
const META_DESC_MAX = 160;
const META_TITLE_MAX = 60;

export function clampTitle(title: string) {
  return title.length <= META_TITLE_MAX ? title : `${title.slice(0, META_TITLE_MAX - 1).trimEnd()}…`;
}

export function clampDescription(description: string) {
  return description.length <= META_DESC_MAX
    ? description
    : `${description.slice(0, META_DESC_MAX - 1).trimEnd()}…`;
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  authorName?: string;
  section?: string;
  noindex?: boolean;
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  authorName,
  section,
  noindex,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : absoluteUrl(image)
    : absoluteUrl(`/api/og?title=${encodeURIComponent(title)}`);

  return {
    title,
    description: clampDescription(description),
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            // Required for Google Discover to use the featured image full-bleed.
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    openGraph: {
      type,
      url,
      title,
      description: clampDescription(description),
      siteName: SITE.name,
      locale: SITE.locale,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(type === 'article'
        ? {
            publishedTime,
            modifiedTime,
            authors: authorName ? [authorName] : undefined,
            section,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: clampDescription(description),
      images: [ogImage],
      site: SITE.twitter,
    },
  };
}

/* ------------------------------------------------------------------ JSON-LD */

type Json = Record<string, unknown>;

export function organisationLd(): Json {
  return {
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization'),
    name: SITE.name,
    url: SITE.url,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/icon.svg'),
    },
  };
}

export function websiteLd(): Json {
  return {
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    publisher: { '@id': absoluteUrl('/#organization') },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: absoluteUrl('/search?q={search_term_string}'),
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function personLd(author: {
  name: string;
  slug: string;
  bio: string;
  avatar?: string | null;
}): Json {
  return {
    '@type': 'Person',
    '@id': absoluteUrl(`/author/${author.slug}#person`),
    name: author.name,
    url: absoluteUrl(`/author/${author.slug}`),
    description: author.bio,
    ...(author.avatar ? { image: absoluteUrl(author.avatar) } : {}),
  };
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqLd(faq: FaqItem[]): Json | null {
  if (faq.length === 0) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function articleLd(input: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  author: { name: string; slug: string; bio: string; avatar?: string | null };
  categoryName: string;
  /**
   * Chooses the schema.org type. `TechArticle` is only correct for the
   * troubleshooting back-catalogue; it was hardcoded for every post when the
   * site was Windows-only, which left a cricket report and a games-industry
   * piece both declaring themselves technical documentation. Everything outside
   * `windows` is a plain `Article`.
   */
  categorySlug?: string;
  sources: SourceRef[];
  wordCount: number;
}): Json {
  const url = absoluteUrl(input.path);
  return {
    '@type': input.categorySlug === 'windows' ? 'TechArticle' : 'Article',
    '@id': `${url}#article`,
    headline: input.title,
    description: input.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(input.image
      ? {
          image: {
            '@type': 'ImageObject',
            url: input.image.startsWith('http') ? input.image : absoluteUrl(input.image),
            width: 1200,
            height: 630,
          },
        }
      : {}),
    datePublished: input.publishedAt?.toISOString(),
    dateModified: (input.updatedAt ?? input.publishedAt)?.toISOString(),
    author: { '@id': absoluteUrl(`/author/${input.author.slug}#person`) },
    publisher: { '@id': absoluteUrl('/#organization') },
    articleSection: input.categoryName,
    wordCount: input.wordCount,
    inLanguage: 'en',
    isAccessibleForFree: true,
    ...(input.sources.length > 0
      ? { citation: input.sources.map((s) => ({ '@type': 'CreativeWork', url: s.url, name: s.title })) }
      : {}),
  };
}

export function collectionLd(input: {
  name: string;
  description: string;
  path: string;
  items: Array<{ title: string; path: string }>;
}): Json {
  return {
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl(input.path)}#collection`,
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    isPartOf: { '@id': absoluteUrl('/#website') },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: input.items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(item.path),
        name: item.title,
      })),
    },
  };
}

/** Wraps a set of nodes into one `@graph` document — one script tag per page. */
export function jsonLdGraph(...nodes: Array<Json | null | undefined>) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  };
}
