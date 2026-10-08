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
