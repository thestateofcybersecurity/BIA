import Link from 'next/link';
import { getAuthContext } from '@/lib/auth';
import { listOrgMembers } from '@/lib/org-actions';
import { tenancyEnabled } from '@/lib/data/tenancy';
import { can, ROLE_LABELS } from '@/lib/domain/authz';
import { PageHeader, Card, StatusPill, EmptyState, btn } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { MembersClient } from './members-client';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const ctx = await getAuthContext();

  if (!tenancyEnabled()) {
    return (
      <>
        <PageHeader
          kicker="Administration"
          title="People & access"
          intro="Roles and membership apply once the app runs against a database with sign-in configured."
        />
        <EmptyState
          title="Single-workspace demo mode"
          body="Without DATABASE_URL and Neon Auth the app runs as one local workspace with full access, so there is nobody to manage. Configure both to use organizations, domain joining, and roles."
        >
          <Link href="/organization" className={btn.primary}>
            Back to the organization profile
          </Link>
        </EmptyState>
      </>
    );
  }

  if (!can(ctx.role, 'member:view')) {
    return (
      <>
        <PageHeader kicker="Administration" title="People & access" />
        <EmptyState
          title="You do not have access to this page"
          body={`Your role in ${ctx.organization.name} is ${ROLE_LABELS[ctx.role]}. Ask an administrator if you need more.`}
        >
          <Link href="/" className={btn.primary}>
            Back to the dashboard
          </Link>
        </EmptyState>
      </>
    );
  }

  const members = await listOrgMembers();
  const canManage = can(ctx.role, 'member:manage');

  return (
    <>
      <PageHeader
        kicker="Administration"
        title="People & access"
        intro={`Who can see and change ${ctx.organization.name}'s continuity plan, and at what level.`}
      />

      <HelpBox title="How people get here">
        <ul>
          <li>
            <strong>Joining is by verified email domain.</strong> The first person to sign in from
            a work domain claims it and becomes owner; everyone who signs in afterwards from that
            same domain joins automatically at the lowest role.
          </li>
          <li>
            <strong>Auto-joining does not mean auto-trusting.</strong> A new member can read the
            analysis but not the risk register, the activation plan with its contact details, the
            remediation register, or the report export. Those need a role granted deliberately.
          </li>
          <li>
            Personal mailbox providers, disposable address services, and reserved domains never
            claim an organization. Someone signing up with a personal address gets a private
            workspace of their own instead, which is what stops one Gmail user from owning every
            other Gmail user&apos;s plan.
          </li>
          <li>
            An administrator cannot grant a role above their own, cannot change their own role,
            and cannot remove the last owner. Ownership can only be granted by an owner.
          </li>
        </ul>
      </HelpBox>

      <div className="mb-6">
        <Card title="Organization" subtitle="This workspace and how it is identified">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            <span>
              <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Name
              </span>
              {ctx.organization.name}
            </span>
            <span>
              <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Domain
              </span>
              {ctx.organization.primaryDomain ?? 'Private workspace, no domain'}
            </span>
            <span>
              <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Your role
              </span>
              {ROLE_LABELS[ctx.role]}
            </span>
            {ctx.organization.primaryDomain && (
              <span>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Domain status
                </span>
                {ctx.organization.domainVerifiedAt ? (
                  <StatusPill tone="ok">Verified</StatusPill>
                ) : (
                  <StatusPill tone="warn">Claimed, not verified</StatusPill>
                )}
              </span>
            )}
          </div>
          {ctx.organization.primaryDomain && !ctx.organization.domainVerifiedAt && (
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              This domain was claimed by whoever registered first rather than proven by DNS. That
              is fine for a team that knows who set the workspace up; proving it becomes worth
              doing before the plan holds anything you would not want a new starter to read.
            </p>
          )}
        </Card>
      </div>

      <MembersClient members={members} myRole={ctx.role} canManage={canManage} />
    </>
  );
}
