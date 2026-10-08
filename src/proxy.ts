import { NextResponse, type NextRequest } from 'next/server';
import { authEnabled, getAuth } from '@/lib/neon-auth';
import { canonicalRedirectTarget, isPublicPath } from '@/lib/request-policy';

/**
 * Runs before every request that is not a static asset.
 *
 * 1. Requests that reach the deployment through its `*.vercel.app` alias are
 *    sent to the canonical host with a 308, so nobody can sidestep the
 *    Cloudflare layer in front of it. Needs NEXT_PUBLIC_APP_URL.
 * 2. Neon Auth session refresh must happen here: the session cookie cache has
 *    a short TTL, and refreshing it requires a cookie write, which Next.js
 *    only allows in the proxy, server actions, and route handlers. Without
 *    this, the first page render after cache expiry throws "Cookies can only
 *    be modified in a Server Action or Route Handler". The same call
 *    redirects unauthenticated page requests to sign-in.
 *
 * The public exemptions live in request-policy.ts, anchored per path
 * segment, rather than as prefixes in the matcher. /contribute is public on
 * purpose: those pages authenticate with a signed, expiring, revocable token
 * in the URL rather than a session, so that an invited process owner can
 * complete one assessment without an account. /invite is public so an
 * invitation can be read before signing in; the accept action itself still
 * requires a session and a matching, verified address.
 */
export default function proxy(request: NextRequest) {
  const target = canonicalRedirectTarget({
    host: request.headers.get('host'),
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    canonicalUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (target) return NextResponse.redirect(target, 308);

  if (!authEnabled()) return;
  // Server actions handle auth themselves; intercepting them breaks POSTs.
  if (request.headers.has('Next-Action')) return;
  if (isPublicPath(request.nextUrl.pathname)) return;
  return getAuth().middleware({ loginUrl: '/auth/sign-in' })(request);
}

export const config = {
  // Everything except Next's own static and image routes. The public-path
  // decisions are made in code above, where they can be anchored and tested.
  matcher: ['/((?!_next/).*)'],
};
