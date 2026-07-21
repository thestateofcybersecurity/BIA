'use server';

import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getStore, emptyWorkspace } from '@/lib/data/store';
import { getUserId } from '@/lib/auth';
import { sampleWorkspace } from '@/lib/data/sample';
import type {
  Workspace,
  OrgProfile,
  BusinessProcess,
  ImpactAssessment,
  RecoveryObjectives,
  GapRemediation,
  RecoveryWorkflow,
  MaturityLevel,
  DependencyMap,
} from '@/lib/domain/types';

async function withWorkspace(
  mutate: (ws: Workspace) => void
): Promise<void> {
  const userId = await getUserId();
  const store = getStore();
  const ws = await store.load(userId);
  mutate(ws);
  await store.save(userId, ws);
  revalidatePath('/', 'layout');
}

export async function loadWorkspace(): Promise<Workspace> {
  const userId = await getUserId();
  return getStore().load(userId);
}

// ---------------- Org profile ----------------

const orgSchema = z.object({
  name: z.string().trim().min(1),
  industry: z.string().trim(),
  regulatoryContext: z.string().trim(),
  annualRevenue: z.number().positive(),
  employees: z.number().int().positive(),
  riskAppetite: z.enum(['conservative', 'moderate', 'aggressive']),
  currency: z.string().trim().min(3).max(3),
});

export async function saveOrg(input: Omit<OrgProfile, 'updatedAt'>) {
  const parsed = orgSchema.parse(input);
  await withWorkspace((ws) => {
    ws.org = { ...parsed, updatedAt: new Date().toISOString() };
  });
}

// ---------------- Processes ----------------

const depsSchema: z.ZodType<DependencyMap> = z.object({
  people: z.array(z.string()),
  applications: z.array(z.string()),
  equipment: z.array(z.string()),
  facilities: z.array(z.string()),
  suppliers: z.array(z.string()),
  data: z.array(z.string()),
});

const processSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  description: z.string(),
  owner: z.string(),
  department: z.string(),
  usersServed: z.string(),
  peakPeriods: z.string(),
  dependencies: depsSchema,
  upstreamProcessIds: z.array(z.string()),
});

export async function saveProcess(input: z.infer<typeof processSchema>) {
  const parsed = processSchema.parse(input);
  const now = new Date().toISOString();
  let id = parsed.id;
  await withWorkspace((ws) => {
    if (id) {
      const existing = ws.processes.find((p) => p.id === id);
      if (!existing) throw new Error('Process not found');
      Object.assign(existing, { ...parsed, id, updatedAt: now });
    } else {
      id = nanoid(10);
      ws.processes.push({ ...parsed, id, createdAt: now, updatedAt: now });
    }
  });
  return { id: id! };
}

export async function deleteProcess(id: string) {
  await withWorkspace((ws) => {
    ws.processes = ws.processes.filter((p) => p.id !== id);
    ws.assessments = ws.assessments.filter((a) => a.processId !== id);
    ws.objectives = ws.objectives.filter((o) => o.processId !== id);
    ws.remediations = ws.remediations.filter((r) => r.processId !== id);
    ws.workflows = ws.workflows.filter((w) => w.processId !== id);
    ws.resourceProfiles = ws.resourceProfiles.filter((r) => r.processId !== id);
    for (const p of ws.processes) {
      p.upstreamProcessIds = p.upstreamProcessIds.filter((u) => u !== id);
    }
  });
}

// ---------------- Impact assessment ----------------

const severity = z.union([
  z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4),
]).nullable();

const horizonRecord = <T extends z.ZodTypeAny>(v: T) =>
  z.object({ h4: v, h24: v, d3: v, w1: v, m1: v });

const assessmentSchema = z.object({
  processId: z.string().min(1),
  financialLoss: horizonRecord(z.number().min(0).nullable()),
  ratings: z.object({
    operational: horizonRecord(severity),
    reputational: horizonRecord(severity),
    legal: horizonRecord(severity),
    safety: horizonRecord(severity),
  }),
  mtpdOverride: z
    .object({
      value: z.enum(['h4', 'h24', 'd3', 'w1', 'm1', 'beyond']),
      justification: z.string().trim().min(1),
    })
    .nullable(),
  notes: z.string(),
});

export async function saveAssessment(input: z.infer<typeof assessmentSchema>) {
  const parsed = assessmentSchema.parse(input);
  const now = new Date().toISOString();
  await withWorkspace((ws) => {
    const existing = ws.assessments.find((a) => a.processId === parsed.processId);
    if (existing) {
      // Any edit invalidates the owner's sign-off; it must be re-approved.
      Object.assign(existing, {
        ...parsed,
        id: existing.id,
        updatedAt: now,
        approvedBy: null,
        approvedAt: null,
      });
    } else {
      ws.assessments.push({
        ...parsed,
        id: nanoid(10),
        updatedAt: now,
        approvedBy: null,
        approvedAt: null,
      } as ImpactAssessment);
    }
  });
}

export async function approveAssessment(processId: string, approver: string) {
  const name = approver.trim();
  if (!name) throw new Error('Approver name is required.');
  await withWorkspace((ws) => {
    const a = ws.assessments.find((x) => x.processId === processId);
    if (!a) throw new Error('Assessment not found');
    a.approvedBy = name;
    a.approvedAt = new Date().toISOString();
  });
}

// ---------------- Recovery objectives ----------------

const objectivesSchema = z.object({
  processId: z.string().min(1),
  rtoTargetHours: z.number().min(0).nullable(),
  rpoTargetHours: z.number().min(0).nullable(),
  mbcoPercent: z.number().min(0).max(100).nullable(),
  rtoAchievableHours: z.number().min(0).nullable(),
  rpoAchievableHours: z.number().min(0).nullable(),
  wrtHours: z.number().min(0).nullable(),
  dataLossNotes: z.string(),
});

export async function saveObjectives(input: z.infer<typeof objectivesSchema>) {
  const parsed = objectivesSchema.parse(input);
  const now = new Date().toISOString();
  await withWorkspace((ws) => {
    const existing = ws.objectives.find((o) => o.processId === parsed.processId);
    if (existing) {
      Object.assign(existing, { ...parsed, id: existing.id, updatedAt: now });
    } else {
      ws.objectives.push({ ...parsed, id: nanoid(10), updatedAt: now } as RecoveryObjectives);
    }
  });
}

const remediationSchema = z.object({
  processId: z.string().min(1),
  kind: z.enum(['rto', 'rpo']),
  owner: z.string(),
  action: z.string(),
  status: z.enum(['open', 'in_progress', 'resolved', 'accepted']),
});

export async function saveRemediation(input: z.infer<typeof remediationSchema>) {
  const parsed = remediationSchema.parse(input);
  const now = new Date().toISOString();
  await withWorkspace((ws) => {
    const existing = ws.remediations.find(
      (r) => r.processId === parsed.processId && r.kind === parsed.kind
    );
    if (existing) {
      Object.assign(existing, { ...parsed, id: existing.id, updatedAt: now });
    } else {
      ws.remediations.push({ ...parsed, id: nanoid(10), updatedAt: now } as GapRemediation);
    }
  });
}

// ---------------- Recovery resource profiles ----------------

const horizonNumbers = horizonRecord(z.number().min(0).nullable());

const resourceProfileSchema = z.object({
  processId: z.string().min(1),
  staff: horizonNumbers,
  workstations: horizonNumbers,
  facilitySeats: horizonNumbers,
  vitalRecords: z.array(z.string()),
  notes: z.string(),
});

export async function saveResourceProfile(
  input: z.infer<typeof resourceProfileSchema>
) {
  const parsed = resourceProfileSchema.parse(input);
  const now = new Date().toISOString();
  await withWorkspace((ws) => {
    const existing = ws.resourceProfiles.find((r) => r.processId === parsed.processId);
    if (existing) {
      Object.assign(existing, { ...parsed, id: existing.id, updatedAt: now });
    } else {
      ws.resourceProfiles.push({ ...parsed, id: nanoid(10), updatedAt: now });
    }
  });
}

// ---------------- Recovery workflows ----------------

const stepSchema = z.object({
  id: z.string(),
  description: z.string(),
  team: z.string(),
  durationHours: z.number().min(0),
  dependencies: depsSchema,
  alternateStaff: z.array(z.string()),
});

const workflowSchema = z.object({
  processId: z.string().min(1),
  steps: z.array(stepSchema),
});

export async function saveWorkflow(input: z.infer<typeof workflowSchema>) {
  const parsed = workflowSchema.parse(input);
  const now = new Date().toISOString();
  await withWorkspace((ws) => {
    const existing = ws.workflows.find((w) => w.processId === parsed.processId);
    if (existing) {
      existing.steps = parsed.steps;
      existing.updatedAt = now;
    } else {
      ws.workflows.push({ ...parsed, id: nanoid(10), updatedAt: now } as RecoveryWorkflow);
    }
  });
}

// ---------------- Maturity ----------------

export async function saveMaturityAnswers(
  answers: Record<string, MaturityLevel | null>
) {
  await withWorkspace((ws) => {
    ws.maturity = {
      answers: { ...(ws.maturity?.answers ?? {}), ...answers },
      updatedAt: new Date().toISOString(),
    };
  });
}

// ---------------- CSV bulk import ----------------

export interface ImportResult {
  created: number;
  updated: number;
  assessments: number;
  errors: string[];
  warnings: string[];
}

/**
 * Bulk import processes (and optional impact assessments) from parsed CSV
 * records. Upserts by process name (case-insensitive); upstream references
 * are resolved by name after all rows are applied.
 */
export async function importCsv(
  records: Record<string, string>[]
): Promise<ImportResult> {
  const { parseCsvRecord } = await import('@/lib/domain/csv');
  const rows = records.map((r, i) => parseCsvRecord(r, i + 2));
  const result: ImportResult = {
    created: 0,
    updated: 0,
    assessments: 0,
    errors: rows.flatMap((r) => r.errors),
    warnings: rows.flatMap((r) => r.warnings),
  };
  const valid = rows.filter((r) => r.errors.length === 0);
  if (valid.length === 0) return result;

  const now = new Date().toISOString();
  await withWorkspace((ws) => {
    const byName = new Map(ws.processes.map((p) => [p.name.toLowerCase(), p]));

    for (const row of valid) {
      const existing = byName.get(row.name.toLowerCase());
      const fields = {
        name: row.name,
        description: row.description,
        owner: row.owner,
        department: row.department,
        usersServed: row.usersServed,
        peakPeriods: row.peakPeriods,
        dependencies: row.dependencies,
      };
      let processId: string;
      if (existing) {
        Object.assign(existing, fields, { updatedAt: now });
        processId = existing.id;
        result.updated++;
      } else {
        processId = nanoid(10);
        const created = {
          ...fields,
          id: processId,
          upstreamProcessIds: [],
          createdAt: now,
          updatedAt: now,
        };
        ws.processes.push(created);
        byName.set(row.name.toLowerCase(), created);
        result.created++;
      }

      if (row.hasAssessment) {
        const assessment = ws.assessments.find((a) => a.processId === processId);
        const payload = {
          financialLoss: row.losses,
          ratings: row.ratings,
          mtpdOverride: null,
          notes: '',
          updatedAt: now,
        };
        if (assessment) {
          Object.assign(assessment, payload);
        } else {
          ws.assessments.push({ id: nanoid(10), processId, ...payload });
        }
        result.assessments++;
      }
    }

    // Resolve upstream references once every row exists.
    for (const row of valid) {
      const process = byName.get(row.name.toLowerCase())!;
      const ids: string[] = [];
      for (const upstreamName of row.upstreamNames) {
        const target = byName.get(upstreamName.toLowerCase());
        if (!target) {
          result.warnings.push(
            `"${row.name}": upstream process "${upstreamName}" not found; skipped`
          );
        } else if (target.id !== process.id) {
          ids.push(target.id);
        }
      }
      if (row.upstreamNames.length > 0) process.upstreamProcessIds = ids;
    }
  });

  return result;
}

// ---------------- Tabletop exercise sessions ----------------

export async function startLibraryExercise(scenarioId: string): Promise<{ id: string }> {
  const { generateScenario } = await import('@/lib/domain/scenarios');
  const ws = await loadWorkspace();
  const scenario = generateScenario(ws, scenarioId);
  if (!scenario) throw new Error('Unknown scenario');
  const now = new Date().toISOString();
  const id = nanoid(10);
  await withWorkspace((w) => {
    w.exercises.push({
      id,
      scenarioId,
      mode: 'library',
      focus: '',
      scenario,
      status: 'in_progress',
      currentPhase: 0,
      responses: {},
      notes: [],
      report: null,
      createdAt: now,
      updatedAt: now,
    });
  });
  return { id };
}

export async function startAiExercise(
  scenarioId: string,
  focus: string
): Promise<{ id: string }> {
  const { aiEnabled } = await import('@/lib/ai/client');
  if (!aiEnabled()) throw new Error('AI generation requires ANTHROPIC_API_KEY to be configured.');
  const { CATALOG } = await import('@/lib/domain/scenarios');
  const { generateScenarioWithClaude } = await import('@/lib/ai/generate');

  const base = CATALOG.find((s) => s.id === scenarioId);
  if (!base) throw new Error('Unknown scenario');

  const ws = await loadWorkspace();
  const scenario = await generateScenarioWithClaude({
    ws,
    category: base.category,
    baseTitle: base.title,
    baseSummary: base.summary,
    focus,
  });

  const now = new Date().toISOString();
  const id = nanoid(10);
  await withWorkspace((w) => {
    w.exercises.push({
      id,
      scenarioId,
      mode: 'ai',
      focus,
      scenario,
      status: 'in_progress',
      currentPhase: 0,
      responses: {},
      notes: [],
      report: null,
      createdAt: now,
      updatedAt: now,
    });
  });
  return { id };
}

const progressSchema = z.object({
  sessionId: z.string().min(1),
  currentPhase: z.number().int().min(0),
  responses: z.record(z.string(), z.string()),
  notes: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      phase: z.number().int().nullable(),
      at: z.string(),
    })
  ),
});

export async function saveExerciseProgress(input: z.infer<typeof progressSchema>) {
  const parsed = progressSchema.parse(input);
  await withWorkspace((ws) => {
    const session = ws.exercises.find((e) => e.id === parsed.sessionId);
    if (!session) throw new Error('Session not found');
    session.currentPhase = parsed.currentPhase;
    session.responses = parsed.responses;
    session.notes = parsed.notes;
    session.updatedAt = new Date().toISOString();
  });
}

export async function completeExercise(sessionId: string) {
  await withWorkspace((ws) => {
    const session = ws.exercises.find((e) => e.id === sessionId);
    if (!session) throw new Error('Session not found');
    session.status = 'completed';
    session.updatedAt = new Date().toISOString();
  });
}

export async function generateExerciseReport(sessionId: string) {
  const { aiEnabled } = await import('@/lib/ai/client');
  if (!aiEnabled()) throw new Error('The after-action report requires ANTHROPIC_API_KEY to be configured.');
  const { generateAarWithClaude } = await import('@/lib/ai/generate');

  const ws = await loadWorkspace();
  const session = ws.exercises.find((e) => e.id === sessionId);
  if (!session) throw new Error('Session not found');
  if (session.status !== 'completed') throw new Error('Complete the exercise before generating the report.');

  const report = await generateAarWithClaude({ ws, session });
  await withWorkspace((w) => {
    const s = w.exercises.find((e) => e.id === sessionId);
    if (!s) throw new Error('Session not found');
    s.report = report;
    s.updatedAt = new Date().toISOString();
  });
}

export async function deleteExercise(sessionId: string) {
  await withWorkspace((ws) => {
    ws.exercises = ws.exercises.filter((e) => e.id !== sessionId);
  });
}

// ---------------- Workspace utilities ----------------

export async function loadSampleData() {
  await withWorkspace((ws) => {
    Object.assign(ws, sampleWorkspace());
  });
}

export async function resetWorkspace() {
  await withWorkspace((ws) => {
    Object.assign(ws, emptyWorkspace());
  });
}

export async function importWorkspace(json: string) {
  const parsed = JSON.parse(json) as Workspace;
  // Minimal shape check; detailed validation happens on next edit of each record.
  if (typeof parsed !== 'object' || parsed === null || !Array.isArray(parsed.processes)) {
    throw new Error('Not a valid workspace export');
  }
  await withWorkspace((ws) => {
    Object.assign(ws, { ...emptyWorkspace(), ...parsed });
  });
}
