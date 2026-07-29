'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getAuthContext, listMyOrganizations, ACTIVE_ORG_COOKIE } from '@/lib/auth';
import {
  listMembers,
  setMemberRole,
  removeMember,
  getMembership,
  listDomains,
  addDomainClaim,
  verifyDomainClaim,
  removeDomainClaim,
  renameOrganization,
  verificationHost,
  verificationRecord,
  createInvitation,
  listInvitations,
  revokeInvitation,
  recordAudit,
  listAudit,
  type Organization,
} from '@/lib/data/tenancy';
import { assertCan, ORG_ROLES, ROLE_RANK, ROLE_LABELS, type OrgRole } from '@/lib/domain/authz';
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

  const previous = target.role;
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
  await recordAudit({
    orgId: ctx.organization.id,
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    action: 'member:manage',
    summary: `Changed ${target.email || targetUserId} from ${ROLE_LABELS[previous]} to ${ROLE_LABELS[role]}`,
  });
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
  await recordAudit({
    orgId: ctx.organization.id,
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    action: 'member:manage',
    summary: `Removed ${target?.email || targetUserId} from the organization`,
  });
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

// ---------------- Invitations ----------------

export interface InvitationView {
  id: string;
  email: string;
  role: OrgRole;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
}

export async function listOrgInvitations(): Promise<InvitationView[]> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'member:view');
  const rows = await listInvitations(ctx.organization.id);
  return rows.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    createdAt: i.createdAt,
    expiresAt: i.expiresAt,
    status: i.revokedAt
      ? 'revoked'
      : i.acceptedAt
        ? 'accepted'
        : new Date(i.expiresAt).getTime() < Date.now()
          ? 'expired'
          : 'pending',
  }));
}

/**
 * Invite someone by email, at a chosen role. This is the route for people
 * outside the joining domains, such as an external auditor or a client-side
 * contact, and the only way to grant access to an address the domain rules
 * would never admit.
 */
export async function inviteMember(
  email: string,
  role: OrgRole
): Promise<MemberActionResult & { link?: string }> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'member:manage');
  const address = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return { ok: false, message: 'That does not look like an email address.' };
  }
  if (!ORG_ROLES.includes(role)) return { ok: false, message: 'Unknown role.' };
  if (ROLE_RANK[role] > ROLE_RANK[ctx.role]) {
    return { ok: false, message: 'You cannot invite someone at a role above your own.' };
  }
  if (role === 'owner' && ctx.role !== 'owner') {
    return { ok: false, message: 'Only an owner can invite another owner.' };
  }

  // Inviting somebody who is already here is almost always a mistake, and
  // the confusing kind: change their role on the members list instead.
  const members = await listMembers(ctx.organization.id);
  const already = members.find((m) => m.email.trim().toLowerCase() === address);
  if (already) {
    return {
      ok: false,
      message: `${address} is already a member (${ROLE_LABELS[already.role]}). Change their role on the members list instead.`,
    };
  }

  const { invitation, token } = await createInvitation({
    orgId: ctx.organization.id,
    email: address,
    role,
    invitedBy: ctx.userId,
  });

  const { emailEnabled, APP_URL } = await import('@/lib/email/client');
  const link = `${APP_URL}/invite/${token}`;
  let emailed = false;
  if (emailEnabled()) {
    const { getResend, EMAIL_FROM } = await import('@/lib/email/client');
    const { invitationEmail } = await import('@/lib/email/templates');
    const content = invitationEmail({
      orgName: ctx.organization.name,
      roleLabel: ROLE_LABELS[role],
      inviterName: ctx.email,
      link,
      expiresInDays: Math.max(
        1,
        Math.round((new Date(invitation.expiresAt).getTime() - Date.now()) / 86_400_000)
      ),
    });
    try {
      const { error } = await getResend().emails.send({
        from: EMAIL_FROM,
        to: address,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
      if (error) console.error('[email] invitation failed:', error.message ?? error);
      else emailed = true;
    } catch (e) {
      console.error('[email] invitation threw:', e instanceof Error ? e.message : e);
    }
  }

  await recordAudit({
    orgId: ctx.organization.id,
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    action: 'member:manage',
    summary: `Invited ${address} as ${ROLE_LABELS[role]}${emailed ? '' : ' (email not sent)'}`,
  });
  revalidatePath('/', 'layout');
  // The link comes back so it can be passed on by hand when email is not
  // configured, or when the invitation never arrives.
  return { ok: true, link };
}

export async function revokeOrgInvitation(id: string): Promise<MemberActionResult> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'member:manage');
  await revokeInvitation(ctx.organization.id, id);
  await recordAudit({
    orgId: ctx.organization.id,
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    action: 'member:manage',
    summary: `Revoked an invitation`,
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---------------- Audit trail ----------------

export async function listOrgAudit(): Promise<
  { id: string; at: string; actorEmail: string; action: string; summary: string }[]
> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'member:view');
  const events = await listAudit(ctx.organization.id, 100);
  return events.map((e) => ({
    id: e.id,
    at: e.at,
    actorEmail: e.actorEmail || e.actorUserId,
    action: e.action,
    summary: e.summary,
  }));
}

// ---------------- Organization identity ----------------

export async function renameOrg(name: string): Promise<MemberActionResult> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'org:manage');
  const trimmed = name.trim();
  if (trimmed.length === 0) return { ok: false, message: 'Give the organization a name.' };
  if (trimmed.length > 120) return { ok: false, message: 'That name is too long.' };
  await renameOrganization(ctx.organization.id, trimmed);
  await recordAudit({
    orgId: ctx.organization.id, actorUserId: ctx.userId, actorEmail: ctx.email,
    action: 'org:manage',
    summary: `Renamed the organization from "${ctx.organization.name}" to "${trimmed}"`,
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export interface DomainView {
  domain: string;
  status: 'pending' | 'active';
  verifiedAt: string | null;
  /** Present only while a claim is pending, so the owner can publish it. */
  recordHost: string | null;
  recordValue: string | null;
}

export async function listOrgDomains(): Promise<DomainView[]> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'member:view');
  const claims = await listDomains(ctx.organization.id);
  return claims.map((c) => ({
    domain: c.domain,
    status: c.status,
    verifiedAt: c.verifiedAt,
    recordHost: c.verificationToken ? verificationHost(c.domain) : null,
    recordValue: c.verificationToken ? verificationRecord(c.verificationToken) : null,
  }));
}

export async function addOrgDomain(domain: string): Promise<MemberActionResult> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'org:manage');
  const result = await addDomainClaim(ctx.organization.id, domain, ctx.userId);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === 'taken'
          ? 'That domain is already claimed by another organization.'
          : 'That domain cannot be claimed. Personal mailbox providers, disposable address services, and reserved domains are excluded.',
    };
  }
  await recordAudit({
    orgId: ctx.organization.id, actorUserId: ctx.userId, actorEmail: ctx.email,
    action: 'org:manage', summary: `Claimed the domain ${domain.trim().toLowerCase()}, pending DNS verification`,
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function verifyOrgDomain(domain: string): Promise<MemberActionResult> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'org:manage');
  const result = await verifyDomainClaim(ctx.organization.id, domain);
  if (!result.ok) {
    const detail =
      result.found.length > 0 ? ` Found instead: ${result.found.join(', ')}` : '';
    return {
      ok: false,
      message:
        result.reason === 'not_found'
          ? 'That domain is not claimed by this organization.'
          : result.reason === 'no_record'
            ? `No TXT record found at ${verificationHost(domain)}. DNS changes can take a few minutes to publish.`
            : `The TXT record does not match the expected value.${detail}`,
    };
  }
  await recordAudit({
    orgId: ctx.organization.id, actorUserId: ctx.userId, actorEmail: ctx.email,
    action: 'org:manage',
    summary: `Verified the domain ${domain}; people with a verified address there now join automatically`,
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function removeOrgDomain(domain: string): Promise<MemberActionResult> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'org:manage');
  await removeDomainClaim(ctx.organization.id, domain);
  await recordAudit({
    orgId: ctx.organization.id, actorUserId: ctx.userId, actorEmail: ctx.email,
    action: 'org:manage', summary: `Removed the domain ${domain}`,
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}
