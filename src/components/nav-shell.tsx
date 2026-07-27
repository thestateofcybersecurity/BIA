import { getAuthContextOptional } from '@/lib/auth';
import { capabilitiesFor, can } from '@/lib/domain/authz';
import { tenancyEnabled } from '@/lib/data/tenancy';
import { Nav } from '@/components/nav';
import { AccountWidget } from '@/components/account-widget';

/**
 * Resolves the signed-in member's capabilities for the sidebar. Renders
 * nothing when there is no session, so the public contribution pages do not
 * bounce a visitor to sign-in just to draw navigation they cannot use.
 */
export async function NavShell() {
  const ctx = await getAuthContextOptional();
  if (!ctx) return null;

  return (
    <Nav
      allowed={capabilitiesFor(ctx.role)}
      canViewTeam={tenancyEnabled() && can(ctx.role, 'member:view')}
      account={<AccountWidget />}
    />
  );
}
