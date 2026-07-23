import { getStore } from '@/lib/data/store';
import { isAssessmentComplete, isReviewDue } from '@/lib/domain/scoring';
import { emailEnabled } from '@/lib/email/client';
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
  const userIds = await store.listUserIds();
  let sent = 0;
  let skippedPrefs = 0;
  let nothingDue = 0;
  let noContact = 0;

  for (const userId of userIds) {
    const ws = await store.load(userId);
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
    const ok = await notifyWorkspaceUser(
      ws,
      userId,
      'reviewReminders',
      reviewReminderEmail({
        orgName: ws.org?.name ?? 'your organization',
        reviewDue,
        awaitingSignOff,
      })
    );
    if (ok) sent++;
    else noContact++;
  }

  return Response.json({
    ok: true,
    workspaces: userIds.length,
    sent,
    nothingDue,
    skippedPrefs,
    unresolvedOrFailed: noContact,
  });
}
