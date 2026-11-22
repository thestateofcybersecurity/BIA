import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  canonicalRedirectTarget,
  hasMalformedEncoding,
  isPublicPath,
  isSafeAuthProxyPath,
  SDK_SKIP_PREFIXES,
  slipsPastSdkMiddleware,
} from '@/lib/request-policy';

describe('isPublicPath', () => {
  it('exempts the documented public routes', () => {
    for (const path of [
      '/api/auth',
      '/api/auth/sign-in/email',
      '/api/health',
      '/api/cron/review-reminders',
      '/auth/sign-in',
      '/contribute',
      '/contribute/abc.def',
      '/invite/xyz',
      '/.well-known/security.txt',
      '/_vercel/insights/script.js',
      '/icon.svg',
      '/apple-icon.png',
      '/favicon.ico',
    ]) {
      expect(isPublicPath(path), path).toBe(true);
    }
  });

  it('does not let a longer name borrow a prefix exemption', () => {
    for (const path of [
      '/invitez',
      '/invite-admin',
      '/contributeXYZ',
      '/api/authz',
      '/api/auth2/anything',
      '/api/healthcheck',
      '/api/cronjobs',
      '/auth/sign-in-admin',
      '/.well-known-ish',
      '/_vercelish',
      '/icon.svg.bak',
      '/',
      '/assessments',
      '/api/report/pdf',
    ]) {
      expect(isPublicPath(path), path).toBe(false);
    }
  });
});

describe('canonicalRedirectTarget', () => {
  const canonicalUrl = 'https://bia.cybersecurityalphabetsoup.com';

  it('redirects a vercel.app alias to the canonical host, keeping path and query', () => {
    expect(
      canonicalRedirectTarget({
        host: 'bia-rho-fawn.vercel.app',
        pathname: '/assessments/abc',
        search: '?tab=2&x=y',
        canonicalUrl,
      })
    ).toBe('https://bia.cybersecurityalphabetsoup.com/assessments/abc?tab=2&x=y');
  });

  it('ignores a port and letter case on the request host', () => {
    expect(
      canonicalRedirectTarget({
        host: 'BIA-RHO-FAWN.vercel.app:443',
        pathname: '/',
        search: '',
        canonicalUrl,
      })
    ).toBe('https://bia.cybersecurityalphabetsoup.com/');
  });

  it('leaves the canonical host and unrelated hosts alone', () => {
    for (const host of ['bia.cybersecurityalphabetsoup.com', 'localhost:3000', 'example.com']) {
      expect(
        canonicalRedirectTarget({ host, pathname: '/', search: '', canonicalUrl }),
        host
      ).toBeNull();
    }
  });

  it('does nothing without a canonical URL, with a malformed one, or when the canonical host is itself vercel.app', () => {
    const base = { host: 'bia-rho-fawn.vercel.app', pathname: '/', search: '' };
    expect(canonicalRedirectTarget({ ...base, canonicalUrl: undefined })).toBeNull();
    expect(canonicalRedirectTarget({ ...base, canonicalUrl: 'not a url' })).toBeNull();
    expect(
      canonicalRedirectTarget({ ...base, canonicalUrl: 'https://bia-rho-fawn.vercel.app' })
    ).toBeNull();
    expect(canonicalRedirectTarget({ host: null, pathname: '/', search: '', canonicalUrl })).toBeNull();
  });

  it('exempts the cron and health routes that machines call by platform host', () => {
    for (const pathname of ['/api/cron/review-reminders', '/api/health']) {
      expect(
        canonicalRedirectTarget({ host: 'bia-rho-fawn.vercel.app', pathname, search: '', canonicalUrl }),
        pathname
      ).toBeNull();
    }
    expect(
      canonicalRedirectTarget({
        host: 'bia-rho-fawn.vercel.app',
        pathname: '/api/healthcheck',
        search: '',
        canonicalUrl,
      })
    ).toBe('https://bia.cybersecurityalphabetsoup.com/api/healthcheck');
  });
});

describe('slipsPastSdkMiddleware', () => {
  it('flags names that only start like a route the SDK middleware skips', () => {
    for (const path of [
      '/api/authz',
      '/api/auth2/anything',
      '/auth/sign-in-admin',
      '/auth/sign-up',
      '/auth/callback',
      '/auth/callbacks/x',
      '/auth/magic-link',
      '/auth/email-otp/verify',
      '/auth/forgot-password',
    ]) {
      expect(slipsPastSdkMiddleware(path), path).toBe(true);
    }
  });

  it('leaves the real public routes and ordinary protected routes alone', () => {
    for (const path of [
      '/api/auth',
      '/api/auth/sign-in/email',
      '/auth/sign-in',
      '/',
      '/assessments',
      '/team',
      '/api/report/pdf',
      '/API/AUTHZ',
    ]) {
      expect(slipsPastSdkMiddleware(path), path).toBe(false);
    }
  });

  it('lists exactly the prefixes the installed SDK skips', () => {
    // Read the SDK source rather than import it: if an upgrade adds a skip
    // route, this fails and the list above has to follow.
    const require = createRequire(import.meta.url);
    const entry = require.resolve('@neondatabase/auth/next/server');
    const source = readFileSync(entry, 'utf8');
    const block = /const SKIP_ROUTES = \[([^\]]*)\]/.exec(source);
    expect(block, 'SKIP_ROUTES in the SDK').not.toBeNull();
    const sdk = [...block![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
    expect([...SDK_SKIP_PREFIXES].sort()).toEqual(sdk);
  });
});

describe('hasMalformedEncoding', () => {
  it('flags percent sequences that do not decode', () => {
    for (const path of ['/invite/%ff', '/contribute/%E0%A4%A', '/invite/%', '/x/%zz']) {
      expect(hasMalformedEncoding(path), path).toBe(true);
    }
  });

  it('accepts ordinary and correctly encoded paths', () => {
    for (const path of ['/', '/invite/abc', '/contribute/a%2Eb', '/invite/%25E0%25A4%25A', '/x/%E2%9C%93']) {
      expect(hasMalformedEncoding(path), path).toBe(false);
    }
  });
});

describe('isSafeAuthProxyPath', () => {
  it('accepts the endpoints the auth client calls', () => {
    for (const path of [
      ['get-session'],
      ['sign-in', 'email'],
      ['sign-up', 'email'],
      ['sign-out'],
      ['callback', 'google'],
      ['reset-password', 'aB3_-tokenValue'],
      ['token', 'anonymous'],
    ]) {
      expect(isSafeAuthProxyPath(path), path.join('/')).toBe(true);
    }
  });

  it('refuses segments that would leave the base path or splice the URL', () => {
    for (const path of [
      [],
      ['..'],
      ['.', 'get-session'],
      ['../../escape'],
      ['x', '../../../other-db/auth/admin/list-users'],
      ['..\\..\\escape'],
      ['sign-in', 'email?a=b'],
      ['sign-in', 'email#frag'],
      ['//evil.example', 'x'],
      ['', 'get-session'],
      ['%2e%2e'],
      ['a b'],
      ['x'.repeat(300)],
      Array(9).fill('a'),
    ]) {
      expect(isSafeAuthProxyPath(path), JSON.stringify(path).slice(0, 60)).toBe(false);
    }
    expect(isSafeAuthProxyPath('get-session')).toBe(false);
    expect(isSafeAuthProxyPath([['get-session']])).toBe(false);
  });
});
