import { describe, expect, it } from 'vitest';

import { MAX_BODY_WORDS, countWords } from '@/lib/submission-limits';

/**
 * The counter in the write box and the validator on the server both call
 * countWords. A form that says 500 and a server that disagrees is worse than
 * showing no count at all, so the two must never drift — which is what these
 * tests hold in place.
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

describe('the 500-word limit', () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

  it('counts exactly at the boundary', () => {
    expect(countWords(words(MAX_BODY_WORDS))).toBe(MAX_BODY_WORDS);
  });

  it('accepts a body of exactly the limit', () => {
    expect(countWords(words(MAX_BODY_WORDS)) <= MAX_BODY_WORDS).toBe(true);
  });

  it('rejects one word past it', () => {
    expect(countWords(words(MAX_BODY_WORDS + 1)) > MAX_BODY_WORDS).toBe(true);
  });

  it('does not let markdown formatting push a valid article over', () => {
    // 500 words of prose dressed up as a structured article must still pass:
    // the markers are syntax, not content.
    const dressed = `## ${words(10)}\n\n> ${words(10)}\n\n- ${words(480)}`;
    expect(countWords(dressed)).toBe(MAX_BODY_WORDS);
  });
});
