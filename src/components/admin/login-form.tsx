'use client';

import { useActionState } from 'react';
import { LogIn } from 'lucide-react';
import { signIn, type AuthState } from '@/lib/admin/auth-actions';
import { SubmitButton } from '@/components/admin/form-controls';

const INITIAL: AuthState = { ok: false, message: '' };

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, INITIAL);

  return (
    <form action={action} className="mt-6 space-y-4">
      {/* Carried through so a bookmarked deep link survives the login. The
          action only follows it if it is a same-site path. */}
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      {state.message ? (
        <p aria-live="polite" className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <SubmitButton size="md" className="w-full">
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Sign in
      </SubmitButton>
    </form>
  );
}
