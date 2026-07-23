import type { NextRequest } from 'next/server';
import { authEnabled, getAuth } from '@/lib/neon-auth';

/**
 * Neon Auth session refresh must happen here: the session cookie cache has a
 * short TTL, and refreshing it requires a cookie write, which Next.js only
 * allows in middleware, server actions, and route handlers. Without this,
 * the first page render after cache expiry throws
 * "Cookies can only be modified in a Server Action or Route Handler".
 * Also redirects unauthenticated page requests to sign-in.
 */
export default function proxy(request: NextRequest) {
  if (!authEnabled()) return;
  // Server actions handle auth themselves; intercepting them breaks POSTs.
  if (request.headers.has('Next-Action')) return;
  return getAuth().middleware({ loginUrl: '/auth/sign-in' })(request);
}

export const config = {
  matcher: [
    '/((?!_next|api/auth|api/health|api/cron|auth/sign-in|icon.svg|apple-icon.png|favicon.ico).*)',
  ],
};
