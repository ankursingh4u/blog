import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CycleEntry, ReadyBatch, ReviewCycle } from '@/lib/review-queue';

/**
 * The scheduled tick, which is the part that was broken.
 *
 * What is worth pinning down here is not that a message gets sent, it is the
 * three ways a timed release can quietly destroy work: overwriting a queue
 * somebody is halfway through, paying for a second batch on top of an unopened
 * one, and a lock left behind by a process that died mid-article.
 *
 * The persistence is mocked; the ordering and completion helpers are the real
 * ones, because the point of several of these cases is what the real
 * `isComplete` says about a half-decided cycle.
 */

const state: {
  ready: ReadyBatch | null;
  cycle: ReviewCycle | null;
  preparing: string;
  sent: number;
  cycleRuns: number;
  cycleThrows: boolean;
} = { ready: null, cycle: null, preparing: '', sent: 0, cycleRuns: 0, cycleThrows: false };

vi.mock('@/lib/db', () => ({
  prisma: {
    setting: {
      findUnique: async ({ where }: { where: { key: string } }) =>
        where.key === 'PREPARING_SINCE' && state.preparing
          ? { key: 'PREPARING_SINCE', value: state.preparing }
          : null,
    },
  },
}));

vi.mock('@/lib/settings', () => ({
  setSetting: async (key: string, value: string) => {
    if (key === 'PREPARING_SINCE') state.preparing = value;
  },
}));

vi.mock('@/pipeline/log', () => ({
  log: { info: () => {}, warn: () => {}, error: () => {} },
}));

vi.mock('@/pipeline/review-flow', () => ({
  sendNextForReview: async () => {
    state.sent += 1;
    return true;
  },
}));

vi.mock('@/pipeline/cycle', () => ({
  runCycle: async () => {
    state.cycleRuns += 1;
    if (state.cycleThrows) throw new Error('OpenAI is down');
    return { parked: 3, produced: 3, budgetStopped: false };
  },
}));

vi.mock('@/lib/review-queue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/review-queue')>();
  return {
    ...actual,
    readReady: async () => state.ready,
    clearReady: async () => {
      state.ready = null;
    },
    readCycle: async () => state.cycle,
    writeCycle: async (cycle: ReviewCycle) => {
      state.cycle = cycle;
    },
  };
});

const { prepareNextBatch, releaseReadyBatch, tick } = await import('@/pipeline/release');
const { newCycle } = await import('@/lib/review-queue');

const entry = (postId: string, categorySlug: string): CycleEntry => ({
  postId,
  categorySlug,
  categoryName: categorySlug,
  title: `${categorySlug} ${postId}`,
});

const parked = (...entries: CycleEntry[]): ReadyBatch => ({
  preparedAt: '2026-10-03T02:00:00.000Z',
  entries,
});

beforeEach(() => {
  state.ready = null;
  state.cycle = null;
  state.preparing = '';
  state.sent = 0;
  state.cycleRuns = 0;
  state.cycleThrows = false;
});

describe('releaseReadyBatch', () => {
  it('does nothing when no batch was prepared', async () => {
    state.cycle = newCycle([entry('a', 'tech')]);

    const result = await releaseReadyBatch();

    expect(result).toEqual({ released: 0, delivery: 'nothing-ready' });
    expect(state.sent).toBe(0);
    // Critically, an empty release must not touch a queue in progress.
    expect(state.cycle?.entries).toHaveLength(1);
  });

  it('opens the batch and sends the first draft when nothing is in progress', async () => {
    state.ready = parked(entry('a', 'tech'), entry('b', 'sports'));

    const result = await releaseReadyBatch();

    expect(result).toEqual({ released: 2, delivery: 'opened' });
    expect(state.sent).toBe(1);
    expect(state.cycle?.cursor).toBe(0);
    expect(state.cycle?.entries).toHaveLength(2);
    expect(state.ready).toBeNull();
  });

  it('appends to an unfinished queue instead of overwriting it', async () => {
    const open = newCycle([entry('old1', 'tech'), entry('old2', 'money')]);
    state.cycle = open;
    state.ready = parked(entry('new1', 'sports'));

    const result = await releaseReadyBatch();

    expect(result).toEqual({ released: 1, delivery: 'appended' });
    // Nothing undecided may be dropped: that is a paid-for article nobody saw.
    expect(state.cycle?.entries.map((e) => e.postId)).toEqual(['old1', 'old2', 'new1']);
    expect(state.cycle?.cursor).toBe(0);
    // No second message: a draft is already in front of the reviewer.
    expect(state.sent).toBe(0);
  });

  it('opens normally once the previous queue has been fully decided', async () => {
    const done = newCycle([entry('old1', 'tech')]);
    state.cycle = { ...done, cursor: 1 };
    state.ready = parked(entry('new1', 'sports'));

    const result = await releaseReadyBatch();

    expect(result.delivery).toBe('opened');
    expect(state.cycle?.entries.map((e) => e.postId)).toEqual(['new1']);
    expect(state.sent).toBe(1);
  });
});

describe('prepareNextBatch', () => {
  it('refuses to start a second preparation while one is running', async () => {
    state.preparing = new Date(Date.now() - 10 * 60_000).toISOString();

    const result = await prepareNextBatch();

    expect(result.started).toBe(false);
    expect(state.cycleRuns).toBe(0);
  });

  it('treats a lock older than the stale window as a preparation that died', async () => {
    state.preparing = new Date(Date.now() - 200 * 60_000).toISOString();

    const result = await prepareNextBatch();

    expect(result.started).toBe(true);
    expect(state.cycleRuns).toBe(1);
  });

  it('clears the lock even when generation throws', async () => {
    state.cycleThrows = true;

    await expect(prepareNextBatch()).rejects.toThrow('OpenAI is down');
    // A lock a dead run left behind is what stops the schedule forever.
    expect(state.preparing).toBe('');
  });
});

describe('tick', () => {
  it('delivers and starts the next preparation', async () => {
    state.ready = parked(entry('a', 'tech'));

    const result = await tick();

    expect(result).toMatchObject({ released: 1, delivery: 'opened', preparing: true });
  });

  it('still delivers when a preparation from an earlier tick is running', async () => {
    state.ready = parked(entry('a', 'tech'));
    state.preparing = new Date(Date.now() - 5 * 60_000).toISOString();

    const result = await tick();

    expect(result.released).toBe(1);
    expect(result.delivery).toBe('opened');
    expect(result.preparing).toBe(false);
    expect(state.cycleRuns).toBe(0);
  });
});
