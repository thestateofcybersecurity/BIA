import type { NotificationKind, Workspace } from '@/lib/domain/types';
import { claimSlot } from '@/lib/data/rate-limit';
import { emailEnabled, getResend, EMAIL_FROM } from './client';
import { getUserContact } from './recipients';
import { DAY_MS, emailDailyCap, type SendFailure } from './policy';
import type { EmailContent } from './templates';

export type { NotificationKind };
export type { SendFailure };

/**
 * Who caused the send. A signed-in member must have a verified address;
 * 'system' is the scheduled job, which is authenticated by its own secret
 * and acts for nobody in particular.
 */
export type Sender = { emailVerified: boolean } | 'system';

export type SendResult = { ok: true } | { ok: false; reason: SendFailure };

/**
 * The one place the app hands mail to the provider. Every send, whatever
 * triggered it, passes through here so the policy cannot be skipped by a
 * new feature: the sender's address must be verified, and the organization
 * gets EMAIL_DAILY_CAP sends per rolling day (default 50), counted in the
 * database so the cap holds across serverless instances. Failures are
 * returned, never thrown: an email problem must not break the action that
 * triggered it.
 */
export async function sendOrgEmail(args: {
  orgId: string;
  to: string;
  content: EmailContent;
  sender: Sender;
}): Promise<SendResult> {
  if (!emailEnabled()) return { ok: false, reason: 'disabled' };
  if (args.sender !== 'system' && !args.sender.emailVerified) {
    return { ok: false, reason: 'unverified' };
  }
  try {
    const allowed = await claimSlot(`email:${args.orgId}`, emailDailyCap(), DAY_MS);
    if (!allowed) {
      console.warn(`[email] daily cap reached for organization ${args.orgId}; send refused`);
      return { ok: false, reason: 'capped' };
    }
    const { error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: args.to,
      subject: args.content.subject,
      html: args.content.html,
      text: args.content.text,
    });
    if (error) {
      console.error('[email] send failed:', error.message ?? error);
      return { ok: false, reason: 'failed' };
    }
    return { ok: true };
  } catch (e) {
    console.error('[email] send threw:', e instanceof Error ? e.message : e);
    return { ok: false, reason: 'failed' };
  }
}

export function notificationsAllowed(ws: Workspace, kind: NotificationKind): boolean {
  return ws.notifications?.[kind] !== false;
}

/** The individual recipient has not muted this category for themselves. */
function userAllows(ws: Workspace, userId: string, kind: NotificationKind): boolean {
  return ws.emailOptOuts?.[userId]?.[kind] !== false;
}

/**
 * Send a notification to a workspace member's account email, honoring the
 * organization's toggles and the member's own mutes. Returns true when a
 * send was actually made.
 */
export async function notifyWorkspaceUser(args: {
  orgId: string;
  ws: Workspace;
  userId: string;
  kind: NotificationKind;
  content: EmailContent;
  sender: Sender;
}): Promise<boolean> {
  const { orgId, ws, userId, kind, content, sender } = args;
  if (!emailEnabled() || !notificationsAllowed(ws, kind) || !userAllows(ws, userId, kind)) {
    return false;
  }
  const contact = await getUserContact(userId).catch(() => null);
  if (!contact) return false;
  const result = await sendOrgEmail({ orgId, to: contact.email, content, sender });
  return result.ok;
}
