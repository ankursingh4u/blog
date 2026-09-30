import { Badge } from '@/components/ui/primitives';
import { describeBudget, estimateCost, type BudgetState, type StoredUsage } from '@/pipeline/budget';

/**
 * "Did last night work?", answered without reading a log.
 *
 * A scheduled run finishes with nobody watching and the process exits, so the
 * in-memory log that serves the "Run now" button is gone by morning. These are
 * the counts that actually answer the question, plus what it cost in tokens.
 */
export interface StoredRun {
  startedAt?: string;
  finishedAt?: string;
  ingested?: number;
  attempted?: number;
  published?: number;
  inReview?: number;
  failed?: number;
  budgetStopped?: boolean;
  outcomes?: Array<{ keyword: string; status: string; score?: number; error?: string }>;
}

export function LastRun({
  run,
  usage,
  budget,
  prices,
}: {
  run: StoredRun | null;
  usage: StoredUsage;
  budget: BudgetState;
  prices: string;
}) {
  const cost = estimateCost(usage, prices);

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Last run</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {run?.finishedAt
              ? `Finished ${new Date(run.finishedAt).toLocaleString()}`
              : 'No run has been recorded yet.'}
          </p>
        </div>
        {run?.budgetStopped ? (
          <Badge tone="warn">Stopped on token cap</Badge>
        ) : null}
      </div>

      {run?.finishedAt ? (
        <dl className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Figure label="Topics found" value={run.ingested ?? 0} />
          <Figure label="Attempted" value={run.attempted ?? 0} />
          <Figure label="In review" value={run.inReview ?? 0} />
          <Figure label="Published" value={run.published ?? 0} />
          <Figure label="Failed" value={run.failed ?? 0} tone={run.failed ? 'danger' : undefined} />
        </dl>
      ) : null}

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {describeBudget(budget)}
          {/* Rendered only when rates are configured. A "0.00" would read as a
              fact rather than as "nobody told us the prices". */}
          {cost !== null ? <> · about {cost.toFixed(2)} spent today</> : null}
        </p>
        {budget.limit > 0 ? (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={budget.exhausted ? 'h-full bg-danger' : 'h-full bg-brand'}
              style={{ width: `${Math.min(100, (budget.spent / budget.limit) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>

      {run?.outcomes?.length ? (
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          {run.outcomes.map((outcome, index) => (
            <li key={`${outcome.keyword}-${index}`} className="truncate">
              <span
                className={
                  outcome.status === 'FAILED'
                    ? 'text-danger'
                    : outcome.status === 'PUBLISHED'
                      ? 'text-ok'
                      : ''
                }
              >
                {outcome.status.toLowerCase()}
              </span>
              {' · '}
              {outcome.keyword}
              {outcome.error ? ` — ${outcome.error}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'danger';
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`mt-1 text-2xl font-bold tabular-nums ${tone === 'danger' ? 'text-danger' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
