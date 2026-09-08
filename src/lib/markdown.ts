import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import type { Options as SanitizeOptions } from 'rehype-sanitize';

/**
 * AI output is never trusted. Raw HTML in the markdown source is dropped at
 * parse time (`allowDangerousHtml` is off), and whatever survives is run
 * through a sanitiser allow-list on top of that. Two gates, because the
 * generator is the least trustworthy input in the system.
 */
const schema: SanitizeOptions = {
  ...defaultSchema,
  // rehype-sanitize defaults to prefixing every id with "user-content-" to
  // prevent DOM clobbering. That would break the table of contents, whose ids
  // are derived from the same markdown source, and it puts "user-content-" in
  // every shareable deep link — which Google also surfaces as jump-to links.
  //
  // Dropping the prefix is safe here because the only ids on the page come from
  // our own H2/H3 text via rehype-slug: raw HTML is discarded at parse time
  // (`allowDangerousHtml` is off) and again by the tag allow-list below, so an
  // arbitrary id cannot be injected through article content.
  //
  // If user-submitted content is ever rendered through this pipeline, restore
  // the default prefix and update `extractToc` to match.
  clobberPrefix: '',
  attributes: {
    ...defaultSchema.attributes,
    // Heading ids come from rehype-slug and drive the table of contents.
    h2: [...(defaultSchema.attributes?.h2 ?? []), 'id'],
    h3: [...(defaultSchema.attributes?.h3 ?? []), 'id'],
    h4: [...(defaultSchema.attributes?.h4 ?? []), 'id'],
    a: [...(defaultSchema.attributes?.a ?? []), ['rel'], ['target']],
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-./]],
  },
  tagNames: (defaultSchema.tagNames ?? []).filter(
    (tag) => !['img', 'iframe', 'script', 'style', 'object', 'embed'].includes(tag),
  ),
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

export async function renderMarkdown(markdown: string): Promise<string> {
  const file = await processor.process(markdown ?? '');
  return String(file);
}

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Table of contents is derived from the markdown source rather than the
 * rendered HTML so it can be computed without a DOM and stays in sync with the
 * ids rehype-slug generates.
 */
export function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const seen = new Map<string, number>();
  let inFence = false;

  for (const line of (markdown ?? '').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length as 2 | 3;
    const text = match[2].replace(/[*_`]/g, '').trim();
    const base = githubSlug(text);
    // rehype-slug appends -1, -2… to duplicates; mirror that exactly.
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    entries.push({ id: count === 0 ? base : `${base}-${count}`, text, level });
  }

  return entries;
}

function githubSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Strips markdown to plain text for meta descriptions and search snippets. */
export function toPlainText(markdown: string, limit = 300) {
  const text = (markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[*_>|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}
