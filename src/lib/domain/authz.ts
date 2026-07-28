/**
 * Authorization model.
 *
 * One table maps every capability in the app to the lowest role that holds
 * it. Checks live here rather than in pages or components, because a rule
 * expressed in the UI is a rule that leaks the first time an action is
 * called from somewhere else.
 *
 * Roles are ranked, so a capability granted to `coordinator` is implicitly
 * held by `admin` and `owner`. The two exceptions to pure ranking are
 * contributor capabilities, which are scoped to the processes a person owns
 * and are checked by the helpers at the bottom of this file.
 */

export type OrgRole = 'owner' | 'admin' | 'coordinator' | 'contributor' | 'viewer';

export const ORG_ROLES: OrgRole[] = ['owner', 'admin', 'coordinator', 'contributor', 'viewer'];

export const ROLE_RANK: Record<OrgRole, number> = {
  viewer: 1,
  contributor: 2,
  coordinator: 3,
  admin: 4,
  owner: 5,
};

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  coordinator: 'Continuity coordinator',
  contributor: 'Process contributor',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner:
    'Everything an administrator can do, plus claiming domains and deleting the organization. There is always at least one.',
  admin:
    'Manages people and roles, and has full access to continuity content. Cannot remove the last owner.',
  coordinator:
    'Runs the continuity program: full read and write across assessments, risks, the plan, exercises, and the report.',
  contributor:
    'Completes the impact assessments for the processes they own, and signs them off. Sees the inventory but not the risk register or the response plan.',
  viewer:
    'Read-only on the analysis: processes, impact assessments, objectives and gaps, inherited requirements, and maturity. Deliberately excludes the risk register, the activation plan with its contact details, and report export.',
};

/** The role a new member of a claimed domain receives before an admin acts. */
export const DEFAULT_JOIN_ROLE: OrgRole = 'viewer';

export type Capability =
  // Organization and people
  | 'org:manage'
  | 'member:manage'
  | 'member:view'
  | 'workspace:destroy'
  | 'notifications:manage'
  // Analysis, readable by any member
  | 'dashboard:view'
  | 'process:read'
  | 'assessment:read'
  | 'objectives:read'
  | 'requirements:read'
  | 'maturity:read'
  // Content the program owns
  | 'profile:write'
  | 'process:write'
  | 'assessment:write'
  | 'assessment:writeOwn'
  | 'assessment:approve'
  | 'objectives:write'
  | 'maturity:write'
  | 'workflow:read'
  | 'workflow:write'
  | 'collection:manage'
  // Sensitive surfaces: threat detail, response playbook, and the portable
  // copy of everything.
  | 'risk:read'
  | 'risk:write'
  | 'plan:read'
  | 'plan:write'
  | 'exercise:read'
  | 'exercise:run'
  | 'report:export'
  | 'ai:generate';

/** Minimum role holding each capability. */
export const CAPABILITY_MINIMUM: Record<Capability, OrgRole> = {
  'org:manage': 'owner',

  'member:manage': 'admin',
  'workspace:destroy': 'admin',
  'notifications:manage': 'admin',

  'member:view': 'coordinator',
  'profile:write': 'coordinator',
  'process:write': 'coordinator',
  'assessment:write': 'coordinator',
  'assessment:approve': 'coordinator',
  'objectives:write': 'coordinator',
  'maturity:write': 'coordinator',
  'workflow:write': 'coordinator',
  'collection:manage': 'coordinator',
  'risk:read': 'coordinator',
  'risk:write': 'coordinator',
  'plan:read': 'coordinator',
  'plan:write': 'coordinator',
  'exercise:read': 'coordinator',
  'exercise:run': 'coordinator',
  'report:export': 'coordinator',
  'ai:generate': 'coordinator',
  'workflow:read': 'coordinator',

  // Contributors write only the assessments for processes they own; the
  // per-process check lives in assertCanWriteAssessment.
  'assessment:writeOwn': 'contributor',

  'dashboard:view': 'viewer',
  'process:read': 'viewer',
  'assessment:read': 'viewer',
  'objectives:read': 'viewer',
  'requirements:read': 'viewer',
  'maturity:read': 'viewer',
};

/** Plain-language verb for each capability, for the audit trail. */
export const AUDIT_LABELS: Record<Capability, string> = {
  'org:manage': 'Changed organization settings',
  'member:manage': 'Changed membership',
  'member:view': 'Viewed members',
  'workspace:destroy': 'Replaced the whole workspace',
  'notifications:manage': 'Changed notification preferences',
  'dashboard:view': 'Viewed the dashboard',
  'process:read': 'Viewed processes',
  'assessment:read': 'Viewed assessments',
  'objectives:read': 'Viewed objectives',
  'requirements:read': 'Viewed requirements',
  'maturity:read': 'Viewed maturity',
  'profile:write': 'Updated the organization profile',
  'process:write': 'Updated the process inventory',
  'assessment:write': 'Updated an impact assessment',
  'assessment:writeOwn': 'Updated an impact assessment',
  'assessment:approve': 'Signed off an impact assessment',
  'objectives:write': 'Updated recovery objectives or the gap register',
  'maturity:write': 'Updated the maturity assessment',
  'workflow:read': 'Viewed recovery workflows',
  'workflow:write': 'Updated a recovery workflow',
  'collection:manage': 'Changed a delegated assessment request',
  'risk:read': 'Viewed the risk register',
  'risk:write': 'Updated the risk register',
  'plan:read': 'Viewed the activation plan',
  'plan:write': 'Updated the activation plan',
  'exercise:read': 'Viewed exercises',
  'exercise:run': 'Ran or changed a tabletop exercise',
  'report:export': 'Exported the BC plan',
  'ai:generate': 'Generated content with Claude',
};

export function can(role: OrgRole, capability: Capability): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[CAPABILITY_MINIMUM[capability]];
}

export class ForbiddenError extends Error {
  constructor(
    public readonly capability: Capability,
    public readonly role: OrgRole
  ) {
    super(
      `Your role (${ROLE_LABELS[role]}) does not allow this. Required: ${ROLE_LABELS[CAPABILITY_MINIMUM[capability]]} or above.`
    );
    this.name = 'ForbiddenError';
  }
}

export function assertCan(role: OrgRole, capability: Capability): void {
  if (!can(role, capability)) throw new ForbiddenError(capability, role);
}

/** Every capability a role holds, for rendering navigation and role pickers. */
export function capabilitiesFor(role: OrgRole): Capability[] {
  return (Object.keys(CAPABILITY_MINIMUM) as Capability[]).filter((c) => can(role, c));
}

// ---------------- Redaction ----------------

/**
 * Strip what the role may not see before the workspace leaves the server.
 *
 * Hiding a section in the UI is not access control: the data would still sit
 * in the payload the browser receives. Anything a role cannot read is
 * removed here, at the single point where a workspace is handed to a page.
 */
export function redactWorkspaceFor<
  T extends {
    risks: unknown[];
    plan: unknown;
    exercises: unknown[];
    collectionRequests: unknown[];
    remediations: unknown[];
    processes: { ownerEmail?: string; ownerPhone?: string }[];
  },
>(ws: T, role: OrgRole): T {
  const out: T = { ...ws };

  if (!can(role, 'risk:read')) out.risks = [];
  if (!can(role, 'exercise:read')) out.exercises = [];
  if (!can(role, 'plan:read')) {
    out.plan = null;
    // Owner contact details are part of the response playbook, not the
    // inventory, so they travel with the plan.
    out.processes = ws.processes.map((p) => {
      const copy = { ...p };
      delete copy.ownerEmail;
      delete copy.ownerPhone;
      return copy;
    }) as T['processes'];
  }
  if (!can(role, 'member:view')) out.collectionRequests = [];
  // The gap register names what cannot be recovered in time, which is the
  // most directly exploitable thing in the workspace.
  if (!can(role, 'objectives:write')) out.remediations = [];

  return out;
}

// ---------------- Contributor scoping ----------------

export interface MemberContext {
  userId: string;
  email: string;
  role: OrgRole;
  /** Explicit process assignments; empty means fall back to owner-email match. */
  scopedProcessIds: string[];
}

/**
 * A contributor may only touch the processes they own. Assignment is explicit
 * where an admin has set it, and otherwise falls back to matching the
 * process's recorded owner email, which is what the delegated collection
 * links already key on.
 */
export function ownsProcess(
  member: MemberContext,
  process: { id: string; ownerEmail?: string }
): boolean {
  if (member.scopedProcessIds.length > 0) return member.scopedProcessIds.includes(process.id);
  const owner = process.ownerEmail?.trim().toLowerCase();
  return owner != null && owner !== '' && owner === member.email.trim().toLowerCase();
}

/** Write access to one process's assessment, honouring contributor scope. */
export function canWriteAssessment(
  member: MemberContext,
  process: { id: string; ownerEmail?: string }
): boolean {
  if (can(member.role, 'assessment:write')) return true;
  return member.role === 'contributor' && ownsProcess(member, process);
}

export function assertCanWriteAssessment(
  member: MemberContext,
  process: { id: string; ownerEmail?: string }
): void {
  if (!canWriteAssessment(member, process)) {
    throw new ForbiddenError('assessment:write', member.role);
  }
}

/**
 * Processes a member may see in full. Coordinators and above see everything;
 * a contributor sees the inventory but only their own assessment detail.
 */
export function visibleProcessIds<T extends { id: string; ownerEmail?: string }>(
  member: MemberContext,
  processes: T[]
): string[] {
  if (can(member.role, 'assessment:write')) return processes.map((p) => p.id);
  if (member.role !== 'contributor') return [];
  return processes.filter((p) => ownsProcess(member, p)).map((p) => p.id);
}
