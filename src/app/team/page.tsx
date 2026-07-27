import Link from 'next/link';
import { getAuthContext } from '@/lib/auth';
import { listOrgMembers, listOrgDomains } from '@/lib/org-actions';
import { tenancyEnabled } from '@/lib/data/tenancy';
import { can, ROLE_LABELS } from '@/lib/domain/authz';
import { PageHeader, Card, EmptyState, btn } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { MembersClient } from './members-client';
import { OrgSettings } from './org-settings';

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
  const canManageOrg = can(ctx.role, 'org:manage');
  const domains = await listOrgDomains();

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

      <div className="mb-6 flex flex-col gap-6">
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
                Joining domain
              </span>
              {domains.find((d) => d.status === 'active')?.domain ??
                'None active; this workspace is private to its members'}
            </span>
            <span>
              <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Your role
              </span>
              {ROLE_LABELS[ctx.role]}
            </span>
          </div>
        </Card>

        {canManageOrg && <OrgSettings orgName={ctx.organization.name} domains={domains} />}
      </div>

      <MembersClient members={members} myRole={ctx.role} canManage={canManage} />
    </>
  );
}
