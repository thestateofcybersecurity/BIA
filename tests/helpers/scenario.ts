import { harness, type TestUser } from './harness';

/**
 * Arrange helpers shared by the security regression tests. Organizations
 * are created the way production creates them (first sign-in resolves or
 * claims one); additional members are inserted directly at a chosen role.
 */

/** Sign in as `owner` for the first time and return the organization id. */
export async function bootstrapOrg(owner: TestUser): Promise<string> {
  await harness.actAs(owner);
  const { getAuthContext } = await import('@/lib/auth');
  const ctx = await getAuthContext();
  return ctx.organization.id;
}

export async function addMember(orgId: string, user: TestUser, role: string): Promise<void> {
  const previous = harness.currentUser();
  await harness.actAs(user);
  await harness.actAs(previous);
  await harness.query(
    `INSERT INTO memberships (org_id, user_id, email, role) VALUES ($1, $2, $3, $4)
     ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [orgId, user.id, user.email, role]
  );
}

export async function storedWorkspace(orgId: string): Promise<Record<string, unknown> | null> {
  const rows = await harness.query<{ data: Record<string, unknown> }>(
    'SELECT data FROM org_workspaces WHERE org_id = $1',
    [orgId]
  );
  return rows[0]?.data ?? null;
}

export const emptyDeps = () => ({
  people: [],
  applications: [],
  equipment: [],
  facilities: [],
  suppliers: [],
  data: [],
});

export const processInput = (name: string, over: Record<string, unknown> = {}) => ({
  name,
  description: '',
  owner: 'Owner Person',
  department: '',
  usersServed: '',
  peakPeriods: '',
  dependencies: emptyDeps(),
  upstreamProcessIds: [],
  ...over,
});

const horizons = <T,>(v: T) => ({ h4: v, h24: v, d3: v, w1: v, m1: v });

export const completeAssessment = (processId: string, loss = 1000) => ({
  processId,
  financialLoss: horizons(loss),
  ratings: {
    operational: horizons(1),
    reputational: horizons(1),
    legal: horizons(1),
    safety: horizons(0),
  },
  mtpdOverride: null,
  notes: '',
});
