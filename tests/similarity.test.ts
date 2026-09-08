import { describe, expect, it } from 'vitest';
import {
  isNearDuplicate,
  sharedTokenCount,
  titleTokens,
  titlesAreNearDuplicates,
} from '../src/lib/similarity';

describe('titleTokens', () => {
  it('keeps the distinctive words and drops the filler', () => {
    expect([...titleTokens('What you should know about the latest Arsenal transfer news')]).toEqual([
      'should',
      'arsenal',
      'transfer',
    ]);
  });

  it('is case- and punctuation-insensitive', () => {
    expect(titleTokens('Arsenal, Rice — TALKS!')).toEqual(titleTokens('arsenal rice talks'));
  });

  it('deduplicates repeated words', () => {
    expect(titleTokens('Foldable phones and more foldable phones').size).toBe(2);
  });
});

describe('isNearDuplicate', () => {
  // The exact case that put the same story on the site three times: every
  // publisher writes its own headline, and the phrase check saw them as
  // unrelated because not one pair of strings matched.
  it('matches the same story told two different ways', () => {
    expect(
      titlesAreNearDuplicates(
        'Transfer rumors: Arsenal want Declan Rice as Real Madrid circle',
        'Arsenal in Declan Rice talks amid Real Madrid interest — transfer rumors',
      ),
    ).toBe(true);
  });

  it('matches a headline against its padded SEO rewrite', () => {
    expect(
      titlesAreNearDuplicates(
        'SSC 2026: CHSL, GD result, CGL, JE, MTS dates',
        'SSC 2026 Live: CHSL Apply Now, GD Result, CGL, JE, MTS Dates',
      ),
    ).toBe(true);
  });

  it('separates two different results that share a team', () => {
    // Both are short and share "arsenal"/"beat". A ratio test alone collapses
    // them; the absolute floor is what keeps them apart.
    expect(titlesAreNearDuplicates('Arsenal beat Chelsea 2-1', 'Arsenal beat Spurs 3-0')).toBe(
      false,
    );
  });

  it('separates unrelated stories in the same section', () => {
    expect(
      titlesAreNearDuplicates(
        'Epic Games CEO expects hardware shortages for three years',
        'Nintendo announces a new Zelda for Switch',
      ),
    ).toBe(false);
  });

  it('does not treat a story as a duplicate of an empty title', () => {
    expect(isNearDuplicate(titleTokens(''), titleTokens('Arsenal in Rice talks'))).toBe(false);
  });

  it('still matches short titles that share nearly every word', () => {
    // Below the absolute floor of three words, so the floor drops to the size
    // of the shorter title rather than rejecting outright.
    expect(titlesAreNearDuplicates('Gold price forecast', 'Forecast: gold price')).toBe(true);
  });

  it('is symmetric', () => {
    const a = 'Huawei Mate XT 2 tri-fold launch ahead of Apple';
    const b = 'Apple foldable: Huawei Mate XT 2 tri-fold launch';
    expect(titlesAreNearDuplicates(a, b)).toBe(titlesAreNearDuplicates(b, a));
  });

  it('honours a stricter ratio when asked', () => {
    const a = titleTokens('Gold price forecast ahead of US CPI print');
    const b = titleTokens('Gold price forecast: rate hike risk before US CPI');
    expect(isNearDuplicate(a, b, { ratio: 0.99, minShared: 3 })).toBe(false);
  });
});

describe('sharedTokenCount', () => {
  it('counts only words present in both', () => {
    expect(sharedTokenCount(titleTokens('gold price forecast'), titleTokens('gold forecast'))).toBe(
      2,
    );
  });
});
