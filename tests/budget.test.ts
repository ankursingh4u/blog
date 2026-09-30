import { describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@/lib/db', () => ({ prisma: {} }));
vi.mock('@/lib/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/settings')>();
  return {
    ...actual,
    getSetting: vi.fn(async (key: string) => store.get(key) ?? ''),
    setSetting: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
});

const { describeBudget, estimateCost, readBudget, readTodayUsage, recordUsage, today } =
  await import('@/pipeline/budget');

function reset(seed: Record<string, string> = {}) {
  store.clear();
  for (const [k, v] of Object.entries(seed)) store.set(k, v);
}

describe('readTodayUsage', () => {
  it('starts empty when nothing is stored', async () => {
    reset();
    const usage = await readTodayUsage();
    expect(usage).toMatchObject({ calls: 0, inputTokens: 0, outputTokens: 0, posts: 0 });
    expect(usage.date).toBe(today());
  });

  it("discards yesterday's tally rather than counting it against today", async () => {
    reset({
      USAGE_TODAY: JSON.stringify({
        date: '2020-01-01',
        calls: 9,
        inputTokens: 500_000,
        outputTokens: 500_000,
        posts: 4,
      }),
    });
    const usage = await readTodayUsage();
    expect(usage.inputTokens).toBe(0);
    expect(usage.date).toBe(today());
  });

  it('survives malformed stored JSON', async () => {
    reset({ USAGE_TODAY: '{not json' });
    await expect(readTodayUsage()).resolves.toMatchObject({ inputTokens: 0 });
  });

  it('rejects a stored shape that does not match', async () => {
    reset({ USAGE_TODAY: JSON.stringify({ date: today(), calls: 'lots' }) });
    await expect(readTodayUsage()).resolves.toMatchObject({ calls: 0 });
  });
});

describe('recordUsage', () => {
  it('accumulates across posts', async () => {
    reset();
    await recordUsage({ calls: 2, inputTokens: 1000, outputTokens: 300 });
    const after = await recordUsage({ calls: 2, inputTokens: 500, outputTokens: 200 });
    expect(after).toMatchObject({ calls: 4, inputTokens: 1500, outputTokens: 500, posts: 2 });
  });
});

describe('readBudget', () => {
  it('reports remaining headroom under the cap', async () => {
    reset({ DAILY_TOKEN_BUDGET: '10000' });
    await recordUsage({ calls: 1, inputTokens: 3000, outputTokens: 1000 });
    const budget = await readBudget();
    expect(budget).toMatchObject({ limit: 10000, spent: 4000, remaining: 6000, exhausted: false });
  });

  it('is exhausted once spend reaches the cap exactly', async () => {
    reset({ DAILY_TOKEN_BUDGET: '5000' });
    await recordUsage({ calls: 1, inputTokens: 4000, outputTokens: 1000 });
    await expect(readBudget()).resolves.toMatchObject({ exhausted: true, remaining: 0 });
  });

  it('treats 0 as no cap, not as a cap of zero', async () => {
    reset({ DAILY_TOKEN_BUDGET: '0' });
    await recordUsage({ calls: 1, inputTokens: 999_999, outputTokens: 999_999 });
    const budget = await readBudget();
    expect(budget.exhausted).toBe(false);
    expect(budget.remaining).toBe(Number.POSITIVE_INFINITY);
  });

  it('treats an unset cap as no cap', async () => {
    reset();
    await expect(readBudget()).resolves.toMatchObject({ limit: 0, exhausted: false });
  });
});

describe('estimateCost', () => {
  it('prices input and output separately', () => {
    const cost = estimateCost({ inputTokens: 1_000_000, outputTokens: 500_000 }, '2,10');
    expect(cost).toBeCloseTo(2 + 5, 6);
  });

  it('returns null when no rates are configured, rather than zero', () => {
    expect(estimateCost({ inputTokens: 1000, outputTokens: 1000 }, '')).toBeNull();
    expect(estimateCost({ inputTokens: 1000, outputTokens: 1000 }, 'free')).toBeNull();
  });
});

describe('describeBudget', () => {
  it('says so when no cap is set', () => {
    expect(describeBudget({ limit: 0, spent: 12, remaining: Infinity, exhausted: false })).toContain(
      'no cap set',
    );
  });

  it('flags a reached cap', () => {
    expect(
      describeBudget({ limit: 100, spent: 100, remaining: 0, exhausted: true }),
    ).toContain('cap reached');
  });
});
