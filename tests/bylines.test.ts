import { describe, expect, it } from 'vitest';

import {
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

  it('discloses AI assistance in every bio', () => {
    // The editorial policy says every byline carries this. If a bio here ever
    // stops saying it, that page becomes untrue for that author.
    for (const author of HOUSE_BYLINES) {
      expect(author.bio).toContain('drafted with AI assistance');
    }
  });
});
