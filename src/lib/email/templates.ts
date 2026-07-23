import { APP_URL } from './client';

/** Branded notification templates: subject + HTML + plain text. */

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const INK = '#1b2430';
const ACCENT = '#bc4a1b';
const PAPER = '#f5f2ea';
const SOFT = '#3d4756';

function shell(title: string, bodyHtml: string, cta?: { label: string; href: string }): string {
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr><td style="background:${INK};border-radius:6px"><a href="${cta.href}" style="display:inline-block;padding:10px 18px;color:#ffffff;font-size:14px;text-decoration:none;font-family:Helvetica,Arial,sans-serif">${cta.label}</a></td></tr></table>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:0;background:${PAPER}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2ddd0;border-radius:8px;overflow:hidden">
        <tr><td style="background:${INK};padding:14px 28px;border-bottom:3px solid ${ACCENT}">
          <span style="color:#ffffff;font-family:Georgia,serif;font-size:18px;font-weight:bold">BIA</span>
          <span style="color:#9aa1ac;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-left:10px">Business Impact Assessment</span>
        </td></tr>
        <tr><td style="padding:26px 28px;font-family:Helvetica,Arial,sans-serif">
          <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:20px;color:${INK}">${title}</h1>
          <div style="font-size:14px;line-height:1.55;color:${SOFT}">${bodyHtml}</div>
          ${button}
        </td></tr>
        <tr><td style="padding:14px 28px;border-top:1px solid #e2ddd0">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#9aa1ac">
            Sent by your BIA workspace. Notification preferences are on the
            <a href="${APP_URL}/organization" style="color:${ACCENT}">Organization page</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function signOffRequestEmail(args: {
  processName: string;
  owner: string;
}): EmailContent {
  const title = 'Assessment ready for sign-off';
  const body = `The impact assessment for <strong>${args.processName}</strong> is complete and awaiting owner approval${args.owner ? ` from <strong>${args.owner}</strong>` : ''}. Sign-off locks in the MTPD and tier this assessment derived, and the BC plan lists unapproved assessments as pending.`;
  return {
    subject: `Sign-off needed: ${args.processName}`,
    html: shell(title, `<p style="margin:0">${body}</p>`, {
      label: 'Review and approve',
      href: `${APP_URL}/assessments`,
    }),
    text: `${title}\n\nThe impact assessment for "${args.processName}" is complete and awaiting owner approval${args.owner ? ` from ${args.owner}` : ''}.\n\nReview and approve: ${APP_URL}/assessments`,
  };
}

export function aarReadyEmail(args: {
  exerciseTitle: string;
  sessionId: string;
  recommendationCount: number;
  highPriorityCount: number;
}): EmailContent {
  const title = 'After-action report ready';
  const body = `The after-action report for <strong>${args.exerciseTitle}</strong> has been generated: ${args.recommendationCount} recommendation${args.recommendationCount === 1 ? '' : 's'}${args.highPriorityCount > 0 ? `, <strong style="color:#a3271c">${args.highPriorityCount} high priority</strong>` : ''}. The report includes maturity signals to fold into your next self-assessment update.`;
  return {
    subject: `After-action report: ${args.exerciseTitle}`,
    html: shell(title, `<p style="margin:0">${body}</p>`, {
      label: 'Read the report',
      href: `${APP_URL}/exercises/session/${args.sessionId}`,
    }),
    text: `${title}\n\n"${args.exerciseTitle}": ${args.recommendationCount} recommendations (${args.highPriorityCount} high priority).\n\nRead the report: ${APP_URL}/exercises/session/${args.sessionId}`,
  };
}

export function reviewReminderEmail(args: {
  orgName: string;
  reviewDue: string[];
  awaitingSignOff: string[];
}): EmailContent {
  const title = 'BIA housekeeping for this week';
  const section = (heading: string, items: string[]) =>
    items.length === 0
      ? ''
      : `<p style="margin:14px 0 4px;font-weight:bold;color:${INK}">${heading}</p><ul style="margin:0;padding-left:20px">${items
          .map((i) => `<li style="margin-bottom:3px">${i}</li>`)
          .join('')}</ul>`;
  const html =
    `<p style="margin:0">A quick status check on <strong>${args.orgName}</strong>'s business impact analysis:</p>` +
    section('Assessments due for annual review', args.reviewDue) +
    section('Complete but awaiting owner sign-off', args.awaitingSignOff);
  const text = [
    `${title}\n`,
    args.reviewDue.length
      ? `Assessments due for annual review:\n${args.reviewDue.map((i) => `- ${i}`).join('\n')}\n`
      : '',
    args.awaitingSignOff.length
      ? `Awaiting owner sign-off:\n${args.awaitingSignOff.map((i) => `- ${i}`).join('\n')}\n`
      : '',
    `Open the assessments page: ${APP_URL}/assessments`,
  ].join('\n');
  return {
    subject: `BIA review reminders: ${args.reviewDue.length + args.awaitingSignOff.length} item${args.reviewDue.length + args.awaitingSignOff.length === 1 ? '' : 's'} need attention`,
    html: shell(title, html, { label: 'Open assessments', href: `${APP_URL}/assessments` }),
    text,
  };
}
