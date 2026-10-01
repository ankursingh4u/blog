import { describe, expect, it } from 'vitest';

import {
  DISPLAY_ORDER,
  FIXED_BYLINES,
  HOUSE_BYLINES,
  HOUSE_SLUGS,
  ROTATING_CATEGORIES,
  fixedBylineFor,
} from '@/lib/bylines';

describe('house bylines', () => {
  it('gives tech, money and travel a standing byline', () => {
    expect(fixedBylineFor('tech')).toBe('ankur-singh');
    expect(fixedBylineFor('money')).toBe('ankur-singh');
    expect(fixedBylineFor('travel')).toBe('ankur-singh');
    expect(fixedBylineFor('windows')).toBe('ankur-singh');
    expect(fixedBylineFor('gaming')).toBe('adarsh-singh');
    expect(fixedBylineFor('entertainment')).toBe('anushka-kumari');
  });

  it('leaves the remaining sections to rotate', () => {
    for (const slug of ROTATING_CATEGORIES) {
      expect(fixedBylineFor(slug)).toBeNull();
    }
  });

  it('every standing byline is a real masthead slug', () => {
    for (const slug of Object.values(FIXED_BYLINES)) {
      expect(HOUSE_SLUGS).toContain(slug);
    }
  });

  it('every rotating section has at least one author who covers it', () => {
    for (const slug of ROTATING_CATEGORIES) {
      const covering = HOUSE_BYLINES.filter((author) => author.focus.includes(slug));
      expect(covering.length).toBeGreaterThan(0);
    }
  });

  it('a standing byline covers the section it signs', () => {
    for (const [category, slug] of Object.entries(FIXED_BYLINES)) {
      const author = HOUSE_BYLINES.find((a) => a.slug === slug);
      expect(author?.focus).toContain(category);
    }
  });

  it('has unique slugs', () => {
    expect(new Set(HOUSE_SLUGS).size).toBe(HOUSE_SLUGS.length);
  });

  it('keeps every bio to a single short line', () => {
    // A masthead is a list of people. Eight paragraphs is the state this was
    // in when the cards grew taller than the section around them.
    for (const author of HOUSE_BYLINES) {
      expect(author.bio.length).toBeLessThanOrEqual(120);
      expect(author.bio).not.toContain('drafted with AI assistance');
    }
  });

  it('gives every byline its own biography, not boilerplate', () => {
    const texts = HOUSE_BYLINES.map((a) => a.biography);
    // Eight identical paragraphs is what this replaced.
    expect(new Set(texts).size).toBe(texts.length);
    for (const author of HOUSE_BYLINES) {
      expect(author.biography.length).toBeGreaterThan(200);
      // The biography describes the person; the process note lives on the page.
      expect(author.biography).not.toContain('drafted with AI assistance');
      expect(author.biography).toContain(author.name.split(' ')[0]);
    }
  });

  it('leads with the three founders, then runs A to Z', () => {
    expect(HOUSE_SLUGS.slice(0, 3)).toEqual(['ankur-singh', 'kiran-varma', 'aakash-sharma']);

    const rest = DISPLAY_ORDER.slice(3).map((a) => a.name);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));

    // Named explicitly as well: a sort that silently drops someone still sorts.
    expect(rest).toEqual([
      'Adarsh Singh',
      'Aditi Jain',
      'Ankit Mishra',
      'Anushka Kumari',
      'Diksha Ganglani',
      'Irfan Siddique',
      'Jatin Prajapati',
      'Kirti Sisodiya',
      'Ratana Prajapati',
      'Raushan Kumar',
      'Sushil Kumar Bharti',
    ]);
  });

  it('shows every byline exactly once', () => {
    expect(DISPLAY_ORDER).toHaveLength(HOUSE_BYLINES.length);
    expect(new Set(HOUSE_SLUGS).size).toBe(HOUSE_BYLINES.length);
  });
});
