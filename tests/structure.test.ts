import { describe, expect, it } from 'vitest';
import {
  MIN_WORDS,
  STANDARD_MAX_WORDS,
  checkStructure,
  countWords,
  describeStructure,
} from '../src/pipeline/structure';

/** Builds a body of roughly `words` words with the requested shape. */
function body({
  words = 900,
  intro = true,
  conclusion = true,
  headings = 3,
  list = true,
  h1 = false,
}: Partial<{
  words: number;
  intro: boolean;
  conclusion: boolean;
  headings: number;
  list: boolean;
  h1: boolean;
}> = {}) {
  const filler = (n: number) =>
    Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

  const parts: string[] = [];
  if (h1) parts.push('# A title that should not be here');
  if (intro) parts.push(filler(60));
  for (let i = 0; i < headings; i += 1) {
    parts.push(`## Section ${i + 1}`);
    parts.push(filler(Math.max(20, Math.floor(words / Math.max(headings, 1)))));
  }
  if (list) parts.push('- first item\n- second item\n- third item');
  if (conclusion) parts.push('## Conclusion', filler(40));
  return parts.join('\n\n');
}

describe('countWords', () => {
  it('ignores fenced code blocks', () => {
    const withCode = `Some prose here.\n\n\`\`\`\nnet stop wuauserv\nnet stop bits\nren C:\\\\Windows\\\\SoftwareDistribution\n\`\`\`\n\nMore prose.`;
    // "Some prose here." + "More prose." = 5 words; commands must not count.
    expect(countWords(withCode)).toBe(5);
  });

  it('counts plain prose', () => {
    expect(countWords('one two three four')).toBe(4);
  });
});

describe('checkStructure', () => {
  it('accepts a well-formed article', () => {
    const report = checkStructure(body());
    expect(report.ok).toBe(true);
    expect(report.issues.filter((i) => i.blocking)).toHaveLength(0);
    expect(report.wordCount).toBeGreaterThanOrEqual(MIN_WORDS);
  });

  // The upper bound is a note, not a rule: a deep dive is allowed to run to
  // 2500 words and nothing can tell mechanically which was intended.
  it('notes an article over the standard length without blocking it', () => {
    const report = checkStructure(body({ words: STANDARD_MAX_WORDS + 600 }));
    const issue = report.issues.find((i) => i.rule === 'over-standard-length');
    expect(issue).toBeDefined();
    expect(issue!.blocking).toBe(false);
    expect(report.ok).toBe(true);
  });

  it('does not flag an article inside the standard band', () => {
    const report = checkStructure(body({ words: 950 }));
    expect(report.issues.some((i) => i.rule === 'over-standard-length')).toBe(false);
  });

  it('blocks an article under the word floor', () => {
    const report = checkStructure(body({ words: 120 }));
    expect(report.ok).toBe(false);
    expect(report.issues.map((i) => i.rule)).toContain('too-short');
  });

  it('blocks a missing conclusion', () => {
    const report = checkStructure(body({ conclusion: false }));
    expect(report.ok).toBe(false);
    expect(report.issues.map((i) => i.rule)).toContain('missing-conclusion');
  });

  it('accepts alternative conclusion headings', () => {
    for (const heading of ['What to do next', 'The bottom line', 'Key takeaways', 'Summary']) {
      const text = body({ conclusion: false }) + `\n\n## ${heading}\n\nClosing thoughts here.`;
      const rules = checkStructure(text).issues.map((i) => i.rule);
      expect(rules, heading).not.toContain('missing-conclusion');
    }
  });

  it('blocks a body containing an H1', () => {
    const report = checkStructure(body({ h1: true }));
    expect(report.issues.map((i) => i.rule)).toContain('has-h1');
    expect(report.ok).toBe(false);
  });

  it('blocks a body with no subheadings', () => {
    const report = checkStructure(body({ headings: 0, conclusion: false }));
    expect(report.issues.map((i) => i.rule)).toContain('no-subheadings');
  });

  it('blocks a body with no introduction before the first heading', () => {
    const report = checkStructure(body({ intro: false }));
    expect(report.issues.map((i) => i.rule)).toContain('missing-intro');
  });

  it('flags a missing list without blocking', () => {
    const report = checkStructure(body({ list: false }));
    const issue = report.issues.find((i) => i.rule === 'no-lists');
    expect(issue).toBeDefined();
    expect(issue?.blocking).toBe(false);
    expect(report.ok).toBe(true);
  });

  it('flags overlong paragraphs without blocking', () => {
    const longPara = 'This is a sentence. '.repeat(8);
    const report = checkStructure(`${longPara}\n\n${body()}`);
    const issue = report.issues.find((i) => i.rule === 'long-paragraphs');
    expect(issue).toBeDefined();
    expect(issue?.blocking).toBe(false);
  });

  it('does not count list items as paragraphs', () => {
    const listy = body() + '\n\n1. one\n2. two\n3. three\n4. four\n5. five\n6. six\n7. seven';
    expect(checkStructure(listy).issues.map((i) => i.rule)).not.toContain('long-paragraphs');
  });
});

describe('describeStructure', () => {
  it('reports a clean body', () => {
    expect(describeStructure(checkStructure(body()))).toMatch(/^Structure OK/);
  });

  it('names blocking issues', () => {
    const text = describeStructure(checkStructure(body({ words: 50, conclusion: false })));
    expect(text).toContain('BLOCKING');
    expect(text).toContain('too-short');
  });
});
