import { describe, expect, it } from 'vitest';
import {
  canWriteAssessment,
  ownsProcess,
  redactWorkspaceFor,
  visibleProcessIds,
  type MemberContext,
} from '@/lib/domain/authz';
import { emptyWorkspace } from '@/lib/data/store';
import type { BusinessProcess, ImpactAssessment } from '@/lib/domain/types';

const member = (over: Partial<MemberContext>): MemberContext => ({
  userId: 'u1',
  email: 'dana@example.com',
  emailVerified: true,
  role: 'contributor',
  scopedProcessIds: [],
  ...over,
});

const process = (id: string, ownerEmail?: string): BusinessProcess => ({
  id,
  name: id,
  description: '',
  owner: 'Someone',
  ownerEmail,
  department: '',
  usersServed: '',
  peakPeriods: '',
  dependencies: { people: [], applications: [], equipment: [], facilities: [], suppliers: [], data: [] },
  upstreamProcessIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const assessment = (processId: string): ImpactAssessment => ({
  id: `a-${processId}`,
  processId,
  financialLoss: { h4: 1, h24: 2, d3: 3, w1: 4, m1: 5 },
  ratings: {
    operational: { h4: 1, h24: 1, d3: 2, w1: 3, m1: 4 },
    reputational: { h4: 0, h24: 1, d3: 1, w1: 2, m1: 3 },
    legal: { h4: 0, h24: 0, d3: 1, w1: 1, m1: 2 },
    safety: { h4: 0, h24: 0, d3: 0, w1: 0, m1: 1 },
  },
  mtpdOverride: null,
  notes: 'confidential loss notes',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const mine = process('mine', 'Dana@Example.com');
const theirs = process('theirs', 'other@example.com');
const unowned = process('unowned');

describe('ownsProcess', () => {
  it('matches the owner email case-insensitively for a verified contributor', () => {
    expect(ownsProcess(member({}), mine)).toBe(true);
    expect(ownsProcess(member({}), theirs)).toBe(false);
    expect(ownsProcess(member({}), unowned)).toBe(false);
  });

  it('refuses every match while the address is unverified, even an explicit assignment', () => {
    const unverified = member({ emailVerified: false });
    expect(ownsProcess(unverified, mine)).toBe(false);
    expect(ownsProcess(member({ emailVerified: false, scopedProcessIds: ['theirs'] }), theirs)).toBe(
      false
    );
    expect(ownsProcess(member({ scopedProcessIds: ['theirs'] }), theirs)).toBe(true);
  });

  it('gates contributor write access accordingly', () => {
    expect(canWriteAssessment(member({}), mine)).toBe(true);
    expect(canWriteAssessment(member({ emailVerified: false }), mine)).toBe(false);
    expect(canWriteAssessment(member({ role: 'viewer' }), mine)).toBe(false);
    expect(canWriteAssessment(member({ role: 'coordinator', emailVerified: false }), theirs)).toBe(
      true
    );
  });
});

describe('visibleProcessIds and redactWorkspaceFor', () => {
  const ws = {
    ...emptyWorkspace(),
    processes: [mine, theirs, unowned],
    assessments: [assessment('mine'), assessment('theirs'), assessment('unowned')],
  };

  it('limits a contributor to the assessments of the processes they own', () => {
    expect(visibleProcessIds(member({}), ws.processes)).toEqual(['mine']);
    const seen = redactWorkspaceFor(ws, member({}));
    expect(seen.assessments.map((a) => a.processId)).toEqual(['mine']);
    // The inventory itself stays visible.
    expect(seen.processes.map((p) => p.id)).toEqual(['mine', 'theirs', 'unowned']);
  });

  it('gives an unverified contributor no assessment detail at all', () => {
    const seen = redactWorkspaceFor(ws, member({ emailVerified: false }));
    expect(seen.assessments).toEqual([]);
  });

  it('leaves coordinators and viewers with the full read view', () => {
    for (const role of ['viewer', 'coordinator', 'admin', 'owner'] as const) {
      expect(visibleProcessIds(member({ role }), ws.processes)).toEqual([
        'mine',
        'theirs',
        'unowned',
      ]);
      expect(redactWorkspaceFor(ws, member({ role })).assessments).toHaveLength(3);
    }
  });

  it('still strips the sensitive sections for the lower roles', () => {
    const viewer = redactWorkspaceFor(
      { ...ws, risks: [{ id: 'r' }], plan: { declarationAuthority: 'x' } },
      member({ role: 'viewer' })
    );
    expect(viewer.risks).toEqual([]);
    expect(viewer.plan).toBeNull();
    expect(viewer.processes.every((p) => !('ownerEmail' in p))).toBe(true);
  });
});
