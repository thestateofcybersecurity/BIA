/**
 * Pure request rules shared by the proxy and its tests. Kept free of Next
 * imports so the policy can be exercised without a request object.
 */

/**
 * Paths the proxy leaves unauthenticated. Each pattern is anchored to a
 * whole path segment: `/invite` covers `/invite` and `/invite/abc` but not
 * `/invitez`, so adding a route whose name merely starts with one of these
 * cannot silently inherit its exemption.
 *
 * - /api/auth: the Neon Auth handler, self-authenticating.
 * - /api/health and /api/cron: token-gated inside the route.
 * - /auth/sign-in: the sign-in page.
 * - /contribute and /invite: token-gated public pages.
 * - /.well-known: security.txt and similar discovery files.
 * - /_vercel: Vercel's analytics beacon and script.
 * - the three icons served from the app directory.
 */
const PUBLIC_PATHS: RegExp[] = [
  /^\/api\/auth(?:\/|$)/,
  /^\/api\/health$/,
  /^\/api\/cron(?:\/|$)/,
  /^\/auth\/sign-in(?:\/|$)/,
  /^\/contribute(?:\/|$)/,
  /^\/invite(?:\/|$)/,
  /^\/\.well-known(?:\/|$)/,
  /^\/_vercel(?:\/|$)/,
  /^\/(?:icon\.svg|apple-icon\.png|favicon\.ico)$/,
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((pattern) => pattern.test(pathname));
}

/**
 * Whether the catch-all segments of /api/auth/[...path] name an endpoint
 * under the auth base path. The Neon Auth handler joins them onto its base
 * URL as they arrive, and the router has already percent-decoded them, so a
 * segment such as "..%2F..%2Fother" would walk the upstream request out of
 * the base path, and an encoded "?" would splice a query string into it.
 * Each segment must be a plain path label; anything else is not forwarded.
 */
const AUTH_PATH_SEGMENT = /^[A-Za-z0-9_-][A-Za-z0-9._~-]*$/;

export function isSafeAuthProxyPath(segments: unknown): segments is string[] {
  return (
    Array.isArray(segments) &&
    segments.length > 0 &&
    segments.length <= 8 &&
    segments.every((s) => typeof s === 'string' && s.length <= 256 && AUTH_PATH_SEGMENT.test(s))
  );
}

/**
 * A path with a percent sequence that does not decode (a lone "%ff", a
 * truncated multi-byte character). The router throws on such a path when it
 * fills a dynamic segment, which surfaces as a 500 on the public token
 * pages; the proxy answers 400 instead.
 */
export function hasMalformedEncoding(pathname: string): boolean {
  if (!pathname.includes('%')) return false;
  try {
    decodeURIComponent(pathname);
    return false;
  } catch {
    return true;
  }
}

/**
 * Path prefixes the Neon Auth middleware lets through without a session.
 * It matches them with a plain startsWith (see SKIP_ROUTES and the loginUrl
 * check in @neondatabase/auth), so `/api/authz` or `/auth/sign-in-admin`
 * would skip the session check there even though isPublicPath above does
 * not list them. Kept in step with the SDK by tests/request-policy.test.ts.
 */
export const SDK_SKIP_PREFIXES = [
  '/api/auth',
  '/auth/callback',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/magic-link',
  '/auth/email-otp',
  '/auth/forgot-password',
];

/**
 * True for a path the SDK middleware would wave through although this
 * policy does not make it public. The proxy turns such a request away
 * itself, so no route can become reachable without a session just because
 * its name starts like one of the SDK's own.
 */
export function slipsPastSdkMiddleware(pathname: string): boolean {
  if (isPublicPath(pathname)) return false;
  return SDK_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Machine callers that may legitimately reach the deployment by its
 * vercel.app name: Vercel Cron invokes the production deployment directly,
 * and uptime checks are often pointed at the platform host. Redirecting
 * them would break the job or the check without protecting anything.
 */
const REDIRECT_EXEMPT: RegExp[] = [/^\/api\/cron(?:\/|$)/, /^\/api\/health$/];

/**
 * Where a request that arrived on a `*.vercel.app` alias should be sent so
 * that every visitor goes through the canonical host (and the Cloudflare
 * protections in front of it). Returns null when no redirect applies: the
 * host is already canonical, no canonical URL is configured, or the path
 * is one a machine caller uses.
 */
export function canonicalRedirectTarget(args: {
  host: string | null | undefined;
  pathname: string;
  search: string;
  canonicalUrl: string | undefined;
}): string | null {
  const { host, pathname, search, canonicalUrl } = args;
  if (!host || !canonicalUrl) return null;
  const hostname = host.split(':')[0].toLowerCase();
  if (!hostname.endsWith('.vercel.app')) return null;

  let canonical: URL;
  try {
    canonical = new URL(canonicalUrl);
  } catch {
    return null;
  }
  const canonicalHost = canonical.hostname.toLowerCase();
  if (canonicalHost === hostname || canonicalHost.endsWith('.vercel.app')) return null;
  if (REDIRECT_EXEMPT.some((pattern) => pattern.test(pathname))) return null;

  return `${canonical.origin}${pathname}${search}`;
}
