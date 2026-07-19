import { createNeonAuth } from '@neondatabase/auth/next/server';

/**
 * Neon Auth (Managed Better Auth). Enabled when NEON_AUTH_BASE_URL (from the
 * Neon <-> Vercel integration) and NEON_AUTH_COOKIE_SECRET (generate with
 * `openssl rand -base64 32`) are present; otherwise the app runs in
 * single-workspace demo mode.
 */

export function authEnabled(): boolean {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);
}

type NeonAuth = ReturnType<typeof createNeonAuth>;

declare global {
  // eslint-disable-next-line no-var
  var _biaNeonAuth: NeonAuth | undefined;
}

export function getAuth(): NeonAuth {
  if (!globalThis._biaNeonAuth) {
    globalThis._biaNeonAuth = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      },
    });
  }
  return globalThis._biaNeonAuth;
}
