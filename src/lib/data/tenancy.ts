import { nanoid } from 'nanoid';
import type { OrgRole } from '@/lib/domain/authz';
import { DEFAULT_JOIN_ROLE, ROLE_RANK } from '@/lib/domain/authz';
import {
  evaluateDomain,
  organizationNameFromDomain,
  type DomainRejection,
} from '@/lib/domain/domains';

/**
 * Organizations, domain claims, and membership.
 *
 * The tenant is the organization, not the user: a workspace document belongs
 * to an org, and people reach it through a membership that carries their
 * role. Schema is applied idempotently on first use, in the same way the
 * workspace table already bootstraps itself, so there is no separate
 * migration step to run by hand.
 *
 * Without DATABASE_URL the app stays in single-workspace demo mode and this
 * module reports one implicit organization owned by the demo user.
 */

export interface Organization {
  id: string;
  name: string;
  /** Domain claimed at creation; null for private single-member workspaces. */
  primaryDomain: string | null;
  /** Set once a domain is proven by DNS rather than merely claimed first. */
  domainVerifiedAt: string | null;
  createdAt: string;
}

export interface Membership {
  orgId: string;
  userId: string;
  email: string;
  role: OrgRole;
  scopedProcessIds: string[];
  createdAt: string;
}

export interface OrgResolution {
  organization: Organization;
  membership: Membership;
  /** Set when the address could not claim a shared domain. */
  privateReason: DomainRejection | null;
  /** True when this call created the organization and made the user owner. */
  claimed: boolean;
}

export const DEMO_ORG_ID = 'default';

function demoResolution(userId: string): OrgResolution {
  const now = new Date(0).toISOString();
  return {
    organization: {
      id: process.env.BIA_WORKSPACE_ID || DEMO_ORG_ID,
      name: 'Demo workspace',
      primaryDomain: null,
      domainVerifiedAt: null,
      createdAt: now,
    },
    membership: {
      orgId: process.env.BIA_WORKSPACE_ID || DEMO_ORG_ID,
      userId,
      email: '',
      role: 'owner',
      scopedProcessIds: [],
      createdAt: now,
    },
    privateReason: null,
    claimed: false,
  };
}

export function tenancyEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

const g = globalThis as {
  _biaTenancySql?: ReturnType<typeof import('@neondatabase/serverless').neon>;
  _biaTenancyReady?: Promise<unknown>;
};

async function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Tenancy requires DATABASE_URL');
  if (!g._biaTenancySql) {
    const { neon } = await import('@neondatabase/serverless');
    g._biaTenancySql = neon(url);
  }
  const sql = g._biaTenancySql;
  if (!g._biaTenancyReady) {
    g._biaTenancyReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS organizations (
          id text PRIMARY KEY,
          name text NOT NULL,
          primary_domain text,
          domain_verified_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        )`;
      // One organization per domain: the unique key is what settles the race
      // when two people from the same company register in the same second.
      await sql`
        CREATE TABLE IF NOT EXISTS org_domains (
          domain text PRIMARY KEY,
          org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          verified_at timestamptz,
          added_by text,
          created_at timestamptz NOT NULL DEFAULT now()
        )`;
      // A domain added by an owner is inert until DNS proves it. Only an
      // active domain admits new members, which is what stops someone
      // claiming a company they have no connection to and collecting its
      // staff as they sign up. Domains claimed the original way, by the first
      // verified mailbox at that domain, default to active.
      await sql`ALTER TABLE org_domains ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'`;
      await sql`ALTER TABLE org_domains ADD COLUMN IF NOT EXISTS verification_token text`;
      await sql`
        CREATE TABLE IF NOT EXISTS memberships (
          org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          user_id text NOT NULL,
          email text NOT NULL DEFAULT '',
          role text NOT NULL,
          scoped_process_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (org_id, user_id)
        )`;
      await sql`CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships (user_id)`;
      // Workspaces keyed by organization, with a version for optimistic
      // concurrency. The original user-keyed table is left untouched so the
      // previous release can still read it.
      await sql`
        CREATE TABLE IF NOT EXISTS org_workspaces (
          org_id text PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
          data jsonb NOT NULL,
          version integer NOT NULL DEFAULT 1,
          updated_at timestamptz NOT NULL DEFAULT now()
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS invitations (
          id text PRIMARY KEY,
          org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          email text NOT NULL,
          role text NOT NULL,
          token_hash text NOT NULL,
          invited_by text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          expires_at timestamptz NOT NULL,
          accepted_at timestamptz,
          revoked_at timestamptz
        )`;
      await sql`CREATE INDEX IF NOT EXISTS invitations_org_idx ON invitations (org_id)`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_idx ON invitations (token_hash)`;
      // Append-only by construction: nothing in the app updates or deletes a
      // row here, which is the point of keeping it in its own table rather
      // than as a field on the records it describes.
      await sql`
        CREATE TABLE IF NOT EXISTS audit_events (
          id bigserial PRIMARY KEY,
          org_id text NOT NULL,
          at timestamptz NOT NULL DEFAULT now(),
          actor_user_id text NOT NULL,
          actor_email text NOT NULL DEFAULT '',
          action text NOT NULL,
          summary text NOT NULL DEFAULT ''
        )`;
      await sql`CREATE INDEX IF NOT EXISTS audit_events_org_idx ON audit_events (org_id, at DESC)`;
      // Pre-tenancy workspaces were keyed by user. Move them on first boot
      // after the upgrade so nobody signs in to an empty workspace; the
      // legacy table is left in place so the previous release still reads.
      await migrateLegacyWorkspaces(sql);
    })();
  }
  await g._biaTenancyReady;
  return sql;
}

type OrgRow = {
  id: string;
  name: string;
  primary_domain: string | null;
  domain_verified_at: Date | string | null;
  created_at: Date | string;
};

type MemberRow = {
  org_id: string;
  user_id: string;
  email: string;
  role: string;
  scoped_process_ids: string[] | null;
  created_at: Date | string;
};

const iso = (v: Date | string | null): string | null =>
  v == null ? null : typeof v === 'string' ? v : v.toISOString();

const toOrg = (r: OrgRow): Organization => ({
  id: r.id,
  name: r.name,
  primaryDomain: r.primary_domain,
  domainVerifiedAt: iso(r.domain_verified_at),
  createdAt: iso(r.created_at)!,
});

const toMember = (r: MemberRow): Membership => ({
  orgId: r.org_id,
  userId: r.user_id,
  email: r.email,
  role: r.role as OrgRole,
  scopedProcessIds: r.scoped_process_ids ?? [],
  createdAt: iso(r.created_at)!,
});

async function insertOrg(
  name: string,
  domain: string | null
): Promise<Organization> {
  const sql = await getSql();
  const id = `org_${nanoid(12)}`;
  const rows = (await sql`
    INSERT INTO organizations (id, name, primary_domain)
    VALUES (${id}, ${name}, ${domain})
    RETURNING *
  `) as OrgRow[];
  return toOrg(rows[0]);
}

async function upsertMembership(
  orgId: string,
  userId: string,
  email: string,
  role: OrgRole
): Promise<Membership> {
  const sql = await getSql();
  const rows = (await sql`
    INSERT INTO memberships (org_id, user_id, email, role)
    VALUES (${orgId}, ${userId}, ${email}, ${role})
    ON CONFLICT (org_id, user_id)
    DO UPDATE SET email = EXCLUDED.email
    RETURNING *
  `) as MemberRow[];
  return toMember(rows[0]);
}

/**
 * Resolve the organization for a signing-in user, claiming or joining by
 * email domain. New joiners land on the lowest role and stay there until an
 * administrator grants more, so a claimed domain never exposes the plan to
 * everyone who happens to share the company's email suffix.
 */
export async function resolveOrgForUser(user: {
  userId: string;
  email: string;
  emailVerified: boolean;
}): Promise<OrgResolution> {
  if (!tenancyEnabled()) return demoResolution(user.userId);
  const sql = await getSql();

  // An existing membership always wins: a domain policy change must never
  // strand somebody who already belongs somewhere.
  const existing = (await sql`
    SELECT m.*, o.id AS o_id, o.name, o.primary_domain, o.domain_verified_at, o.created_at AS o_created
    FROM memberships m JOIN organizations o ON o.id = m.org_id
    WHERE m.user_id = ${user.userId}
    ORDER BY m.created_at ASC
    LIMIT 1
  `) as (MemberRow & {
    o_id: string;
    name: string;
    primary_domain: string | null;
    domain_verified_at: Date | string | null;
    o_created: Date | string;
  })[];
  if (existing.length > 0) {
    const r = existing[0];
    // Migrated rows carry no email, and this is the only moment we reliably
    // know it. Without backfilling, anything matching a person by address
    // (the already-a-member check, contributor scoping) silently misses.
    if (!r.email && user.email) {
      await sql`
        UPDATE memberships SET email = ${user.email}
        WHERE org_id = ${r.org_id} AND user_id = ${user.userId}
      `;
      r.email = user.email;
    }
    return {
      organization: toOrg({
        id: r.o_id,
        name: r.name,
        primary_domain: r.primary_domain,
        domain_verified_at: r.domain_verified_at,
        created_at: r.o_created,
      }),
      membership: toMember(r),
      privateReason: null,
      claimed: false,
    };
  }

  const verdict = evaluateDomain(user.email, user.emailVerified);

  if (!verdict.claimable) {
    const org = await insertOrg(
      user.email ? `${user.email.split('@')[0]}'s workspace` : 'Private workspace',
      null
    );
    const membership = await upsertMembership(org.id, user.userId, user.email, 'owner');
    return { organization: org, membership, privateReason: verdict.reason, claimed: true };
  }

  const domain = verdict.domain;
  // Only an active domain admits members; a pending claim awaiting DNS
  // proof must not collect people.
  const claimed = (await sql`
    SELECT o.* FROM org_domains d JOIN organizations o ON o.id = d.org_id
    WHERE d.domain = ${domain} AND d.status = 'active'
  `) as OrgRow[];

  if (claimed.length > 0) {
    const org = toOrg(claimed[0]);
    const membership = await upsertMembership(
      org.id,
      user.userId,
      user.email,
      DEFAULT_JOIN_ROLE
    );
    return { organization: org, membership, privateReason: null, claimed: false };
  }

  // First verified arrival from this domain claims it and becomes owner.
  const org = await insertOrg(organizationNameFromDomain(domain), domain);
  const inserted = (await sql`
    INSERT INTO org_domains (domain, org_id, added_by)
    VALUES (${domain}, ${org.id}, ${user.userId})
    ON CONFLICT (domain) DO NOTHING
    RETURNING org_id
  `) as { org_id: string }[];

  if (inserted.length === 0) {
    // Someone claimed it between our lookup and our insert. Their claim
    // stands; we join it and drop the organization we optimistically made.
    const winner = (await sql`
      SELECT o.* FROM org_domains d JOIN organizations o ON o.id = d.org_id
      WHERE d.domain = ${domain}
    `) as OrgRow[];
    await sql`DELETE FROM organizations WHERE id = ${org.id}`;
    const winnerOrg = toOrg(winner[0]);
    const membership = await upsertMembership(
      winnerOrg.id,
      user.userId,
      user.email,
      DEFAULT_JOIN_ROLE
    );
    return { organization: winnerOrg, membership, privateReason: null, claimed: false };
  }

  const membership = await upsertMembership(org.id, user.userId, user.email, 'owner');
  return { organization: org, membership, privateReason: null, claimed: true };
}

/** Every organization a user belongs to, for the switcher. */
export async function listMembershipsForUser(
  userId: string
): Promise<{ organization: Organization; membership: Membership }[]> {
  if (!tenancyEnabled()) {
    const demo = demoResolution(userId);
    return [{ organization: demo.organization, membership: demo.membership }];
  }
  const sql = await getSql();
  const rows = (await sql`
    SELECT m.*, o.id AS o_id, o.name, o.primary_domain, o.domain_verified_at, o.created_at AS o_created
    FROM memberships m JOIN organizations o ON o.id = m.org_id
    WHERE m.user_id = ${userId}
    ORDER BY o.name ASC
  `) as (MemberRow & {
    o_id: string;
    name: string;
    primary_domain: string | null;
    domain_verified_at: Date | string | null;
    o_created: Date | string;
  })[];
  return rows.map((r) => ({
    organization: toOrg({
      id: r.o_id,
      name: r.name,
      primary_domain: r.primary_domain,
      domain_verified_at: r.domain_verified_at,
      created_at: r.o_created,
    }),
    membership: toMember(r),
  }));
}

export async function getMembership(
  orgId: string,
  userId: string
): Promise<Membership | null> {
  if (!tenancyEnabled()) return demoResolution(userId).membership;
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM memberships WHERE org_id = ${orgId} AND user_id = ${userId}
  `) as MemberRow[];
  return rows.length > 0 ? toMember(rows[0]) : null;
}

export async function listMembers(orgId: string): Promise<Membership[]> {
  if (!tenancyEnabled()) return [];
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM memberships WHERE org_id = ${orgId} ORDER BY created_at ASC
  `) as MemberRow[];
  return rows.map(toMember);
}

/**
 * Change a member's role. The last owner cannot be demoted, because an
 * organization with no owner cannot grant anyone access to it again.
 */
export async function setMemberRole(args: {
  orgId: string;
  targetUserId: string;
  role: OrgRole;
  scopedProcessIds?: string[];
}): Promise<{ ok: true } | { ok: false; reason: 'last_owner' | 'not_found' }> {
  if (!tenancyEnabled()) return { ok: false, reason: 'not_found' };
  const sql = await getSql();
  const current = await getMembership(args.orgId, args.targetUserId);
  if (!current) return { ok: false, reason: 'not_found' };

  if (current.role === 'owner' && args.role !== 'owner') {
    const owners = (await sql`
      SELECT count(*)::int AS n FROM memberships WHERE org_id = ${args.orgId} AND role = 'owner'
    `) as { n: number }[];
    if ((owners[0]?.n ?? 0) <= 1) return { ok: false, reason: 'last_owner' };
  }

  await sql`
    UPDATE memberships
    SET role = ${args.role},
        scoped_process_ids = ${JSON.stringify(args.scopedProcessIds ?? current.scopedProcessIds)}::jsonb
    WHERE org_id = ${args.orgId} AND user_id = ${args.targetUserId}
  `;
  return { ok: true };
}

export async function removeMember(
  orgId: string,
  targetUserId: string
): Promise<{ ok: true } | { ok: false; reason: 'last_owner' | 'not_found' }> {
  if (!tenancyEnabled()) return { ok: false, reason: 'not_found' };
  const sql = await getSql();
  const current = await getMembership(orgId, targetUserId);
  if (!current) return { ok: false, reason: 'not_found' };
  if (current.role === 'owner') {
    const owners = (await sql`
      SELECT count(*)::int AS n FROM memberships WHERE org_id = ${orgId} AND role = 'owner'
    `) as { n: number }[];
    if ((owners[0]?.n ?? 0) <= 1) return { ok: false, reason: 'last_owner' };
  }
  await sql`DELETE FROM memberships WHERE org_id = ${orgId} AND user_id = ${targetUserId}`;
  return { ok: true };
}

// ---------------- Domain claims ----------------

export type DomainStatus = 'pending' | 'active';

export interface DomainClaim {
  domain: string;
  orgId: string;
  status: DomainStatus;
  verifiedAt: string | null;
  /** Value the TXT record must contain; null once claimed the original way. */
  verificationToken: string | null;
  createdAt: string;
}

/** Host the TXT record goes on, kept off the apex to avoid clobbering SPF. */
export function verificationHost(domain: string): string {
  return `_bia-challenge.${domain}`;
}

export function verificationRecord(token: string): string {
  return `bia-verification=${token}`;
}

type DomainRow = {
  domain: string;
  org_id: string;
  status: string;
  verified_at: Date | string | null;
  verification_token: string | null;
  created_at: Date | string;
};

const toDomain = (r: DomainRow): DomainClaim => ({
  domain: r.domain,
  orgId: r.org_id,
  status: r.status as DomainStatus,
  verifiedAt: iso(r.verified_at),
  verificationToken: r.verification_token,
  createdAt: iso(r.created_at)!,
});

export async function listDomains(orgId: string): Promise<DomainClaim[]> {
  if (!tenancyEnabled()) return [];
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM org_domains WHERE org_id = ${orgId} ORDER BY created_at ASC
  `) as DomainRow[];
  return rows.map(toDomain);
}

export type AddDomainResult =
  | { ok: true; claim: DomainClaim }
  | { ok: false; reason: 'not_claimable' | 'taken' };

/**
 * Start a domain claim for an existing organization. The claim is pending
 * until DNS proves it: possessing a mailbox at a domain is reasonable
 * evidence of belonging to it, but typing a domain into a form is not, so an
 * owner adding a domain has to demonstrate control of it.
 */
export async function addDomainClaim(
  orgId: string,
  rawDomain: string,
  addedBy: string
): Promise<AddDomainResult> {
  const domain = rawDomain.trim().toLowerCase().replace(/^@/, '').replace(/\.$/, '');
  // Reuse the signup policy: consumer, disposable, and reserved domains are
  // no more claimable here than they are there.
  const verdict = evaluateDomain(`someone@${domain}`, true);
  if (!verdict.claimable) return { ok: false, reason: 'not_claimable' };

  const sql = await getSql();
  const token = nanoid(24);
  const rows = (await sql`
    INSERT INTO org_domains (domain, org_id, added_by, status, verification_token)
    VALUES (${domain}, ${orgId}, ${addedBy}, 'pending', ${token})
    ON CONFLICT (domain) DO NOTHING
    RETURNING *
  `) as DomainRow[];
  if (rows.length === 0) return { ok: false, reason: 'taken' };
  return { ok: true, claim: toDomain(rows[0]) };
}

export async function removeDomainClaim(orgId: string, domain: string): Promise<void> {
  const sql = await getSql();
  await sql`DELETE FROM org_domains WHERE org_id = ${orgId} AND domain = ${domain}`;
}

export type TxtResolver = (host: string) => Promise<string[][]>;

async function defaultResolver(host: string): Promise<string[][]> {
  const { resolveTxt } = await import('node:dns/promises');
  return resolveTxt(host);
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'no_record' | 'mismatch'; found: string[] };

/**
 * Check the TXT record and activate the domain if it matches. Resolver is
 * injectable so the matching logic can be tested without a live zone.
 */
export async function verifyDomainClaim(
  orgId: string,
  domain: string,
  resolver: TxtResolver = defaultResolver
): Promise<VerifyResult> {
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM org_domains WHERE org_id = ${orgId} AND domain = ${domain}
  `) as DomainRow[];
  if (rows.length === 0) return { ok: false, reason: 'not_found', found: [] };
  const claim = toDomain(rows[0]);
  if (!claim.verificationToken) return { ok: true };

  const expected = verificationRecord(claim.verificationToken);
  let records: string[][];
  try {
    records = await resolver(verificationHost(domain));
  } catch {
    return { ok: false, reason: 'no_record', found: [] };
  }
  // A TXT answer arrives as chunks that concatenate; long values are split
  // at 255 characters by the protocol.
  const values = records.map((chunks) => chunks.join('').trim());
  if (values.length === 0) return { ok: false, reason: 'no_record', found: [] };
  if (!values.includes(expected)) return { ok: false, reason: 'mismatch', found: values };

  await sql`
    UPDATE org_domains
    SET status = 'active', verified_at = now(), verification_token = NULL
    WHERE org_id = ${orgId} AND domain = ${domain}
  `;
  // A verified domain becomes the organization's identity when it has none.
  await sql`
    UPDATE organizations SET primary_domain = COALESCE(primary_domain, ${domain}),
                             domain_verified_at = now()
    WHERE id = ${orgId}
  `;
  return { ok: true };
}

export async function renameOrganization(orgId: string, name: string): Promise<void> {
  const sql = await getSql();
  await sql`UPDATE organizations SET name = ${name.trim()} WHERE id = ${orgId}`;
}

// ---------------- Invitations ----------------

const INVITE_TTL_DAYS = 14;

export interface Invitation {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

type InviteRow = {
  id: string;
  org_id: string;
  email: string;
  role: string;
  invited_by: string;
  created_at: Date | string;
  expires_at: Date | string;
  accepted_at: Date | string | null;
  revoked_at: Date | string | null;
};

const toInvite = (r: InviteRow): Invitation => ({
  id: r.id,
  orgId: r.org_id,
  email: r.email,
  role: r.role as OrgRole,
  invitedBy: r.invited_by,
  createdAt: iso(r.created_at)!,
  expiresAt: iso(r.expires_at)!,
  acceptedAt: iso(r.accepted_at),
  revokedAt: iso(r.revoked_at),
});

/**
 * Only the hash is stored, so a copy of the database does not hand over
 * working invitation links.
 */
async function hashToken(token: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(token).digest('hex');
}

export async function createInvitation(args: {
  orgId: string;
  email: string;
  role: OrgRole;
  invitedBy: string;
}): Promise<{ invitation: Invitation; token: string }> {
  const sql = await getSql();
  const token = nanoid(32);
  const id = `inv_${nanoid(12)}`;
  const expires = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const rows = (await sql`
    INSERT INTO invitations (id, org_id, email, role, token_hash, invited_by, expires_at)
    VALUES (${id}, ${args.orgId}, ${args.email.trim().toLowerCase()}, ${args.role},
            ${await hashToken(token)}, ${args.invitedBy}, ${expires.toISOString()})
    RETURNING *
  `) as InviteRow[];
  return { invitation: toInvite(rows[0]), token };
}

export async function listInvitations(orgId: string): Promise<Invitation[]> {
  if (!tenancyEnabled()) return [];
  const sql = await getSql();
  const rows = (await sql`
    SELECT * FROM invitations WHERE org_id = ${orgId} ORDER BY created_at DESC LIMIT 100
  `) as InviteRow[];
  return rows.map(toInvite);
}

export async function revokeInvitation(orgId: string, id: string): Promise<void> {
  const sql = await getSql();
  await sql`
    UPDATE invitations SET revoked_at = now()
    WHERE org_id = ${orgId} AND id = ${id} AND accepted_at IS NULL
  `;
}

export type InviteLookup =
  | { ok: true; invitation: Invitation; organization: Organization }
  | { ok: false; reason: 'not_found' | 'revoked' | 'expired' | 'accepted' };

export async function lookupInvitation(token: string): Promise<InviteLookup> {
  if (!tenancyEnabled()) return { ok: false, reason: 'not_found' };
  const sql = await getSql();
  const rows = (await sql`
    SELECT i.*, o.id AS o_id, o.name, o.primary_domain, o.domain_verified_at,
           o.created_at AS o_created
    FROM invitations i JOIN organizations o ON o.id = i.org_id
    WHERE i.token_hash = ${await hashToken(token)}
  `) as (InviteRow & {
    o_id: string;
    name: string;
    primary_domain: string | null;
    domain_verified_at: Date | string | null;
    o_created: Date | string;
  })[];
  if (rows.length === 0) return { ok: false, reason: 'not_found' };
  const r = rows[0];
  const invitation = toInvite(r);
  if (invitation.revokedAt) return { ok: false, reason: 'revoked' };
  if (invitation.acceptedAt) return { ok: false, reason: 'accepted' };
  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  return {
    ok: true,
    invitation,
    organization: toOrg({
      id: r.o_id,
      name: r.name,
      primary_domain: r.primary_domain,
      domain_verified_at: r.domain_verified_at,
      created_at: r.o_created,
    }),
  };
}

export type AcceptResult =
  | { ok: true; orgId: string; role: OrgRole }
  | { ok: false; reason: 'not_found' | 'revoked' | 'expired' | 'accepted' | 'wrong_email' };

/**
 * Accept an invitation. The signed-in address must be the one invited:
 * otherwise a forwarded link would hand access to whoever opened it.
 */
export async function acceptInvitation(
  token: string,
  user: { userId: string; email: string }
): Promise<AcceptResult> {
  const found = await lookupInvitation(token);
  if (!found.ok) return { ok: false, reason: found.reason };
  if (found.invitation.email !== user.email.trim().toLowerCase()) {
    return { ok: false, reason: 'wrong_email' };
  }
  const sql = await getSql();
  const existing = await getMembership(found.invitation.orgId, user.userId);

  // An invitation grants access; it must never take it away. Accepting one
  // for a role below what somebody already holds would silently demote them,
  // and accepting a Viewer invitation as the only owner would leave the
  // organization with nobody able to administer it again.
  const granted =
    existing && ROLE_RANK[existing.role] >= ROLE_RANK[found.invitation.role]
      ? existing.role
      : found.invitation.role;

  await upsertMembership(found.invitation.orgId, user.userId, user.email, granted);
  await sql`
    UPDATE memberships SET role = ${granted}
    WHERE org_id = ${found.invitation.orgId} AND user_id = ${user.userId}
  `;
  await sql`UPDATE invitations SET accepted_at = now() WHERE id = ${found.invitation.id}`;
  return { ok: true, orgId: found.invitation.orgId, role: granted };
}

// ---------------- Audit trail ----------------

export interface AuditEvent {
  id: string;
  at: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  summary: string;
}

/**
 * Append one event. Never throws: an audit write failing must not take down
 * the operation it describes, and a missing line is visible in the trail
 * whereas a failed save is not.
 */
export async function recordAudit(args: {
  orgId: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  summary: string;
}): Promise<void> {
  if (!tenancyEnabled()) return;
  try {
    const sql = await getSql();
    await sql`
      INSERT INTO audit_events (org_id, actor_user_id, actor_email, action, summary)
      VALUES (${args.orgId}, ${args.actorUserId}, ${args.actorEmail}, ${args.action}, ${args.summary})
    `;
  } catch (e) {
    console.error('[audit] failed to record:', e instanceof Error ? e.message : e);
  }
}

export async function listAudit(orgId: string, limit = 100): Promise<AuditEvent[]> {
  if (!tenancyEnabled()) return [];
  const sql = await getSql();
  const rows = (await sql`
    SELECT id, at, actor_user_id, actor_email, action, summary
    FROM audit_events WHERE org_id = ${orgId}
    ORDER BY at DESC LIMIT ${limit}
  `) as {
    id: number | string;
    at: Date | string;
    actor_user_id: string;
    actor_email: string;
    action: string;
    summary: string;
  }[];
  return rows.map((r) => ({
    id: String(r.id),
    at: iso(r.at)!,
    actorUserId: r.actor_user_id,
    actorEmail: r.actor_email,
    action: r.action,
    summary: r.summary,
  }));
}

/** Organization ids with a workspace, for the scheduled notification job. */
export async function listOrgIds(): Promise<string[]> {
  if (!tenancyEnabled()) return [];
  const sql = await getSql();
  const rows = (await sql`SELECT org_id FROM org_workspaces`) as { org_id: string }[];
  return rows.map((r) => r.org_id);
}

type Sql = ReturnType<typeof import('@neondatabase/serverless').neon>;

/**
 * One-time move of the pre-tenancy, user-keyed workspaces into personal
 * organizations, so an existing user signs in to their data rather than an
 * empty workspace. Idempotent: a user who already has a membership is
 * skipped, and a database that never ran the old schema is a no-op.
 *
 * Takes the connection rather than calling getSql, because it runs inside
 * that bootstrap.
 */
async function migrateLegacyWorkspaces(
  sql: Sql
): Promise<{ migrated: number; skipped: number }> {
  let legacy: { user_id: string; data: unknown }[];
  try {
    legacy = (await sql`SELECT user_id, data FROM workspaces`) as {
      user_id: string;
      data: unknown;
    }[];
  } catch {
    // No legacy table: a database created after this release.
    return { migrated: 0, skipped: 0 };
  }

  let migrated = 0;
  let skipped = 0;
  for (const row of legacy) {
    const existing = (await sql`
      SELECT 1 FROM memberships WHERE user_id = ${row.user_id} LIMIT 1
    `) as unknown[];
    if (existing.length > 0) {
      skipped++;
      continue;
    }
    const id = `org_${nanoid(12)}`;
    await sql`
      INSERT INTO organizations (id, name, primary_domain)
      VALUES (${id}, ${'Migrated workspace'}, ${null})
    `;
    await sql`
      INSERT INTO memberships (org_id, user_id, email, role)
      VALUES (${id}, ${row.user_id}, ${''}, ${'owner'})
      ON CONFLICT (org_id, user_id) DO NOTHING
    `;
    await sql`
      INSERT INTO org_workspaces (org_id, data, version)
      VALUES (${id}, ${JSON.stringify(row.data)}::jsonb, 1)
      ON CONFLICT (org_id) DO NOTHING
    `;
    migrated++;
  }
  return { migrated, skipped };
}
