import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createSessionToken,
  isAuthConfigured,
  passwordMatches,
  verifySessionToken,
} from '../src/lib/auth';

/**
 * The session cookie is the only thing standing between the open internet and
 * every write in the admin, so the cases that matter are the adversarial ones:
 * a forged value, a tampered expiry, a token minted under a different password.
 */
const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env.ADMIN_PASSWORD = 'correct horse battery staple';
  delete process.env.AUTH_SECRET;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('isAuthConfigured', () => {
  it('is false when no password is set, so the admin closes rather than opens', () => {
    delete process.env.ADMIN_PASSWORD;
    expect(isAuthConfigured()).toBe(false);
  });

  it('treats whitespace as unset', () => {
    process.env.ADMIN_PASSWORD = '   ';
    expect(isAuthConfigured()).toBe(false);
  });
});

describe('passwordMatches', () => {
  it('accepts the configured password', async () => {
    await expect(passwordMatches('correct horse battery staple')).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    await expect(passwordMatches('Correct Horse Battery Staple')).resolves.toBe(false);
    await expect(passwordMatches('correct horse battery stapl')).resolves.toBe(false);
    await expect(passwordMatches('')).resolves.toBe(false);
  });

  // The dangerous default: no password configured must not mean "let anyone in".
  it('rejects everything when no password is configured', async () => {
    delete process.env.ADMIN_PASSWORD;
    await expect(passwordMatches('')).resolves.toBe(false);
    await expect(passwordMatches('anything')).resolves.toBe(false);
  });
});

describe('session tokens', () => {
  it('accepts a token it just issued', async () => {
    await expect(verifySessionToken(await createSessionToken())).resolves.toBe(true);
  });

  it('rejects nothing at all', async () => {
    await expect(verifySessionToken(undefined)).resolves.toBe(false);
    await expect(verifySessionToken('')).resolves.toBe(false);
  });

  it('rejects a value with no signature', async () => {
    await expect(verifySessionToken('admin')).resolves.toBe(false);
    await expect(verifySessionToken('true')).resolves.toBe(false);
    await expect(verifySessionToken(String(Date.now() + 10_000))).resolves.toBe(false);
  });

  it('rejects a made-up signature', async () => {
    const expiry = Date.now() + 60_000;
    await expect(verifySessionToken(`${expiry}.notarealsignature`)).resolves.toBe(false);
  });

  // Extending your own session by editing the cookie is the obvious attack on
  // a signed token, and the signature covers the expiry precisely to stop it.
  it('rejects an expiry that has been extended', async () => {
    const token = await createSessionToken();
    const [, signature] = token.split('.');
    const extended = `${Date.now() + 999_999_999}.${signature}`;
    await expect(verifySessionToken(extended)).resolves.toBe(false);
  });

  it('rejects a token that has expired', async () => {
    // Issued far enough in the past that its 12-hour life is over.
    const stale = await createSessionToken(Date.now() - 13 * 60 * 60 * 1000);
    await expect(verifySessionToken(stale)).resolves.toBe(false);
  });

  it('rejects a token signed under a different password', async () => {
    const token = await createSessionToken();
    process.env.ADMIN_PASSWORD = 'a different password';
    await expect(verifySessionToken(token)).resolves.toBe(false);
  });

  it('prefers AUTH_SECRET, so changing the password keeps sessions alive', async () => {
    process.env.AUTH_SECRET = 'a stable signing secret';
    const token = await createSessionToken();
    process.env.ADMIN_PASSWORD = 'rotated password';
    await expect(verifySessionToken(token)).resolves.toBe(true);
  });
});
