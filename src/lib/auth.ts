/**
 * Single-password authentication for /admin.
 *
 * Deliberately small: one shared password, no user table, no library. What it
 * does have to get right is the session, because a cookie that merely says
 * `admin=true` is forgeable by anyone who opens devtools.
 *
 * The cookie holds `expiry.signature`, where the signature is an HMAC over the
 * expiry using a key derived from the password (or `AUTH_SECRET` if set). Two
 * consequences worth knowing:
 *
 *   - The value cannot be forged without the key, so tampering with the expiry
 *     invalidates it.
 *   - Changing the password changes the key, which signs every existing session
 *     out. That is the behaviour you want from a password change.
 *
 * Everything uses Web Crypto rather than `node:crypto` so the same code runs in
 * middleware, which executes on the Edge runtime where `node:crypto` is absent.
 */

export const SESSION_COOKIE = 'fixdesk_admin';
const SESSION_HOURS = 12;
/** Fixed salt so the derived key is not just SHA-256 of the password. */
const KEY_SALT = 'fixdesk.admin.session.v1';

const encoder = new TextEncoder();

export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

async function signingKey(): Promise<CryptoKey> {
  // AUTH_SECRET is preferred; falling back to the password keeps local setup to
  // a single variable, at the cost of tying session validity to it.
  const material = process.env.AUTH_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || '';
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(KEY_SALT + material));
  return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(payload: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await signingKey(), encoder.encode(payload));
  return toBase64Url(signature);
}

/**
 * Compares two strings without leaking their difference through timing.
 *
 * Both sides are hashed first, so the comparison always runs over 32 bytes and
 * the length of the submitted password tells an attacker nothing.
 */
async function equalsConstantTime(a: string, b: string): Promise<boolean> {
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.min(x.length, y.length); i += 1) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function passwordMatches(candidate: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  // No password configured means no way in — never treat it as "anything goes".
  if (!expected) return false;
  return equalsConstantTime(candidate, expected);
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const expiry = now + SESSION_HOURS * 60 * 60 * 1000;
  return `${expiry}.${await sign(String(expiry))}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return false;

  const expiry = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  // Verify after the expiry check so an expired token costs no crypto work,
  // but still compare in constant time so a near-miss signature is not
  // distinguishable from a wild one.
  return equalsConstantTime(await sign(expiry), signature);
}

export const SESSION_MAX_AGE_SECONDS = SESSION_HOURS * 60 * 60;
