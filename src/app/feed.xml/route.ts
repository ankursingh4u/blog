import { prisma } from '@/lib/db';
import { SITE, absoluteUrl } from '@/lib/site';
import { toPlainText } from '@/lib/markdown';
import { postPath } from '@/lib/urls';

export const revalidate = 3600;

/** Escapes the five XML entities. Every value below is user/AI-authored text. */
function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED', publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
    take: 50,
    include: {
      category: { select: { slug: true, name: true, parent: { select: { slug: true } } } },
      author: { select: { name: true } },
    },
  });

  const updated = posts[0]?.publishedAt ?? new Date();

  const items = posts
    .map((post) => {
      const url = absoluteUrl(postPath(post));
      const description = post.metaDescription || toPlainText(post.quickAnswer, 280);
      return `    <item>
      <title>${esc(post.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <pubDate>${post.publishedAt!.toUTCString()}</pubDate>
      <category>${esc(post.category.name)}</category>
      <dc:creator>${esc(post.author.name)}</dc:creator>
      <description>${esc(description)}</description>
${
  post.featuredImage
    ? `      <enclosure url="${esc(
        post.featuredImage.startsWith('http') ? post.featuredImage : absoluteUrl(post.featuredImage),
      )}" type="image/png" length="0" />\n`
    : ''
}    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(SITE.name)}</title>
    <link>${esc(SITE.url)}</link>
    <description>${esc(SITE.description)}</description>
    <language>en</language>
    <lastBuildDate>${updated.toUTCString()}</lastBuildDate>
    <atom:link href="${esc(absoluteUrl('/feed.xml'))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
