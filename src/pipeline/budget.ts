import { z } from 'zod';
import { asInt, getSetting, setSetting } from '@/lib/settings';
import type { UsageTally } from '@/lib/ai';

/**
 * The daily token ceiling, and today's spend against it.
 *
 * This is the thing that makes an unattended schedule supervisable. A cron
 * entry that generates articles is a cron entry that spends money, and without
 * a hard stop the failure mode is not a bad article, it is a bill nobody saw
 * coming, discovered a month later.
 *
 * Counted in tokens because tokens are what the API reports. A price per token
 * belongs to the account, not to this repository, so it is an operator setting
 * and costs are shown only when it is filled in. An invented rate that looks
 * authoritative is worse than no rate at all.
 *
 * The window is a calendar day in the server's timezone. Precise enough for a
 * spend guard, and it needs no scheduler of its own, the counter resets the
 * first time it is read on a new date.
 */

const StoredUsage = z.object({
  /** YYYY-MM-DD. A different value means the window has rolled over. */
  date: z.string(),
  calls: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  posts: z.number().int().nonnegative(),
});

export type StoredUsage = z.infer<typeof StoredUsage>;

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function empty(): StoredUsage {
  return { date: today(), calls: 0, inputTokens: 0, outputTokens: 0, posts: 0 };
}

/** Today's tally, resetting automatically when the date has moved on. */
export async function readTodayUsage(): Promise<StoredUsage> {
  const raw = await getSetting('USAGE_TODAY');
  if (!raw) return empty();

  try {
    const parsed = StoredUsage.safeParse(JSON.parse(raw));
    if (!parsed.success) return empty();
    // Yesterday's total must not count against today's budget.
    return parsed.data.date === today() ? parsed.data : empty();
  } catch {
    return empty();
  }
}

/** Adds one post's usage to today's tally. */
export async function recordUsage(usage: UsageTally): Promise<StoredUsage> {
  const current = await readTodayUsage();
  const next: StoredUsage = {
    date: current.date,
    calls: current.calls + usage.calls,
    inputTokens: current.inputTokens + usage.inputTokens,
    outputTokens: current.outputTokens + usage.outputTokens,
    posts: current.posts + 1,
  };
  await setSetting('USAGE_TODAY', JSON.stringify(next));
  return next;
}

export interface BudgetState {
  /** 0 means no ceiling. */
  limit: number;
  spent: number;
  remaining: number;
  exhausted: boolean;
}

export async function readBudget(): Promise<BudgetState> {
  const limit = asInt(await getSetting('DAILY_TOKEN_BUDGET'), 0);
  const usage = await readTodayUsage();
  const spent = usage.inputTokens + usage.outputTokens;
  return {
    limit,
    spent,
    remaining: limit > 0 ? Math.max(0, limit - spent) : Number.POSITIVE_INFINITY,
    exhausted: limit > 0 && spent >= limit,
  };
}

/**
 * Optional cost estimate, in whatever currency the rates were given in.
 *
 * Returns null when no rates are configured, and callers render nothing rather
 * than a zero, "$0.00 spent today" reads as a fact and would be a lie.
 */
export function estimateCost(
  usage: Pick<StoredUsage, 'inputTokens' | 'outputTokens'>,
  prices: string,
): number | null {
  const [input, output] = prices.split(',').map((part) => Number.parseFloat(part.trim()));
  if (!Number.isFinite(input) || !Number.isFinite(output)) return null;
  return (usage.inputTokens / 1_000_000) * input + (usage.outputTokens / 1_000_000) * output;
}

/** Compact one-line summary for logs and the dashboard. */
export function describeBudget(state: BudgetState): string {
  if (state.limit <= 0) return `${state.spent.toLocaleString()} tokens today (no cap set)`;
  return (
    `${state.spent.toLocaleString()} of ${state.limit.toLocaleString()} tokens today` +
    (state.exhausted ? ', cap reached' : '')
  );
}
