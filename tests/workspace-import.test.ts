import { describe, expect, it } from 'vitest';
import { parseWorkspaceImport, WORKSPACE_IMPORT_MAX_CHARS } from '@/lib/domain/schemas';
import { sampleWorkspace } from '@/lib/data/sample';
import { emptyWorkspace } from '@/lib/data/store';

describe('parseWorkspaceImport', () => {
  it('accepts the sample workspace exactly as the app exports it', () => {
    const sample = sampleWorkspace();
    const result = parseWorkspaceImport(JSON.stringify(sample));
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;
    expect(result.workspace.processes).toHaveLength(sample.processes.length);
    expect(result.workspace.assessments).toHaveLength(sample.assessments.length);
    expect(result.workspace.risks).toHaveLength(sample.risks.length);
    expect(result.workspace.plan?.team).toHaveLength(sample.plan!.team.length);
    expect(result.workspace.maturity?.answers).toEqual(sample.maturity!.answers);
  });

  it('accepts an empty workspace and fills missing collections', () => {
    const result = parseWorkspaceImport(JSON.stringify({ processes: [] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workspace).toMatchObject({ ...emptyWorkspace(), processes: [] });
  });

  it('rejects files over the size cap before parsing', () => {
    const big = `{"processes":[],"pad":"${'x'.repeat(WORKSPACE_IMPORT_MAX_CHARS)}"}`;
    const result = parseWorkspaceImport(big);
    expect(result).toEqual({
      ok: false,
      message: 'That export is too large to import (the limit is 5 MB).',
    });
  });

  it('rejects non-JSON, non-objects, and documents without a process list', () => {
    expect(parseWorkspaceImport('not json').ok).toBe(false);
    expect(parseWorkspaceImport('[]').ok).toBe(false);
    expect(parseWorkspaceImport('null').ok).toBe(false);
    const missing = parseWorkspaceImport('{"org":null}');
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.message).toContain('processes');
  });

  it('rejects malformed records instead of letting them into the document', () => {
    const sample = sampleWorkspace();
    const broken = {
      ...sample,
      processes: sample.processes.map((p, i) =>
        i === 0 ? { ...p, dependencies: undefined } : p
      ),
    };
    const result = parseWorkspaceImport(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/processes\.0\.dependencies/);

    const oversized = {
      ...sample,
      assessments: [{ ...sample.assessments[0], notes: 'n'.repeat(4001) }],
    };
    expect(parseWorkspaceImport(JSON.stringify(oversized)).ok).toBe(false);

    const badEnum = { ...sample, risks: [{ ...sample.risks[0], status: 'whatever' }] };
    expect(parseWorkspaceImport(JSON.stringify(badEnum)).ok).toBe(false);
  });

  it('drops unknown keys and never takes personal mutes from the file', () => {
    const doc = {
      processes: [],
      emailOptOuts: { 'user-1': { signOffRequests: false } },
      __proto__polluted: true,
      planted: { scopedProcessIds: ['x'] },
    };
    const result = parseWorkspaceImport(JSON.stringify(doc));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect('emailOptOuts' in result.workspace).toBe(false);
    expect('planted' in result.workspace).toBe(false);
  });
});
