'use client';

import { useState, useTransition } from 'react';
import { Loader2, Play } from 'lucide-react';
import { triggerPipeline } from '@/lib/admin/actions';
import type { PipelineRunResult } from '@/pipeline/run';
import { Button } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

/**
 * "Run pipeline now". A run makes paid API calls and takes minutes, so the
 * button asks for confirmation, disables itself while in flight, and shows the
 * run log afterwards instead of leaving the operator guessing.
 */
export function RunPipelineButton({ disabled }: { disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PipelineRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const run = () => {
    setConfirming(false);
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await triggerPipeline());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The run failed.');
      }
    });
  };

  return (
    <div>
      {confirming ? (
        <div className="surface flex flex-wrap items-center gap-3 p-4">
          <p className="text-sm">
            This makes paid API calls and can take several minutes. Continue?
          </p>
          <Button onClick={run} size="sm">
            Yes, run it
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button onClick={() => setConfirming(true)} disabled={pending || disabled}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {pending ? 'Running…' : 'Run pipeline now'}
        </Button>
      )}

      {disabled ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Set OPENAI_API_KEY in .env to enable generation.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="surface mt-4 p-4" aria-live="polite">
          <p className="text-sm font-medium">
            {result.published} published · {result.inReview} in review · {result.failed} failed ·{' '}
            {result.ingested} new keywords
          </p>

          {result.outcomes.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {result.outcomes.map((outcome) => (
                <li key={outcome.keyword} className="flex flex-wrap items-baseline gap-2">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 font-mono text-[10px] uppercase',
                      outcome.status === 'PUBLISHED' && 'bg-ok/15 text-ok',
                      outcome.status === 'REVIEW' && 'bg-warn/15 text-warn',
                      outcome.status === 'FAILED' && 'bg-danger/15 text-danger',
                    )}
                  >
                    {outcome.status}
                  </span>
                  <span>{outcome.keyword}</span>
                  <span className="text-xs text-muted-foreground">
                    {outcome.error ??
                      `score ${outcome.score}${outcome.blocked ? ' · blocked on identifiers' : ''}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-muted-foreground">Run log</summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
              {result.logs.map((line) => `${line.level.toUpperCase()} ${line.message}`).join('\n')}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}
