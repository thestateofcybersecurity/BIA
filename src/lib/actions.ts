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
      Object.assign(existing, { ...parsed, id: existing.id, updatedAt: now });
    } else {
      ws.assessments.push({ ...parsed, id: nanoid(10), updatedAt: now } as ImpactAssessment);
    }
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
