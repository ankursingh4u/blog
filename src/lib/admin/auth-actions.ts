'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isAuthConfigured,
  passwordMatches,
} from '@/lib/auth';

/**
 * Sign in and out of /admin.
 *
 * Kept apart from `actions.ts` so the guard those actions call cannot end up
 * importing the thing it guards.
 */

export interface AuthState {
  ok: boolean;
  message: string;
}

/**
 * Attempt throttling.
 *
 * A single shared password is precisely the thing worth brute-forcing, and the
 * login endpoint is public. This is in-process, so on serverless it is per
 * instance rather than global — partial cover, but it turns an unlimited
 * guessing rate into a slow one, and the alternative of no limit at all is
 * worse. A shared store (Redis, or a table) is the upgrade if the admin ever
 * faces real traffic.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; firstAt: number }>();

function throttle(key: string): { allowed: boolean; retryInMinutes: number } {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return { allowed: true, retryInMinutes: 0 };
  }

  record.count += 1;
  if (record.count > MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryInMinutes: Math.max(1, Math.ceil((WINDOW_MS - (now - record.firstAt)) / 60000)),
    };
  }
  return { allowed: true, retryInMinutes: 0 };
}

const LoginInput = z.object({
  password: z.string().min(1, 'Enter the password.'),
  next: z.string().optional(),
});

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isAuthConfigured()) {
    return {
      ok: false,
      message: 'ADMIN_PASSWORD is not set in .env, so there is nothing to sign in against.',
    };
  }

  const parsed = LoginInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: 'Enter the password.' };

  // One bucket: there is one account, so per-account and global are the same
  // thing. Keying on IP would let an attacker with a pool of addresses around
  // it, and would lock out a whole office behind one NAT.
  const gate = throttle('admin');
  if (!gate.allowed) {
    return {
      ok: false,
      message: `Too many attempts. Try again in ${gate.retryInMinutes} minute(s).`,
    };
  }

  if (!(await passwordMatches(parsed.data.password))) {
    // Deliberately vague: confirming which part was wrong helps nobody but an
    // attacker, and there is only one field anyway.
    return { ok: false, message: 'That password is not right.' };
  }

  attempts.delete('admin');

  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    // Not readable from JavaScript, not sent cross-site, and HTTPS-only once
    // deployed — locally there is no certificate, so secure would break it.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  // Only ever redirect within this site: `next` arrives from a query string,
  // and following it blindly turns the login into an open redirect.
  const target = parsed.data.next;
  const safe = target && target.startsWith('/') && !target.startsWith('//') ? target : '/admin';
  redirect(safe);
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}
