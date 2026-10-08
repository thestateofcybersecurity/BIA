import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

type Header = { key: string; value: string };
type NextConfig = {
  poweredByHeader?: boolean;
  headers?: () => Promise<{ source: string; headers: Header[] }[]>;
};

async function loadHeaders(): Promise<Map<string, string>> {
  const config = require('../next.config.js') as NextConfig;
  const rules = await config.headers!();
  const all = rules.find((r) => r.source === '/:path*');
  expect(all, 'a catch-all header rule').toBeDefined();
  return new Map(all!.headers.map((h) => [h.key, h.value]));
}

describe('next.config.js security headers', () => {
  it('hides the framework banner', () => {
    const config = require('../next.config.js') as NextConfig;
    expect(config.poweredByHeader).toBe(false);
  });

  it('sets the clickjacking, sniffing, referrer, permissions, and HSTS headers on every route', async () => {
    const headers = await loadHeaders();
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
    expect(headers.get('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains; preload'
    );
  });

  it('ships a report-only CSP that forbids framing, plugins, and foreign form targets', async () => {
    const headers = await loadHeaders();
    const csp = headers.get('Content-Security-Policy-Report-Only');
    expect(csp).toBeDefined();
    expect(headers.has('Content-Security-Policy')).toBe(false);
    const directives = new Map(
      csp!.split(';').map((d) => {
        const [name, ...rest] = d.trim().split(/\s+/);
        return [name, rest.join(' ')];
      })
    );
    expect(directives.get("default-src")).toBe("'self'");
    expect(directives.get('frame-ancestors')).toBe("'none'");
    expect(directives.get('base-uri')).toBe("'self'");
    expect(directives.get('form-action')).toBe("'self'");
    expect(directives.get('object-src')).toBe("'none'");
    expect(directives.get('img-src')).toBe("'self' data: blob:");
    expect(directives.get('font-src')).toBe("'self'");
    expect(directives.get('script-src')).toContain("'self'");
    expect(directives.get('connect-src')).toContain("'self'");
  });
});
