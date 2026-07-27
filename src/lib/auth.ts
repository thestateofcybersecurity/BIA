import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authEnabled, getAuth } from '@/lib/neon-auth';
import {
  resolveOrgForUser,
  getMembership,
  listMembershipsForUser,
  tenancyEnabled,
  DEMO_ORG_ID,
  type Organization,
  type Membership,
} from '@/lib/data/tenancy';
import type { MemberContext, OrgRole } from '@/lib/domain/authz';

/**
 * Identity and tenancy seam. Everything beneath this layer is scoped by
 * organization id, and every mutation is gated by the role on the caller's
 * membership. The active organization comes from a cookie, but the cookie is
 * never trusted on its own: membership is re-read on every request, so a
 * stale or forged value simply falls back to the user's default org.
 */

export const ACTIVE_ORG_COOKIE = 'bia_org';

export interface AuthContext {
  userId: string;
  email: string;
  organization: Organization;
  membership: Membership;
  /** Shorthand for the permission helpers in domain/authz. */
  member: MemberContext;
  role: OrgRole;
}

interface SessionUser {
  userId: string;
  email: string;
  emailVerified: boolean;
}

async function currentUser(): Promise<SessionUser> {
  if (!authEnabled()) {
    // cookies() keeps demo mode dynamic (never statically cached).
    await cookies();
    return { userId: process.env.BIA_WORKSPACE_ID || DEMO_ORG_ID, email: '', emailVerified: false };
  }
  const { data: session } = await getAuth().getSession();
  if (!session?.user) redirect('/auth/sign-in');
  const user = session.user as { id: string; email?: string; emailVerified?: boolean };
  return {
    userId: user.id,
    email: user.email ?? '',
    emailVerified: user.emailVerified === true,
  };
}

/**
 * The caller's organization and role. Resolves the active organization from
 * the cookie when the user is a member of it, and otherwise falls back to
 * claiming or joining by email domain.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const user = await currentUser();

  let organization: Organization | null = null;
  let membership: Membership | null = null;

  if (tenancyEnabled()) {
    const jar = await cookies();
    const requested = jar.get(ACTIVE_ORG_COOKIE)?.value;
    if (requested) {
      const m = await getMembership(requested, user.userId);
      if (m) {
        const orgs = await listMembershipsForUser(user.userId);
        const match = orgs.find((o) => o.organization.id === requested);
        if (match) {
          organization = match.organization;
          membership = match.membership;
        }
      }
    }
  }

  if (!organization || !membership) {
    const resolved = await resolveOrgForUser(user);
    organization = resolved.organization;
    membership = resolved.membership;
  }

  return {
    userId: user.userId,
    email: user.email,
    organization,
    membership,
    role: membership.role,
    member: {
      userId: user.userId,
      email: user.email,
      role: membership.role,
      scopedProcessIds: membership.scopedProcessIds,
    },
  };
}

/**
 * Same as getAuthContext but returns null instead of redirecting, for
 * chrome that renders on public routes such as the contribution links.
 */
export async function getAuthContextOptional(): Promise<AuthContext | null> {
  if (authEnabled()) {
    const { data: session } = await getAuth().getSession();
    if (!session?.user) return null;
  }
  return getAuthContext();
}

/** The workspace key for the caller's active organization. */
export async function getOrgId(): Promise<string> {
  return (await getAuthContext()).organization.id;
}

/** Organizations the caller can switch between. */
export async function listMyOrganizations(): Promise<
  { organization: Organization; membership: Membership }[]
> {
  const user = await currentUser();
  return listMembershipsForUser(user.userId);
}

/**
 * Kept for the delegated-collection flow, which resolves a workspace from a
 * signed token rather than a session.
 */
export async function getUserId(): Promise<string> {
  return (await currentUser()).userId;
}
