import { describe, expect, it } from 'vitest';
import {
  aarReadyEmail,
  assessmentRequestEmail,
  invitationEmail,
  reviewReminderEmail,
  signOffRequestEmail,
} from '@/lib/email/templates';
import { DEFAULT_EMAIL_DAILY_CAP, emailDailyCap, overrideAllowed } from '@/lib/email/policy';

const HOSTILE = `<script>alert("x")</script><img src=x onerror='y'>`;
const ESCAPED = '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&lt;img src=x onerror=&#39;y&#39;&gt;';

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('email templates escape attacker-influenced text in HTML', () => {
  it('sign-off request: process name and owner', () => {
    const { html } = signOffRequestEmail({ processName: HOSTILE, owner: HOSTILE });
    expect(html).not.toContain('<script');
    expect(html).not.toContain("onerror='");
    expect(occurrences(html, ESCAPED)).toBe(2);
  });

  it('assessment request: owner name, process name, organization name', () => {
    const { html } = assessmentRequestEmail({
      orgName: HOSTILE,
      processName: HOSTILE,
      ownerName: HOSTILE,
      link: 'https://bia.example/contribute/abc',
      expiresInDays: 30,
    });
    expect(html).not.toContain('<script');
    expect(occurrences(html, ESCAPED)).toBe(3);
  });

  it('invitation: organization name in the heading and body, inviter, role label', () => {
    const { html, text } = invitationEmail({
      orgName: HOSTILE,
      roleLabel: HOSTILE,
      inviterName: HOSTILE,
      link: 'https://bia.example/invite/abc',
      expiresInDays: 14,
    });
    expect(html).not.toContain('<script');
    // Heading, body mention of the org, inviter, role.
    expect(occurrences(html, ESCAPED)).toBe(4);
    // The plain-text part is not HTML and keeps the raw text.
    expect(text).toContain(HOSTILE);
  });

  it('after-action report: exercise title', () => {
    const { html } = aarReadyEmail({
      exerciseTitle: HOSTILE,
      sessionId: 's1',
      recommendationCount: 3,
      highPriorityCount: 1,
    });
    expect(html).not.toContain('<script');
    expect(occurrences(html, ESCAPED)).toBe(1);
  });

  it('review reminder: organization name and every listed process', () => {
    const { html } = reviewReminderEmail({
      orgName: HOSTILE,
      reviewDue: [HOSTILE, 'Payroll'],
      awaitingSignOff: [HOSTILE],
    });
    expect(html).not.toContain('<script');
    expect(occurrences(html, ESCAPED)).toBe(3);
    expect(html).toContain('<li style="margin-bottom:3px">Payroll</li>');
  });
});

describe('emailDailyCap', () => {
  it('defaults to 50 and accepts a positive integer override', () => {
    expect(DEFAULT_EMAIL_DAILY_CAP).toBe(50);
    expect(emailDailyCap(undefined)).toBe(50);
    expect(emailDailyCap('')).toBe(50);
    expect(emailDailyCap('abc')).toBe(50);
    expect(emailDailyCap('0')).toBe(50);
    expect(emailDailyCap('-3')).toBe(50);
    expect(emailDailyCap('200')).toBe(200);
    expect(emailDailyCap(' 7 ')).toBe(7);
  });
});

describe('overrideAllowed', () => {
  const known = {
    ownerEmail: 'Owner@Example.com',
    memberEmails: ['admin@example.com', '', 'Viewer@Example.com'],
  };

  it('accepts the recorded owner and current members, ignoring case and whitespace', () => {
    expect(overrideAllowed('owner@example.com', known)).toBe(true);
    expect(overrideAllowed('  VIEWER@example.com ', known)).toBe(true);
    expect(overrideAllowed('admin@example.com', known)).toBe(true);
  });

  it('refuses strangers, blanks, and look-alikes', () => {
    expect(overrideAllowed('victim@elsewhere.example', known)).toBe(false);
    expect(overrideAllowed('', known)).toBe(false);
    expect(overrideAllowed('   ', known)).toBe(false);
    expect(overrideAllowed('owner@example.com.attacker.example', known)).toBe(false);
    expect(overrideAllowed('x', { ownerEmail: null, memberEmails: [] })).toBe(false);
  });
});
