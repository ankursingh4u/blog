import { describe, expect, it } from 'vitest';

import { countWords } from '@/lib/submission-limits';

/**
 * The word count shown under the write box.
 *
 * It gates nothing — there is no word limit — but it is the number a writer
 * checks their piece against, so it has to match what they would get from
 * anywhere else. Chiefly that means markdown syntax is not words.
 */

describe('countWords', () => {
  it('counts plain prose', () => {
    expect(countWords('one two three')).toBe(3);
  });

  it('is zero for empty or whitespace-only input', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n\n  ')).toBe(0);
  });

  it('collapses runs of whitespace rather than counting them', () => {
    expect(countWords('one    two\n\n\nthree\t\tfour')).toBe(4);
  });

  it('does not count a heading marker as a word', () => {
    expect(countWords('## A heading')).toBe(2);
    expect(countWords('### Another one here')).toBe(3);
  });

  it('does not count list or quote markers', () => {
    expect(countWords('- one\n- two')).toBe(2);
    expect(countWords('1. one\n2. two')).toBe(2);
    expect(countWords('> quoted words here')).toBe(3);
  });

  it('counts a link by its label, not its URL', () => {
    expect(countWords('[the label](https://example.com/a/very/long/path)')).toBe(2);
  });

  it('ignores code fences and inline code', () => {
    expect(countWords('before\n\n```\nnot counted at all\n```\n\nafter')).toBe(2);
    expect(countWords('before `not counted` after')).toBe(2);
  });

  it('does not let emphasis markers split a word', () => {
    expect(countWords('**bold** _italic_ ~~struck~~')).toBe(3);
  });
});

describe('counting a whole article', () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

  it('counts a long piece accurately', () => {
    expect(countWords(words(1533))).toBe(1533);
  });

  it('does not let markdown structure inflate the total', () => {
    // A structured article and the same prose as a flat block are the same
    // length — the markers are syntax, not content.
    const dressed = `## ${words(10)}\n\n> ${words(10)}\n\n- ${words(480)}`;
    expect(countWords(dressed)).toBe(500);
  });
});
