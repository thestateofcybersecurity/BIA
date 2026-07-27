'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getAuthContext, listMyOrganizations, ACTIVE_ORG_COOKIE } from '@/lib/auth';
import {
  listMembers,
  setMemberRole,
  removeMember,
  getMembership,
  type Organization,
} from '@/lib/data/tenancy';
import { assertCan, ORG_ROLES, type OrgRole } from '@/lib/domain/authz';
import { getUserContacts } from '@/lib/email/recipients';

/**
 * Organization administration. Membership is re-read from the database on
 * every call rather than trusted from the client, and role changes are
 * checked against the caller's own role, so an administrator cannot promote
 * themselves past what they hold or strand an organization without an owner.
 */

export interface MemberView {
  userId: string;
  email: string;
  name: string | null;
  role: OrgRole;
  scopedProcessIds: string[];
  joinedAt: string;
  /** True for the caller, so the UI can stop them demoting themselves by accident. */
  isSelf: boolean;
}

export async function listOrgMembers(): Promise<MemberView[]> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'member:view');
  const members = await listMembers(ctx.organization.id);
  const contacts = await getUserContacts(members.map((m) => m.userId));
  return members.map((m) => {
    const contact = contacts.get(m.userId);
    return {
      userId: m.userId,
      email: contact?.email ?? m.email,
      name: contact?.name ?? null,
      role: m.role,
      scopedProcessIds: m.scopedProcessIds,
      joinedAt: m.createdAt,
      isSelf: m.userId === ctx.userId,
    };
  });
}

export type MemberActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function updateMemberRole(
  targetUserId: string,
  role: OrgRole
): Promise<MemberActionResult> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'member:manage');
  if (!ORG_ROLES.includes(role)) return { ok: false, message: 'Unknown role.' };

  // Only an owner may create another owner: an administrator handing out
  // ownership would be a quiet privilege escalation.
  if (role === 'owner' && ctx.role !== 'owner') {
    return { ok: false, message: 'Only an owner can grant ownership.' };
  }
  const target = await getMembership(ctx.organization.id, targetUserId);
  if (!target) return { ok: false, message: 'That person is not a member of this organization.' };
  if (target.role === 'owner' && ctx.role !== 'owner') {
    return { ok: false, message: 'Only an owner can change another owner.' };
  }
  if (target.userId === ctx.userId && role !== ctx.role) {
    return { ok: false, message: 'Ask another administrator to change your own role.' };
  }

  const result = await setMemberRole({ orgId: ctx.organization.id, targetUserId, role });
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === 'last_owner'
          ? 'This is the last owner. Promote someone else to owner first.'
          : 'That person is not a member of this organization.',
    };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function removeOrgMember(targetUserId: string): Promise<MemberActionResult> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'member:manage');
  if (targetUserId === ctx.userId) {
    return { ok: false, message: 'You cannot remove yourself; ask another administrator.' };
  }
  const target = await getMembership(ctx.organization.id, targetUserId);
  if (target?.role === 'owner' && ctx.role !== 'owner') {
    return { ok: false, message: 'Only an owner can remove another owner.' };
  }
  const result = await removeMember(ctx.organization.id, targetUserId);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === 'last_owner'
          ? 'This is the last owner. Promote someone else to owner first.'
          : 'That person is not a member of this organization.',
    };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export interface OrgOption {
  id: string;
  name: string;
  domain: string | null;
  role: OrgRole;
  active: boolean;
}

export async function listSwitchableOrgs(): Promise<OrgOption[]> {
  const ctx = await getAuthContext();
  const mine = await listMyOrganizations();
  return mine.map(({ organization, membership }) => ({
    id: organization.id,
    name: organization.name,
    domain: organization.primaryDomain,
    role: membership.role,
    active: organization.id === ctx.organization.id,
  }));
}

/**
 * Switch the active organization. Membership is verified here, so setting
 * the cookie by hand gains nothing: an id the caller does not belong to is
 * refused, and getAuthContext re-checks on every request regardless.
 */
export async function switchOrganization(orgId: string): Promise<MemberActionResult> {
  const ctx = await getAuthContext();
  const membership = await getMembership(orgId, ctx.userId);
  if (!membership) return { ok: false, message: 'You are not a member of that organization.' };
  const jar = await cookies();
  jar.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function currentOrganization(): Promise<{
  organization: Organization;
  role: OrgRole;
}> {
  const ctx = await getAuthContext();
  return { organization: ctx.organization, role: ctx.role };
}
