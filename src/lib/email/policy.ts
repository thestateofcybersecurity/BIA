/**
 * Pure rules for outbound email: who may trigger a send, how many an
 * organization gets per day, and which addresses a coordinator may redirect
 * an assessment request to. Kept free of I/O so they can be tested.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Sends per organization per rolling day when EMAIL_DAILY_CAP is unset. */
export const DEFAULT_EMAIL_DAILY_CAP = 50;

export function emailDailyCap(raw: string | undefined = process.env.EMAIL_DAILY_CAP): number {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_EMAIL_DAILY_CAP;
}

export type SendFailure = 'disabled' | 'unverified' | 'capped' | 'failed';

/** Wording for the person whose action would have sent the email. */
export const SEND_FAILURE_MESSAGES: Record<SendFailure, string> = {
  disabled: 'Email is not configured, so nothing was sent.',
  unverified: 'Verify your own email address before the app will send email on your behalf.',
  capped:
    'This organization has reached its daily email limit, so nothing was sent. Try again tomorrow.',
  failed: 'The email could not be delivered.',
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Whether a coordinator may send an assessment request to `address` instead
 * of the process's recorded owner. Only addresses the organization already
 * knows qualify: a current member, or the owner on record. Anything else
 * would turn the request flow into a way to mail strangers from the app's
 * domain with workspace text in the body.
 */
export function overrideAllowed(
  address: string,
  known: { ownerEmail?: string | null; memberEmails: Iterable<string> }
): boolean {
  const target = normalizeEmail(address);
  if (!target) return false;
  if (known.ownerEmail && normalizeEmail(known.ownerEmail) === target) return true;
  for (const email of known.memberEmails) {
    if (normalizeEmail(email) === target) return true;
  }
  return false;
}
