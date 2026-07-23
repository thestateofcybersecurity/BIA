import type { Workspace } from '@/lib/domain/types';
import { emailEnabled, getResend, EMAIL_FROM } from './client';
import { getUserContact } from './recipients';
import type { EmailContent } from './templates';

export type NotificationKind = 'signOffRequests' | 'aarReady' | 'reviewReminders';

export function notificationsAllowed(ws: Workspace, kind: NotificationKind): boolean {
  return ws.notifications?.[kind] !== false;
}

/**
 * Send a notification to the workspace owner's account email. Failures are
 * logged and swallowed: an email problem must never break the action that
 * triggered it. Returns true when a send was actually made.
 */
export async function notifyWorkspaceUser(
  ws: Workspace,
  userId: string,
  kind: NotificationKind,
  content: EmailContent
): Promise<boolean> {
  if (!emailEnabled() || !notificationsAllowed(ws, kind)) return false;
  try {
    const contact = await getUserContact(userId);
    if (!contact) return false;
    const { error } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: contact.email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    if (error) {
      console.error('[email] send failed:', error.message ?? error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[email] send threw:', e instanceof Error ? e.message : e);
    return false;
  }
}
