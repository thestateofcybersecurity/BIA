import { Resend } from 'resend';

/**
 * App notification email via Resend. Enabled when RESEND_API_KEY is set;
 * without it every send becomes a silent no-op, so demo mode and local dev
 * work unchanged. Auth emails (verification, reset) are separate: Neon
 * Auth's managed service sends those.
 */

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export const EMAIL_FROM =
  process.env.EMAIL_FROM || 'BIA <bia@cybersecurityalphabetsoup.com>';

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://bia.cybersecurityalphabetsoup.com';

declare global {
  // eslint-disable-next-line no-var
  var _biaResend: Resend | undefined;
}

export function getResend(): Resend {
  if (!globalThis._biaResend) {
    globalThis._biaResend = new Resend(process.env.RESEND_API_KEY);
  }
  return globalThis._biaResend;
}
