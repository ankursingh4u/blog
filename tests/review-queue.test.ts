import { describe, expect, it } from 'vitest';

import {
  currentEntry,
  fullyRejectedCategories,
  isComplete,
  newCycle,
  orderRoundRobin,
  recordOutcome,
  rejectedEntries,
  type CycleEntry,
} from '@/lib/review-queue';

const entry = (postId: string, categorySlug: string): CycleEntry => ({
  postId,
  categorySlug,
  categoryName: categorySlug,
  title: `${categorySlug} ${postId}`,
});

describe('orderRoundRobin', () => {
  it('never puts two drafts from the same category next to each other', () => {
    const ordered = orderRoundRobin([
      entry('a1', 'tech'),
      entry('a2', 'tech'),
      entry('b1', 'sports'),
      entry('b2', 'sports'),
      entry('c1', 'money'),
      entry('c2', 'money'),
    ]);

    expect(ordered.map((e) => e.postId)).toEqual(['a1', 'b1', 'c1', 'a2', 'b2', 'c2']);
    for (let i = 1; i < ordered.length; i += 1) {
      expect(ordered[i].categorySlug).not.toBe(ordered[i - 1].categorySlug);
    }
  });

  it('keeps everything when categories have uneven counts', () => {
    const ordered = orderRoundRobin([
      entry('a1', 'tech'),
      entry('a2', 'tech'),
      entry('a3', 'tech'),
      entry('b1', 'sports'),
    ]);
    expect(ordered).toHaveLength(4);
    expect(ordered.map((e) => e.postId)).toEqual(['a1', 'b1', 'a2', 'a3']);
  });

  it('handles an empty list', () => {
    expect(orderRoundRobin([])).toEqual([]);
  });
});

describe('recordOutcome', () => {
  it('advances only when the decision is for the draft being shown', () => {
    const cycle = newCycle([entry('a1', 'tech'), entry('b1', 'sports')]);
    expect(currentEntry(cycle)?.postId).toBe('a1');

    // A tap on an older card is recorded but must not skip the current draft.
    const stale = recordOutcome(cycle, 'b1', 'APPROVED');
    expect(stale.outcomes.b1).toBe('APPROVED');
    expect(currentEntry(stale)?.postId).toBe('a1');

    const moved = recordOutcome(stale, 'a1', 'APPROVED');
    expect(currentEntry(moved)?.postId).toBe('b1');
  });

  it('completes once the cursor passes the last entry', () => {
    let cycle = newCycle([entry('a1', 'tech')]);
    expect(isComplete(cycle)).toBe(false);
    cycle = recordOutcome(cycle, 'a1', 'REJECTED');
    expect(isComplete(cycle)).toBe(true);
    expect(currentEntry(cycle)).toBeNull();
  });
});

describe('two people sharing one queue', () => {
  it('keeps the first decision when a second press lands on the same draft', () => {
    let cycle = newCycle([entry('a1', 'tech'), entry('b1', 'sports')]);

    // Both tap approve on the first card before the buttons are edited away.
    cycle = recordOutcome(cycle, 'a1', 'APPROVED');
    const afterFirst = { ...cycle };
    cycle = recordOutcome(cycle, 'a1', 'REJECTED');

    // The webhook checks `outcomes` before applying anything, so the second
    // press is answered rather than applied. The state it would have written is
    // the thing being guarded against: a published article then archived.
    expect(afterFirst.outcomes.a1).toBe('APPROVED');
    expect(afterFirst.cursor).toBe(1);

    // And the cursor must not advance twice, or a draft is skipped unseen.
    expect(cycle.cursor).toBe(1);
  });
});

describe('fullyRejectedCategories', () => {
  it('names a category only when every decided draft in it was rejected', () => {
    let cycle = newCycle([
      entry('a1', 'tech'),
      entry('a2', 'tech'),
      entry('b1', 'sports'),
      entry('b2', 'sports'),
    ]);
    cycle = recordOutcome(cycle, 'a1', 'REJECTED');
    cycle = recordOutcome(cycle, 'b1', 'REJECTED');
    cycle = recordOutcome(cycle, 'a2', 'REJECTED');
    cycle = recordOutcome(cycle, 'b2', 'APPROVED');

    expect(fullyRejectedCategories(cycle)).toEqual(['tech']);
  });

  it('ignores categories that are still undecided', () => {
    let cycle = newCycle([entry('a1', 'tech'), entry('a2', 'tech')]);
    cycle = recordOutcome(cycle, 'a1', 'REJECTED');
    // a2 has not been decided, so tech is not finished being judged.
    expect(fullyRejectedCategories(cycle)).toEqual([]);
  });

  it('never regenerates a category twice', () => {
    let cycle = newCycle([entry('a1', 'tech')]);
    cycle = recordOutcome(cycle, 'a1', 'REJECTED');
    expect(fullyRejectedCategories(cycle)).toEqual(['tech']);

    cycle = { ...cycle, regenerated: ['tech'] };
    expect(fullyRejectedCategories(cycle)).toEqual([]);
  });
});

describe('rejectedEntries', () => {
  it('returns only the rejected drafts, for the closing summary', () => {
    let cycle = newCycle([entry('a1', 'tech'), entry('b1', 'sports')]);
    cycle = recordOutcome(cycle, 'a1', 'REJECTED');
    cycle = recordOutcome(cycle, 'b1', 'APPROVED');
    expect(rejectedEntries(cycle).map((e) => e.postId)).toEqual(['a1']);
  });
});
