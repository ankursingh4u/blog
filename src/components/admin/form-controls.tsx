'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { buttonClass } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import type { ActionState } from '@/lib/admin/actions';

export const EMPTY_STATE: ActionState = { ok: false, message: '' };

export function SubmitButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  formAction,
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      formAction={formAction}
      name={name}
      value={value}
      className={buttonClass(variant, size, className)}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** Action result banner. `aria-live` so screen readers hear the outcome. */
export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={cn(
        'rounded-md border p-3 text-sm',
        state.ok
          ? 'border-ok/30 bg-ok/10 text-ok'
          : 'border-danger/30 bg-danger/10 text-danger',
      )}
    >
      {state.message}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand';

export const textareaClass = `${inputClass} font-mono leading-relaxed`;

/** Live character counter against an SEO limit. */
export function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={cn('text-xs tabular-nums', over ? 'text-danger' : 'text-muted-foreground')}>
      {value.length}/{max}
    </span>
  );
}
