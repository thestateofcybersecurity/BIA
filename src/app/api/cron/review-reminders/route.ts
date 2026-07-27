import { getStore } from '@/lib/data/store';
import { isAssessmentComplete, isReviewDue } from '@/lib/domain/scoring';
import { emailEnabled } from '@/lib/email/client';
import { listMembers } from '@/lib/data/tenancy';
import { can } from '@/lib/domain/authz';
import { notifyWorkspaceUser, notificationsAllowed } from '@/lib/email/send';
import { reviewReminderEmail } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Weekly housekeeping email (Vercel Cron, see vercel.json): per workspace,
 * assessments past the 12-month review cadence plus complete-but-unsigned
 * assessments. Fails closed without CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!emailEnabled()) {
    return Response.json({ ok: false, reason: 'RESEND_API_KEY not configured' });
  }

  const store = getStore();
  const orgIds = await store.listOrgIds();
  let sent = 0;
  let skippedPrefs = 0;
  let nothingDue = 0;
  let noContact = 0;

  for (const orgId of orgIds) {
    const ws = await store.load(orgId);
    if (!notificationsAllowed(ws, 'reviewReminders')) {
      skippedPrefs++;
      continue;
    }
    const nameOf = (id: string) => ws.processes.find((p) => p.id === id)?.name ?? id;
    const reviewDue = ws.assessments.filter((a) => isReviewDue(a)).map((a) => nameOf(a.processId));
    const awaitingSignOff = ws.assessments
      .filter((a) => isAssessmentComplete(a) && !a.approvedBy)
      .map((a) => nameOf(a.processId));

    if (reviewDue.length === 0 && awaitingSignOff.length === 0) {
      nothingDue++;
      continue;
    }
    // Reminders go to the people who can act on them, not to whoever
    // happened to create the workspace.
    const recipients = (await listMembers(orgId)).filter((m) =>
      can(m.role, 'objectives:write')
    );
    const content = reviewReminderEmail({
      orgName: ws.org?.name ?? 'your organization',
      reviewDue,
      awaitingSignOff,
    });
    let delivered = 0;
    for (const member of recipients) {
      if (await notifyWorkspaceUser(ws, member.userId, 'reviewReminders', content)) {
        delivered++;
      }
    }
    if (delivered > 0) sent++;
    else noContact++;
  }

  return Response.json({
    ok: true,
    workspaces: orgIds.length,
    sent,
    nothingDue,
    skippedPrefs,
    unresolvedOrFailed: noContact,
  });
}
