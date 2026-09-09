import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, isAuthConfigured, verifySessionToken } from '@/lib/auth';

/**
 * Gate on /admin.
 *
 * Runs before the route, so an unauthenticated request never reaches a page, a
 * server action, or the database. Server actions POST back to the path they
 * were rendered on, which means every admin mutation passes through here too —
 * though the actions carry their own `requireAdmin()` check as well, because a
 * single gate that everything depends on is a single gate to get wrong.
 *
 * With ADMIN_PASSWORD unset the admin is **closed**, not open. The alternative —
 * "no password configured, so let everyone in" — is how an unguarded admin ends
 * up on a public host.
 */
export const config = {
  // Everything under /admin, and nothing else. The public site is unaffected,
  // so no crawler or reader pays the cost of this check.
  matcher: ['/admin/:path*'],
};

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The login page itself has to stay reachable, or there is no way in.
  // /login lives outside /admin so it is not matched here at all — see config.

  if (!isAuthConfigured()) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '?reason=unconfigured';
    return NextResponse.redirect(url);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  // Send them back where they were aiming once they are in.
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}
