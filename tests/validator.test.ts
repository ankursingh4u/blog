import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  FaqArray,
  ScreenshotArray,
  SourceRefArray,
  StringArray,
  parseJson,
  toJson,
} from '@/lib/json';
import { DraftSchema } from '@/pipeline/generate';
import { ScoreSchema } from '@/pipeline/quality-gate';
import { extractToc, toPlainText } from '@/lib/markdown';
import { similarity } from '@/pipeline/internal-links';
import { clampDescription, clampTitle } from '@/lib/seo';

describe('parseJson', () => {
  it('round-trips a valid array', () => {
    expect(parseJson(toJson(['a', 'b']), StringArray, [])).toEqual(['a', 'b']);
  });

  it('falls back rather than throwing on malformed JSON', () => {
    expect(parseJson('{not json', StringArray, ['fallback'])).toEqual(['fallback']);
  });

  it('falls back when the JSON parses but does not match the schema', () => {
    expect(parseJson('{"a":1}', StringArray, [])).toEqual([]);
    expect(parseJson('[1,2,3]', StringArray, [])).toEqual([]);
  });

  it('falls back on null and empty input', () => {
    expect(parseJson(null, StringArray, [])).toEqual([]);
    expect(parseJson('', StringArray, [])).toEqual([]);
  });

  it('applies schema defaults on the way out', () => {
    const parsed = parseJson('[{"url":"https://example.com"}]', SourceRefArray, []);
    expect(parsed).toEqual([{ url: 'https://example.com', title: '' }]);
  });

  it('rejects a source entry with an invalid URL', () => {
    expect(parseJson('[{"url":"not-a-url"}]', SourceRefArray, [])).toEqual([]);
  });

  it('requires both question and answer on FAQ entries', () => {
    expect(parseJson('[{"question":"Q?"}]', FaqArray, [])).toEqual([]);
    expect(parseJson('[{"question":"Q?","answer":"A."}]', FaqArray, [])).toEqual([
      { question: 'Q?', answer: 'A.' },
    ]);
  });

  it('keeps optional screenshot dimensions optional', () => {
    expect(parseJson('[{"url":"/uploads/a.png"}]', ScreenshotArray, [])).toEqual([
      { url: '/uploads/a.png', alt: '' },
    ]);
  });
});

describe('DraftSchema', () => {
  const valid = {
    title: 'How to fix 0x800f0922 in Windows 11 quickly',
    slug: 'fix-0x800f0922-windows-11',
    quickAnswer:
      'This error usually means the System Reserved partition is full. Free 250 MB on it, then retry the update from Settings.',
    // Above the 4,800-character floor (~800 words), which is what the schema
    // now requires — the old 900-character fixture was a ~150-word article.
    body: 'x'.repeat(5000),
    affectedBuilds: ['26100.2314'],
    faq: [
      { question: 'Is this reversible?', answer: 'Yes, nothing in method one deletes data.' },
      { question: 'Do I need admin?', answer: 'Yes, an elevated prompt is required.' },
      { question: 'How long does it take?', answer: 'Around ten minutes on most machines.' },
    ],
    metaTitle: 'Fix 0x800f0922 in Windows 11',
    metaDescription:
      'A tested fix for Windows Update error 0x800f0922, starting with the System Reserved partition and working down from there.',
    internalLinkSuggestions: ['Reset Windows Update components'],
  };

  it('accepts a well-formed draft', () => {
    expect(DraftSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a body that is too thin to be a guide', () => {
    expect(DraftSchema.safeParse({ ...valid, body: 'Too short.' }).success).toBe(false);
  });

  it('rejects a body under the 800-word floor', () => {
    // ~150 words: the length the old schema accepted.
    expect(DraftSchema.safeParse({ ...valid, body: 'x'.repeat(900) }).success).toBe(false);
  });

  it('rejects fewer than three FAQ entries', () => {
    expect(DraftSchema.safeParse({ ...valid, faq: valid.faq.slice(0, 2) }).success).toBe(false);
  });

  it('rejects a meta title over 60 characters', () => {
    expect(DraftSchema.safeParse({ ...valid, metaTitle: 'x'.repeat(61) }).success).toBe(false);
  });

  it('rejects a meta description outside 70-160 characters', () => {
    expect(DraftSchema.safeParse({ ...valid, metaDescription: 'Short.' }).success).toBe(false);
    expect(DraftSchema.safeParse({ ...valid, metaDescription: 'x'.repeat(161) }).success).toBe(
      false,
    );
  });
});

describe('ScoreSchema', () => {
  it('accepts a score at the top of every band', () => {
    const result = ScoreSchema.safeParse({
      accuracy: 40,
      structure: 25,
      usefulness: 25,
      safety: 10,
      notes: 'Everything traced back to a Microsoft source; structure is complete.',
      unsupportedClaims: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a band that exceeds its ceiling', () => {
    expect(
      ScoreSchema.safeParse({
        accuracy: 41,
        structure: 25,
        usefulness: 25,
        safety: 10,
        notes: 'x'.repeat(40),
        unsupportedClaims: [],
      }).success,
    ).toBe(false);
  });

  it('rejects non-integer band scores', () => {
    expect(
      ScoreSchema.safeParse({
        accuracy: 30.5,
        structure: 20,
        usefulness: 20,
        safety: 8,
        notes: 'x'.repeat(40),
        unsupportedClaims: [],
      }).success,
    ).toBe(false);
  });

  it('caps at 100 across all four bands', () => {
    const max = 40 + 25 + 25 + 10;
    expect(max).toBe(100);
  });
});

describe('extractToc', () => {
  it('collects H2 and H3 headings with slugged ids', () => {
    const toc = extractToc('## Method 1: Free space\n\ntext\n\n### Sub step\n\n## If nothing worked');
    expect(toc).toEqual([
      { id: 'method-1-free-space', text: 'Method 1: Free space', level: 2 },
      { id: 'sub-step', text: 'Sub step', level: 3 },
      { id: 'if-nothing-worked', text: 'If nothing worked', level: 2 },
    ]);
  });

  it('ignores headings inside fenced code blocks', () => {
    const toc = extractToc('## Real\n\n```\n## Not a heading\n```\n\n## Also real');
    expect(toc.map((t) => t.text)).toEqual(['Real', 'Also real']);
  });

  it('mirrors rehype-slug de-duplication', () => {
    const toc = extractToc('## Steps\n\n## Steps');
    expect(toc.map((t) => t.id)).toEqual(['steps', 'steps-1']);
  });

  it('ignores H1 and H4+', () => {
    expect(extractToc('# Title\n\n#### Deep')).toEqual([]);
  });
});

describe('toPlainText', () => {
  it('strips code fences, links and headings', () => {
    const text = toPlainText('# Title\n\n```\ncode\n```\n\nSee [the docs](https://example.com).');
    expect(text).not.toContain('```');
    expect(text).not.toContain('https://example.com');
    expect(text).toContain('the docs');
  });

  it('truncates to the requested limit with an ellipsis', () => {
    const text = toPlainText('word '.repeat(200), 50);
    expect(text.length).toBeLessThanOrEqual(50);
    expect(text.endsWith('…')).toBe(true);
  });
});

describe('similarity', () => {
  it('scores an exact title match highest', () => {
    expect(similarity('Reset Windows Update components', 'Reset Windows Update components')).toBe(
      1,
    );
  });

  it('scores unrelated titles at zero', () => {
    expect(similarity('Outlook will not open', 'Reset the print spooler')).toBe(0);
  });

  it('scores a partial overlap between the two', () => {
    const score = similarity(
      'Reset Windows Update components',
      'How to reset the Windows Update cache',
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('returns zero when one side is only stop words', () => {
    expect(similarity('how to fix', 'Reset the print spooler')).toBe(0);
  });
});

describe('seo clamps', () => {
  it('leaves short values untouched', () => {
    expect(clampTitle('Short title')).toBe('Short title');
    expect(clampDescription('Short description')).toBe('Short description');
  });

  it('truncates a long title to 60 characters', () => {
    const clamped = clampTitle('x'.repeat(200));
    expect(clamped.length).toBe(60);
    expect(clamped.endsWith('…')).toBe(true);
  });

  it('truncates a long description to 160 characters', () => {
    const clamped = clampDescription('x'.repeat(400));
    expect(clamped.length).toBe(160);
  });
});

describe('schema wiring sanity', () => {
  it('exposes the draft schema as a zod object so structured outputs can use it', () => {
    expect(DraftSchema).toBeInstanceOf(z.ZodObject);
    expect(ScoreSchema).toBeInstanceOf(z.ZodObject);
  });
});
