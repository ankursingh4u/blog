import { z } from 'zod';
import type { Author, Category, Keyword } from '@prisma/client';
import { generateJson } from '@/lib/ai';
import type { ResearchSource } from '@/pipeline/research';
import { slugify } from '@/lib/utils';

/**
 * Step 5 — generation.
 *
 * The output shape is enforced by the API's structured-output support, so there
 * is no fence-stripping or JSON repair here. What this module owns is the
 * system prompt: the post structure every guide must follow, and the standing
 * instruction that only identifiers appearing in the supplied sources may be
 * used.
 */

export const DraftSchema = z.object({
  title: z
    .string()
    .min(20)
    // Raised from 90. The cap is enforced server-side by strict structured
    // outputs, and at 90 the model squeezed under it by mangling a word rather
    // than rewriting — one draft shipped "amid game injury" in place of "amid
    // game industry crash", with the correct phrase still in its own slug. The
    // headroom plus the instruction below removes the incentive to truncate.
    // `metaTitle` keeps its own 60-character SEO limit; this is the H1.
    .max(110)
    .describe(
      'H1. The target keyword phrased the way a person would type it. No clickbait. ' +
        'If it will not fit, rewrite it shorter in whole words — never abbreviate, ' +
        'truncate, or drop letters from a word to fit the limit.',
    ),
  slug: z
    .string()
    .min(8)
    .max(80)
    .describe('URL slug: lowercase, hyphenated, no stop-word padding.'),
  quickAnswer: z
    .string()
    .min(80)
    .max(500)
    .describe('Two to three sentences that resolve the problem for most readers. No preamble.'),
  body: z
    .string()
    // ~4,800 characters is roughly 800 words, the floor for a standard guide.
    // The previous min(800) was characters, which allowed ~130-word posts.
    .min(4800)
    .describe(
      'Markdown body, 800-1200 words for a standard guide and up to 2500 for a deep dive. ' +
        'Opens with a 2-3 paragraph introduction (hook, then what the piece covers), then ' +
        'H2 sections, then a "Conclusion" H2 that summarises and tells the reader what to ' +
        'do next. No H1 — the title is rendered separately. No FAQ section — separate field.',
    ),
  affectedBuilds: z
    .array(z.string())
    .max(8)
    .describe('Windows builds or versions affected. Only ones present in the sources.'),
  faq: z
    .array(z.object({ question: z.string().min(10), answer: z.string().min(30) }))
    .min(3)
    .max(5)
    .describe('Questions a reader would actually ask next. Answers are self-contained.'),
  metaTitle: z.string().min(20).max(60).describe('Under 60 characters.'),
  metaDescription: z.string().min(70).max(160).describe('Between 70 and 160 characters.'),
  internalLinkSuggestions: z
    .array(z.string())
    .max(5)
    .describe('Titles of related guides on this site that would help the reader.'),
});

export type Draft = z.infer<typeof DraftSchema>;

/**
 * Shape rules that apply to every post in every vertical. These encode the
 * editorial standard: scannable structure, a real introduction, and an ending
 * that tells the reader what to do next.
 */
const UNIVERSAL_STRUCTURE = `Every article on this site follows the same shape:

1. The H1 is the target keyword phrased naturally (supplied as "title").
2. A quick answer of 2-3 sentences that resolves the question for most readers
   (a separate field, not part of the body).
3. The body OPENS with an introduction of two to three short paragraphs: hook the
   reader with why this matters to them, then say plainly what the article covers.
   Do not start with a dictionary definition or "in today's world".
4. Then the substance, broken into H2 sections. Use H3 beneath an H2 where a
   section has distinct parts.
5. The body ENDS with a "Conclusion" H2 that summarises the main point in two to
   three sentences and closes with a clear call to action telling the reader what
   to do next.
6. Three to five FAQ entries (a separate field, not part of the body).

Length:
- Standard guide: 800-1200 words in the body.
- Deep dive on a competitive topic: 1400-2500 words.
- Never publish under 800 words. Thin pages do not rank and waste the reader's time.

Formatting rules for the body — these exist so the page can be skimmed:
- Markdown only. No raw HTML — it is stripped before rendering.
- No H1 anywhere; the title is rendered separately.
- Keep every paragraph to at most 4-5 sentences. Break longer ones up.
- Use bullet or numbered lists wherever you are listing things. Every article
  should contain at least one list.
- Bold the specific thing a reader is looking for (a setting name, a threshold,
  a figure) so it can be found by scanning.
- Say what the reader should see or expect after a step, so they can tell whether
  it worked.`;

/** Extra rules for troubleshooting content (the /tech/windows sub-section). */
const TROUBLESHOOTING_STRUCTURE = `This is a troubleshooting guide, so additionally:

- Give affected versions or builds as a structured list.
- One H2 per method, titled "Method 1: ...", "Method 2: ...", with numbered steps
  inside each. Methods run from least destructive to most destructive.
- Anything that edits the registry, resets update components, deletes cached data
  or needs an in-place upgrade carries a bold warning line BEFORE its steps.
- An "If nothing worked" H2 before the conclusion.
- Commands go in fenced code blocks, and the line before each one states whether
  an elevated prompt is required.
- Give the exact Settings path (Settings > Windows Update > Update history) rather
  than describing where to click.`;

const HARD_RULES = `Absolute rules:

- You may only state facts that appear in the SOURCES below. If the sources do not
  answer something, leave it out. Write about the subject, not about what your
  research did or did not contain.
- Never refer to the source material as an object. The reader cannot see it and
  does not know it exists. Banned outright: "the supplied sources", "the sources
  provided", "this source pack", "the supplied record", "based on the material
  provided", "not confirmed in the sources", and any "Status:" line reporting
  whether something could be verified. Nothing in the article may describe the
  process by which it was written.
- If the headline's central claim is not supported by the SOURCES, do not write an
  article explaining that. Cover what the sources *do* establish, under a title
  that matches it.
- Never write a specific figure, date, price, statistic, name or identifier that
  does not appear in the SOURCES or in the VERIFIED IDENTIFIERS list. This is
  checked automatically after you finish and a draft that breaks it is discarded.
  Refer to things generically rather than inventing a specific.
- Do not speculate about causes no source has stated.
- Do not recommend commercial repair, cleaner or "optimiser" products.
- Do not promise an outcome. Describe what something does.
- Health and money articles must say plainly that they are general information and
  not personal medical or financial advice.`;

/**
 * Prose rules derived from Wikipedia:Signs of AI writing and
 * Wikipedia:Writing better articles. Enforced advisorily by
 * src/pipeline/style.ts after generation.
 *
 * The bans on second person and contractions from those pages are deliberately
 * omitted: they are right for an encyclopedia and wrong for a how-to article
 * that has to address the reader.
 */
const PROSE_RULES = `How to write, so the result does not read as machine-written:

- Do not use the em-dash (—) as a general-purpose connector. Use a comma, a colon,
  a full stop or brackets. At most one em-dash per 300 words.
- Avoid this vocabulary entirely: crucial, pivotal, vital, key (as an adjective),
  delve, landscape, tapestry, testament, underscore, showcase, foster, robust,
  seamless, leverage, myriad, realm, intricate, meticulous, vibrant, ever-evolving,
  additionally, moreover, furthermore.
- Do not write "not just X, but Y", "not merely X, but Y", or similar negative
  parallelisms. State the positive claim directly.
- Do not replace "is" with "serves as", "stands as", "functions as" or
  "represents". If a thing is something, write that it is.
- No puffery: groundbreaking, renowned, cutting-edge, state-of-the-art,
  unparalleled, world-class, revolutionary, diverse array.
- No claims of significance in place of facts: "plays a crucial role",
  "is a testament to", "underscores the importance of". Give the fact instead.
- No weasel attribution: "some argue", "experts say", "it is widely believed".
  Name the source or drop the sentence.
- Do not refer to the article from inside it: no "note that", "as mentioned above",
  "in this article we will".
- Vary sentence length and paragraph shape. Do not end every section with a
  one-sentence summary of that section.
- Avoid the rule of three as a default rhythm. Not every list needs three items.
- Cut every word that does no work. A sentence should contain no unnecessary
  words, a paragraph no unnecessary sentences.`;

interface GenerateDraftInput {
  keyword: Keyword;
  category: Category;
  author: Author;
  sources: ResearchSource[];
}

export async function generateDraft({
  keyword,
  category,
  author,
  sources,
}: GenerateDraftInput): Promise<Draft> {
  const verified = [keyword.kbNumber, keyword.buildNumber, keyword.errorCode].filter(
    (value): value is string => Boolean(value),
  );

  // Troubleshooting conventions (Method 1/2/3, elevated prompts, affected builds)
  // apply to the Windows sub-section, not to sport or travel.
  const isTroubleshooting = category.slug === 'windows';

  const system = [
    `You write for a general-interest publication covering trending topics. You are writing as ${author.name}.`,
    '',
    `Author voice: ${author.stylePrompt}`,
    '',
    `Category: ${category.name} — ${category.description}`,
    '',
    UNIVERSAL_STRUCTURE,
    '',
    PROSE_RULES,
    ...(isTroubleshooting ? ['', TROUBLESHOOTING_STRUCTURE] : []),
    '',
    HARD_RULES,
  ].join('\n');

  const sourceBlock = sources
    .map((source, index) => `--- SOURCE ${index + 1}: ${source.title}\nURL: ${source.url}\n\n${source.text}`)
    .join('\n\n');

  const prompt = [
    `TARGET KEYWORD: ${keyword.phrase}`,
    verified.length > 0
      ? `VERIFIED IDENTIFIERS (these are confirmed real and may be used): ${verified.join(', ')}`
      : 'VERIFIED IDENTIFIERS: none — do not name any KB, build, or error code.',
    '',
    'SOURCES:',
    sourceBlock || '(no sources were reachable — do not invent specifics; write only what is uncontroversially true, and name no identifiers, figures or dates)',
    '',
    `Write the guide for "${keyword.phrase}".`,
  ].join('\n');

  const { data } = await generateJson({
    system,
    prompt,
    schema: DraftSchema,
    schemaName: 'article_draft',
    maxTokens: 20000,
    effort: 'high',
  });

  // The model is asked for a slug, but the canonical form is ours.
  return { ...data, slug: slugify(data.slug || data.title) };
}
