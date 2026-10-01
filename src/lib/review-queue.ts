import { prisma } from '@/lib/db';
import { setSetting } from '@/lib/settings';

/**
 * The one-draft-at-a-time review queue behind the Telegram buttons.
 *
 * A cycle produces sixteen drafts at once. Sending sixteen messages would make
 * the chat the thing you have to manage, so the cycle hands them over here and
 * exactly one is in front of you at a time: decide, and the next arrives.
 *
 * State lives in a Setting row rather than new columns because the deployment
 * runs `prisma generate && next build` with no migration step — a new table
 * would exist in the generated client and not in the database, and every write
 * would fail in production while passing every test locally. When there is a
 * migration path this wants to be a `ReviewCycle` table.
 *
 * The entry list is written once and never mutated; a cursor walks it. Shifting
 * decided drafts out of an array loses the one thing the regeneration rule
 * needs — which category a rejected draft belonged to.
 *
 * Everything that decides behaviour is a pure function over the cycle object,
 * so the ordering and the regeneration rule are testable without a database.
 */

export type Outcome = 'APPROVED' | 'REJECTED';

export interface CycleEntry {
  postId: string;
  categorySlug: string;
  categoryName: string;
  title: string;
}

export interface ReviewCycle {
  startedAt: string;
  /** Every draft in the cycle, in the order they are shown. Never mutated. */
  entries: CycleEntry[];
  /** Index of the draft awaiting a decision. Past the end means finished. */
  cursor: number;
  /** postId → what was decided. Absent means not yet decided. */
  outcomes: Record<string, Outcome>;
  /**
   * Categories whose drafts have already been regenerated once.
   *
   * Without this, a category whose replacements are also rejected regenerates
   * again, and again — an unattended loop that spends money on every pass.
   */
  regenerated: string[];
  /** True while the replacements for rejected categories are being reviewed. */
  isRegenerationRound: boolean;
}

const SETTING_KEY = 'REVIEW_CYCLE' as const;

/**
 * Interleaves by category so consecutive drafts are never from the same one.
 *
 * "Approve, and show me the next category" is the whole point: judging two
 * football stories back to back invites comparing them with each other rather
 * than against the standard. Two per category becomes every category once,
 * then every category again.
 */
export function orderRoundRobin(entries: CycleEntry[]): CycleEntry[] {
  const byCategory = new Map<string, CycleEntry[]>();
  for (const entry of entries) {
    const list = byCategory.get(entry.categorySlug);
    if (list) list.push(entry);
    else byCategory.set(entry.categorySlug, [entry]);
  }

  const ordered: CycleEntry[] = [];
  for (let round = 0; ; round += 1) {
    let moved = false;
    for (const list of byCategory.values()) {
      const entry = list[round];
      if (entry) {
        ordered.push(entry);
        moved = true;
      }
    }
    if (!moved) return ordered;
  }
}

export function newCycle(entries: CycleEntry[], isRegenerationRound = false): ReviewCycle {
  return {
    startedAt: new Date().toISOString(),
    entries: orderRoundRobin(entries),
    cursor: 0,
    outcomes: {},
    regenerated: [],
    isRegenerationRound,
  };
}

/** The draft awaiting a decision, or null when the cycle is finished. */
export function currentEntry(cycle: ReviewCycle): CycleEntry | null {
  return cycle.entries[cycle.cursor] ?? null;
}

export function isComplete(cycle: ReviewCycle): boolean {
  return cycle.cursor >= cycle.entries.length;
}

/**
 * Records a decision and moves on.
 *
 * Tolerant of a decision on a draft that is not the current one: the chat keeps
 * old messages and their buttons, and a tap on yesterday's card should still be
 * recorded rather than silently dropped. The cursor only advances when the
 * decision was for the draft actually being shown, so acting on an old message
 * cannot skip a draft that was never seen.
 */
export function recordOutcome(cycle: ReviewCycle, postId: string, outcome: Outcome): ReviewCycle {
  const current = currentEntry(cycle);
  return {
    ...cycle,
    outcomes: { ...cycle.outcomes, [postId]: outcome },
    cursor: current && current.postId === postId ? cycle.cursor + 1 : cycle.cursor,
  };
}

/**
 * Categories where every decided draft was rejected.
 *
 * One approval is enough to leave a category alone — this catches a section
 * that came back with nothing usable, it is not a hunt for a perfect score.
 * Categories already regenerated once are excluded, by the rule above.
 */
export function fullyRejectedCategories(cycle: ReviewCycle): string[] {
  const tally = new Map<string, { total: number; decided: number; rejected: number }>();

  for (const entry of cycle.entries) {
    const current = tally.get(entry.categorySlug) ?? { total: 0, decided: 0, rejected: 0 };
    current.total += 1;
    const outcome = cycle.outcomes[entry.postId];
    if (outcome) {
      current.decided += 1;
      if (outcome === 'REJECTED') current.rejected += 1;
    }
    tally.set(entry.categorySlug, current);
  }

  return (
    [...tally.entries()]
      /**
       * Every draft in the section must have been judged, not just the ones
       * that happened to be rejected. A category holding one rejection and one
       * undecided draft has not come back empty — it has not finished being
       * read, and regenerating it there would throw away an article nobody has
       * looked at yet.
       */
      .filter(
        ([slug, t]) =>
          t.total > 0 &&
          t.decided === t.total &&
          t.rejected === t.total &&
          !cycle.regenerated.includes(slug),
      )
      .map(([slug]) => slug)
  );
}

/** Every draft that was rejected, for the summary sent at the end of a cycle. */
export function rejectedEntries(cycle: ReviewCycle): CycleEntry[] {
  return cycle.entries.filter((entry) => cycle.outcomes[entry.postId] === 'REJECTED');
}

/* ------------------------------------------------------------ persistence */

/**
 * Read straight from the table, not through `getSettings`.
 *
 * `getSettings` is wrapped in React's `cache`, which dedupes for the lifetime
 * of a request. The webhook writes a decision and then reads the cycle back to
 * find the next draft — through the cache it would read its own stale copy and
 * send the same article twice.
 */
export async function readCycle(): Promise<ReviewCycle | null> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!row?.value) return null;
  try {
    const parsed = JSON.parse(row.value) as Partial<ReviewCycle>;
    if (!Array.isArray(parsed.entries) || typeof parsed.outcomes !== 'object') return null;
    return {
      startedAt: parsed.startedAt ?? new Date().toISOString(),
      entries: parsed.entries,
      cursor: typeof parsed.cursor === 'number' ? parsed.cursor : 0,
      outcomes: parsed.outcomes ?? {},
      regenerated: parsed.regenerated ?? [],
      isRegenerationRound: parsed.isRegenerationRound ?? false,
    };
  } catch {
    // A corrupt cycle must not wedge the queue: treat it as no cycle at all.
    return null;
  }
}

export async function writeCycle(cycle: ReviewCycle): Promise<void> {
  await setSetting(SETTING_KEY, JSON.stringify(cycle));
}

export async function clearCycle(): Promise<void> {
  await setSetting(SETTING_KEY, '');
}
