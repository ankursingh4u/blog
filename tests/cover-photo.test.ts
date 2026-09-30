import { describe, expect, it } from 'vitest';
import {
  CATEGORY_QUERY,
  TOPIC_RULES,
  subjectQueryFor,
  titleKey,
  usedKeysFromCredits,
  words,
} from '../src/pipeline/cover-photo';

describe('words', () => {
  it('drops stopwords, short words and punctuation', () => {
    expect(words('The new iPhone, explained!')).toEqual(['iphone']);
  });

  it('strips html rather than tokenising the tags', () => {
    expect(words('<em>Stadium</em> redevelopment')).toEqual(['stadium', 'redevelopment']);
  });
});

describe('titleKey', () => {
  it('matches the same photograph indexed under different word order', () => {
    expect(titleKey('Wembley Stadium exterior')).toBe(titleKey('exterior Wembley stadium'));
  });

  it('separates genuinely different photographs', () => {
    expect(titleKey('Wembley Stadium')).not.toBe(titleKey('Anfield Stadium'));
  });
});

describe('subjectQueryFor', () => {
  it('prefers a rule scoped to the article own vertical over one that merely matched a word', () => {
    // "ai" matches a tech rule and "flight" a travel one. A travel story must
    // not be illustrated with a data centre.
    const { subject } = subjectQueryFor('Google AI mode now tracks flight prices', 'travel');
    expect(subject).toBe('airport terminal aircraft');
  });

  it('uses a matching rule when the article vertical has no scoped rule', () => {
    const { subject } = subjectQueryFor('Premier League transfer latest', 'sports');
    expect(subject).toBe('football stadium match');
  });

  it('separates cricket from football before the shared words decide', () => {
    expect(subjectQueryFor('India name T20 squad', 'sports').subject).toBe('cricket match stadium');
  });

  it('falls back to null when no subject rule matches', () => {
    const { subject, category } = subjectQueryFor('Council names new chief executive', 'money');
    expect(subject).toBeNull();
    expect(category).toBe(CATEGORY_QUERY.money);
  });

  it('gives every vertical a category fallback', () => {
    for (const slug of Object.keys(CATEGORY_QUERY)) {
      expect(subjectQueryFor('nothing matches this headline at all', slug).category).toBeTruthy();
    }
  });

  it('uses the slug itself when a category has no configured fallback', () => {
    expect(subjectQueryFor('anything', 'not-a-vertical').category).toBe('not-a-vertical');
  });
});

describe('TOPIC_RULES', () => {
  it('scopes every rule to at least one real vertical', () => {
    const known = new Set(Object.keys(CATEGORY_QUERY));
    for (const rule of TOPIC_RULES) {
      for (const cat of rule.cats ?? []) {
        expect(known.has(cat), `rule "${rule.query}" targets unknown vertical "${cat}"`).toBe(true);
      }
    }
  });

  it('gives every rule a concrete noun-phrase query, not a bare word', () => {
    for (const rule of TOPIC_RULES) {
      expect(rule.query.split(' ').length, `"${rule.query}" is too vague`).toBeGreaterThan(1);
    }
  });
});

describe('usedKeysFromCredits', () => {
  it('builds title keys and ignores empty or missing credits', () => {
    const used = usedKeysFromCredits([
      { title: 'Wembley Stadium exterior' },
      { title: '' },
      null,
    ]);
    expect(used.has(titleKey('exterior Wembley stadium'))).toBe(true);
    expect(used.size).toBe(1);
  });
});
