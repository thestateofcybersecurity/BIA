const isProd = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy, delivered report-only to start. Watch the browser
 * console (or wire a report-to endpoint) for a week, then rename the header
 * to Content-Security-Policy to enforce it.
 *
 * - script-src keeps 'unsafe-inline' because the App Router's hydration and
 *   streaming scripts are inline. A per-request nonce would need the proxy
 *   to rewrite request headers on every document, and the Neon Auth
 *   middleware builds that response itself, so the nonce route is not open
 *   here yet. 'unsafe-eval' is development only, for Turbopack source maps.
 * - Vercel Analytics loads its script and posts beacons same-origin in
 *   production (/_vercel/insights); the va.vercel-scripts.com and
 *   vitals.vercel-insights.com hosts cover the debug script and older SDKs.
 * - Fonts are self-hosted by next/font, so font-src needs only 'self'.
 * - connect-src adds ws:/wss: in development for hot reloading.
 * - frame-ancestors 'none' plus X-Frame-Options DENY cover clickjacking of
 *   the role picker and destructive buttons in every browser.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com${isProd ? '' : ' ws: wss:'}`,
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy-Report-Only', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // exceljs and its zip stack are server-only and reach for optional cloud
  // SDKs behind lazy requires the bundler cannot resolve. Loading them from
  // node_modules at runtime keeps code paths we never call out of the build.
  serverExternalPackages: ['exceljs', 'unzipper', 'archiver'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
