import { describe, expect, it } from 'vitest';
import { canonicalRedirectTarget, isPublicPath } from '@/lib/request-policy';

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
