import { z } from 'zod';
import type { Author, Category, Keyword } from '@prisma/client';
import { generateJson } from '@/lib/ai';
import { getSetting } from '@/lib/settings';
import type { ResearchSource } from '@/pipeline/research';
import { slugify } from '@/lib/utils';

/**
 * Step 5, generation.
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
    // than rewriting, one draft shipped "amid game injury" in place of "amid
    // game industry crash", with the correct phrase still in its own slug. The
    // headroom plus the instruction below removes the incentive to truncate.
    // `metaTitle` keeps its own 60-character SEO limit; this is the H1.
    .max(110)
    .describe(
      'H1. Must contain, early, the phrase a reader would actually type into Google for ' +
        'this story, not the publisher-style headline the source used. "IHG credit card ' +
        'changes 2026: new perks and higher fees" beats "IHG revamps its credit card ' +
        'lineup". No clickbait. If it will not fit, rewrite it shorter in whole words, ' +
        'never abbreviate, truncate, or drop letters from a word to fit the limit.',
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
    // ~9,000 characters is roughly 1,500 words, the floor in structure.ts.
    // Characters, not words, an earlier min(800) was characters too and allowed
    // ~130-word posts, so the unit is worth stating.
    .min(9000)
    .describe(
      'Markdown body, 1500-2000 words. Opens with a 2-3 paragraph introduction (hook, then ' +
        'what the piece covers), then H2 sections, then a "Conclusion" H2 that summarises ' +
        'and tells the reader what to do next. No H1, the title is rendered separately. ' +
        'No FAQ section, separate field.',
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
  metaTitle: z
    .string()
    .min(20)
    .max(60)
    .describe(
      'Under 60 characters, because Google truncates past that. Lead with the search ' +
        'phrase: the first few words are what a reader scans in a result list.',
    ),
  metaDescription: z
    .string()
    .min(120)
    .max(158)
    .describe(
      'Between 120 and 158 characters. Shorter wastes the space Google gives you; ' +
        'longer is cut off mid-sentence. Say what the reader will learn, not what the ' +
        'article is about.',
    ),
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

Write for the search, not for the press release. When real autocomplete queries
are supplied below under SEARCHES, they are what people genuinely type about
this subject, taken from Google's own suggestions rather than guessed. Build the
H1 around the closest one and let the others become H2 sections wherever the
sources actually answer them. Where none are supplied, work out the likely
queries yourself.

Those variants become H2 headings where they are genuine sections, phrased as
the reader would ask them. For the IHG story that is "what changed", "new annual
fees", "which card is worth it", "what existing cardholders should do", not
"Portfolio overview" and "Market context".

Do NOT list the variants, repeat the phrase to hit a count, or bend a sentence
around a keyword. A page that answers the question properly is what ranks; a
page stuffed with the ways of asking it is what gets filtered. If a variant has
no real answer in the sources, leave it out rather than padding a section for it.

3. The body OPENS with an introduction of two to three short paragraphs: hook the
   reader with why this matters to them, then say plainly what the article covers.
   Do not start with a dictionary definition or "in today's world".
4. Then the substance, broken into H2 sections. Use H3 beneath an H2 where a
   section has distinct parts.
5. The body ENDS with a "Conclusion" H2 that summarises the main point in two to
   three sentences and closes with a clear call to action telling the reader what
   to do next.
6. Three to five FAQ entries (a separate field, not part of the body).

Length, 1500 to 2000 words in the body. Reach it by covering more ground, never
by saying the same thing twice. A rough budget that lands in the band:
- Introduction: 120-180 words.
- Five to seven H2 sections at roughly 220 words each.
- Conclusion: 120 words.

If the subject genuinely does not support 1500 words of substance, write what it
does support and stop. A short article that says something is worth more than a
long one that circles. Repetition is checked automatically after you finish:
restating a point under a second heading, or echoing a sentence you have already
written, fails the draft outright. Padding costs more than being brief.

Formatting rules for the body, these exist so the page can be skimmed:
- Markdown only. No raw HTML, it is stripped before rendering.
- No H1 anywhere; the title is rendered separately.
- Keep every paragraph to at most 4-5 sentences. Break longer ones up.
- Use bullet or numbered lists wherever you are listing things. Every article
  should contain at least one list.
- Bold the specific thing a reader is looking for (a setting name, a threshold,
  a figure) so it can be found by scanning.
- Say what the reader should see or expect after a step, so they can tell whether
  it worked.`;

/**
 * Written to teach, not to report. Applies to every vertical.
 *
 * This was the `money` block until 2026-10-03, when the owner asked for it
 * everywhere: "not only as news, it must be like an educational article, later
 * demand should remain".
 *
 * The reasoning generalises past finance. A result, a launch, a transfer or a
 * ruling reported as news is read on the day and never found again, because
 * within a week nobody searches for it. The same facts written as an
 * explanation of how the thing works answer a question people type for years.
 * The news event is the occasion for the article, not its subject.
 *
 * This is also the SEO argument, not a separate one. An article whose only
 * value was its recency has no reason to be returned a month later, and a site
 * made of those has to re-earn all of its traffic every single day.
 *
 * It explicitly does NOT mean writing less, or writing fewer articles. Same
 * count, same length band, different centre of gravity.
 */
const EVERGREEN_STRUCTURE = `Write the lasting article, not the bulletin.

The event in the sources is the OCCASION for this article, not its subject. A
reader who finds this page in six months must still get something out of it.
Assume most of your readers will arrive long after the news has gone cold, from
a search that contains no dates and no names of the moment.

- Explain the mechanism, not only the event. What actually changed, how the
  thing works, why it works that way, and what follows from it.
- Give the background a newcomer needs to understand the subject at all. Someone
  who has never heard of this competition, product, scheme or rule should be able
  to follow the article from the top without looking anything up.
- Define every term the first time it appears, in one clause, without
  condescending. Assume an intelligent reader who is not a specialist.
- Say plainly who this affects and who it does not. Most readers are in neither
  the best nor the worst case.
- Prefer framing that stays true. Write "how X works" and "what X means for Y"
  sections over "what happened on Tuesday". Avoid "this week", "yesterday",
  "currently" and "recently" as anchors: name the date instead where a source
  gives one, so the sentence is still correct when read later.
- Where the subject is genuinely a one-off moment, write the durable part: the
  rules, the format, the history, the thing that will be asked again next time.
- End with what the reader can actually do or understand, and be honest when the
  answer is "nothing, and here is why that is fine".

None of this licenses padding or invention. The sources are still the only
permitted facts, and the repetition check still fails a draft that circles.
Teaching means covering more ground, never covering the same ground twice.`;

/** The extras that are specific to money, on top of the evergreen rules above. */
const MONEY_STRUCTURE = `Additionally, this is personal finance and business:

- Give a worked example with real arithmetic wherever a number is involved: on
  a 30 lakh loan over 20 years, this change means X per month. Use figures from
  the sources; where the sources give none, use a clearly labelled illustration
  and say it is one.
- Never give individual investment advice, never recommend a specific stock or
  product, and never imply a guaranteed return. Explain the options and the
  trade-offs and let the reader decide.`;

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

- Do not use the em-dash (-) as a general-purpose connector. Use a comma, a colon,
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
  /**
   * Real autocomplete queries for this subject.
   *
   * The demand half of the article. A news feed says what happened; these say
   * what people are typing about it, which is not the same sentence and is
   * usually not even the same words. The feed supplies the facts, these supply
   * the framing, and pairing them is the only way a long-tail query gets an
   * article that is still sourced.
   */
  searches?: string[];
}

export async function generateDraft({
  keyword,
  category,
  author,
  sources,
  searches = [],
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
    `Category: ${category.name}, ${category.description}`,
    '',
    UNIVERSAL_STRUCTURE,
    '',
    EVERGREEN_STRUCTURE,
    '',
    PROSE_RULES,
    ...(isTroubleshooting ? ['', TROUBLESHOOTING_STRUCTURE] : []),
    ...(category.slug === 'money' ? ['', MONEY_STRUCTURE] : []),
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
      : 'VERIFIED IDENTIFIERS: none, do not name any KB, build, or error code.',
    '',
    searches.length > 0
      ? `SEARCHES people actually type about this (Google autocomplete, in order):\n${searches
          .map((s) => `- ${s}`)
          .join('\n')}`
      : 'SEARCHES: none returned, work out the likely queries yourself.',
    '',
    'SOURCES:',
    sourceBlock || '(no sources were reachable, do not invent specifics; write only what is uncontroversially true, and name no identifiers, figures or dates)',
    '',
    `Write the guide for "${keyword.phrase}".`,
  ].join('\n');

  const { data } = await generateJson({
    system,
    prompt,
    schema: DraftSchema,
    schemaName: 'article_draft',
    // Covers reasoning *and* the response. A 2,000-word body is ~2,700 output
    // tokens; the reasoning is the larger share, and the request throws rather
    // than truncating when it runs out. The ceiling stays at 28000 after the
    // drop to 'medium', it costs nothing unspent, and a throw here wastes the
    // whole call.
    // Empty setting keeps OPENAI_MODEL. This is the call worth pointing at a
    // cheaper model: it writes the article, and output is most of the bill.
    model: await getSetting('AI_MODEL_DRAFT'),
    maxTokens: 28000,
    /**
     * Dropped from 'high' on 2026-10-01 to cut the bill.
     *
     * Reasoning tokens bill as output, and at 'high' they outweighed the article
     * itself, this was the largest single line in the per-article cost. The
     * quality gate still reads every draft against its sources, so a weaker
     * first pass is caught rather than published.
     *
     * Watch the rejection rate: a draft that fails review is paid for and
     * produces nothing, so if more drafts start failing this saves nothing.
     * Put it back to 'high' if that happens.
     */
    effort: 'medium',
  });

  // The model is asked for a slug, but the canonical form is ours.
  return { ...data, slug: slugify(data.slug || data.title) };
}
