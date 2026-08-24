'use server';

import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getStore, emptyWorkspace, ConcurrentEditError } from '@/lib/data/store';
import { isAssessmentComplete } from '@/lib/domain/scoring';
import { getAuthContext, getUserId } from '@/lib/auth';
import {
  assertCan,
  assertCanWriteAssessment,
  redactWorkspaceFor,
  AUDIT_LABELS,
  type Capability,
} from '@/lib/domain/authz';
import { recordAudit } from '@/lib/data/tenancy';
import { withAiQuota } from '@/lib/ai/quota';
import type { AiStatus, AiAllowance } from '@/lib/ai/quota';
import type { AiFeature } from '@/lib/domain/plans';
import { sampleWorkspace } from '@/lib/data/sample';
import type { RiskSuggestion } from '@/lib/domain/risk-suggestions';
import type {
  Workspace,
  OrgProfile,
  BusinessProcess,
  ImpactAssessment,
  RecoveryObjectives,
  GapRemediation,
  RecoveryWorkflow,
  RecoveryStep,
  MaturityLevel,
  DependencyMap,
} from '@/lib/domain/types';

/**
 * Every mutation goes through here: it checks the caller's role against the
 * capability the action needs, then applies the change under optimistic
 * concurrency. When another member saved first the mutation is replayed
 * against fresh data rather than overwriting them, which is what stops two
 * people editing different processes from destroying each other's work.
 */
async function withWorkspace(
  capability: Capability,
  mutate: (ws: Workspace) => void,
  /** What changed, in words, for the audit trail. */
  summary?: string
): Promise<void> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, capability);
  const store = getStore();
  const orgId = ctx.organization.id;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { workspace, version } = await store.loadForUpdate(orgId);
    mutate(workspace);
    if (await store.save(orgId, workspace, version)) {
      await recordAudit({
        orgId,
        actorUserId: ctx.userId,
        actorEmail: ctx.email,
        action: capability,
        summary: summary ?? AUDIT_LABELS[capability],
      });
      revalidatePath('/', 'layout');
      return;
    }
  }
  throw new ConcurrentEditError();
}

/**
 * The workspace as this member is allowed to see it. Redaction happens here
 * rather than in the pages, so nothing a role cannot read is ever serialized
 * into the response.
 */
export async function loadWorkspace(): Promise<Workspace> {
  const ctx = await getAuthContext();
  const ws = await getStore().load(ctx.organization.id);
  return redactWorkspaceFor(ws, ctx.role);
}

/** Unredacted read for server-side work that has already checked its own access. */
async function loadWorkspaceRaw(): Promise<Workspace> {
  const ctx = await getAuthContext();
  return getStore().load(ctx.organization.id);
}

// ---------------- Org profile ----------------

/**
 * Input size caps. Everything here lands in one JSONB document that is read
 * and written whole on every action, so an unbounded string lets one field
 * slow every page for the whole organization.
 */
const SHORT = 200;
const PROSE = 4000;
const LIST_ITEMS = 50;
const short = z.string().max(SHORT);
const prose = z.string().max(PROSE);

const orgSchema = z.object({
  name: z.string().trim().min(1).max(SHORT),
  industry: z.string().trim().max(SHORT),
  regulatoryContext: z.string().trim().max(PROSE),
  annualRevenue: z.number().positive(),
  employees: z.number().int().positive(),
  riskAppetite: z.enum(['conservative', 'moderate', 'aggressive']),
  currency: z.string().trim().min(3).max(3),
});

export async function saveOrg(input: Omit<OrgProfile, 'updatedAt'>) {
  const parsed = orgSchema.parse(input);
  await withWorkspace('profile:write', (ws) => {
    ws.org = { ...parsed, updatedAt: new Date().toISOString() };
  });
}

// ---------------- Processes ----------------

const depsSchema: z.ZodType<DependencyMap> = z.object({
  people: z.array(short).max(LIST_ITEMS),
  applications: z.array(short).max(LIST_ITEMS),
  equipment: z.array(short).max(LIST_ITEMS),
  facilities: z.array(short).max(LIST_ITEMS),
  suppliers: z.array(short).max(LIST_ITEMS),
  data: z.array(short).max(LIST_ITEMS),
});

const processSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(SHORT),
  description: prose,
  owner: short,
  ownerEmail: z.string().trim().max(SHORT).optional(),
  ownerPhone: z.string().trim().max(40).optional(),
  department: short,
  usersServed: short,
  peakPeriods: short,
  dependencies: depsSchema,
  upstreamProcessIds: z.array(z.string()).max(500),
});

export async function saveProcess(input: z.infer<typeof processSchema>) {
  const parsed = processSchema.parse(input);
  const now = new Date().toISOString();
  // Minted up front so a concurrency retry reuses the same id; assigning
  // inside the closure would turn a replay into a spurious "not found".
  const id = parsed.id ?? nanoid(10);
  await withWorkspace('process:write', (ws) => {
    const existing = ws.processes.find((p) => p.id === id);
    if (existing) {
      Object.assign(existing, { ...parsed, id, updatedAt: now });
    } else {
      ws.processes.push({ ...parsed, id, createdAt: now, updatedAt: now });
    }
  }, `${parsed.id ? 'Updated' : 'Added'} process "${parsed.name}"`);
  return { id };
}

export async function deleteProcess(id: string) {
  let removed = id;
  await withWorkspace('process:write', (ws) => {
    removed = ws.processes.find((p) => p.id === id)?.name ?? id;
    ws.processes = ws.processes.filter((p) => p.id !== id);
    ws.assessments = ws.assessments.filter((a) => a.processId !== id);
    ws.objectives = ws.objectives.filter((o) => o.processId !== id);
    ws.remediations = ws.remediations.filter((r) => r.processId !== id);
    ws.workflows = ws.workflows.filter((w) => w.processId !== id);
    ws.resourceProfiles = ws.resourceProfiles.filter((r) => r.processId !== id);
    // Dead references would silently shrink each risk's derived impact.
    for (const risk of ws.risks) {
      risk.processIds = risk.processIds.filter((pid) => pid !== id);
    }
    for (const suggestion of ws.riskSuggestions) {
      suggestion.processIds = suggestion.processIds.filter((pid) => pid !== id);
    }
    // A pending request for a deleted process can never be fulfilled; the
    // signed link is refused by the process-existence check anyway.
    for (const request of ws.collectionRequests) {
      if (request.processId === id && request.status === 'sent') {
        request.status = 'revoked';
      }
    }
    for (const p of ws.processes) {
      p.upstreamProcessIds = p.upstreamProcessIds.filter((u) => u !== id);
    }
  }, `Deleted process "${removed}" and everything attached to it`);
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
      justification: z.string().trim().min(1).max(PROSE),
    })
    .nullable(),
  notes: prose,
});

export async function saveAssessment(input: z.infer<typeof assessmentSchema>) {
  const parsed = assessmentSchema.parse(input);
  const now = new Date().toISOString();
  let becameAwaitingSignOff = false;
  let processName = '';
  let processOwner = '';
  let snapshot: Workspace | null = null;
  const ctx = await getAuthContext();
  await withWorkspace('assessment:writeOwn', (ws) => {
    // Coordinators write any assessment; a contributor only their own.
    const target = ws.processes.find((p) => p.id === parsed.processId);
    if (target) assertCanWriteAssessment(ctx.member, target);
    const existing = ws.assessments.find((a) => a.processId === parsed.processId);
    const wasCompleteAndUnapproved =
      existing != null && isAssessmentComplete(existing) && !existing.approvedBy;
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
    const after = ws.assessments.find((a) => a.processId === parsed.processId)!;
    const process = ws.processes.find((p) => p.id === parsed.processId);
    processName = process?.name ?? 'a process';
    processOwner = process?.owner ?? '';
    // Notify on the transition into "complete, needs sign-off"; repeated
    // edits while already awaiting sign-off stay quiet.
    becameAwaitingSignOff = isAssessmentComplete(after) && !wasCompleteAndUnapproved;
    snapshot = ws;
  }, `Updated the impact assessment for "${processName || parsed.processId}"`);

  if (becameAwaitingSignOff && snapshot) {
    const { notifyWorkspaceUser } = await import('@/lib/email/send');
    const { signOffRequestEmail } = await import('@/lib/email/templates');
    await notifyWorkspaceUser(
      snapshot,
      await getUserId(),
      'signOffRequests',
      signOffRequestEmail({ processName, owner: processOwner })
    );
  }
}

export async function approveAssessment(processId: string, approver: string) {
  const name = approver.trim().slice(0, 100);
  if (!name) throw new Error('Approver name is required.');
  // The typed name alone would let anyone attribute a sign-off to anybody.
  // The authenticated account travels with it, so the record shows who
  // claims the approval and which login actually performed it.
  const ctx = await getAuthContext();
  const attribution =
    ctx.email && !name.toLowerCase().includes(ctx.email.toLowerCase())
      ? `${name} (${ctx.email})`
      : name;
  let approvedName = processId;
  await withWorkspace('assessment:approve', (ws) => {
    const a = ws.assessments.find((x) => x.processId === processId);
    if (!a) throw new Error('Assessment not found');
    a.approvedBy = attribution;
    a.approvedAt = new Date().toISOString();
    approvedName = ws.processes.find((p) => p.id === processId)?.name ?? processId;
  }, `Signed off the impact assessment for "${approvedName}" as ${attribution}`);
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
  dataLossNotes: prose,
});

export async function saveObjectives(input: z.infer<typeof objectivesSchema>) {
  const parsed = objectivesSchema.parse(input);
  const now = new Date().toISOString();
  await withWorkspace('objectives:write', (ws) => {
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
  owner: short,
  action: prose,
  status: z.enum(['open', 'in_progress', 'resolved', 'accepted']),
  strategy: z
    .enum([
      'workaround',
      'alternate_site',
      'standby',
      'third_party',
      'capacity',
      'data_protection',
      'accept',
    ])
    .nullable()
    .optional(),
  estimatedCost: z.number().min(0).nullable().optional(),
  targetDate: z.string().max(40).nullable().optional(),
});

export async function saveRemediation(input: z.infer<typeof remediationSchema>) {
  const parsed = remediationSchema.parse(input);
  const now = new Date().toISOString();
  await withWorkspace('objectives:write', (ws) => {
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
  vitalRecords: z.array(short).max(LIST_ITEMS),
  notes: prose,
});

export async function saveResourceProfile(
  input: z.infer<typeof resourceProfileSchema>
) {
  const parsed = resourceProfileSchema.parse(input);
  const now = new Date().toISOString();
  await withWorkspace('workflow:write', (ws) => {
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
  description: z.string().max(1000),
  team: short,
  durationHours: z.number().min(0),
  dependencies: depsSchema,
  alternateStaff: z.array(short).max(LIST_ITEMS),
});

const workflowSchema = z.object({
  processId: z.string().min(1),
  steps: z.array(stepSchema).max(200),
});

export async function saveWorkflow(input: z.infer<typeof workflowSchema>) {
  const parsed = workflowSchema.parse(input);
  const now = new Date().toISOString();
  await withWorkspace('workflow:write', (ws) => {
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

/** Question ids are short slugs; levels are the anchored 0-5 scale or null. */
const maturityAnswersSchema = z
  .record(z.string().max(64), z.number().int().min(0).max(5).nullable())
  .refine((a) => Object.keys(a).length <= 200, { message: 'Too many answers in one save' });

export async function saveMaturityAnswers(
  input: Record<string, MaturityLevel | null>
) {
  const parsed = maturityAnswersSchema.parse(input) as Record<string, MaturityLevel | null>;
  await withWorkspace('maturity:write', (ws) => {
    ws.maturity = {
      answers: { ...(ws.maturity?.answers ?? {}), ...parsed },
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
  const baseWarnings = rows.flatMap((r) => r.warnings);
  const result: ImportResult = {
    created: 0,
    updated: 0,
    assessments: 0,
    errors: rows.flatMap((r) => r.errors),
    warnings: baseWarnings,
  };
  const valid = rows.filter((r) => r.errors.length === 0);
  if (valid.length === 0) return result;

  const now = new Date().toISOString();
  // Counted per attempt and committed only after the save succeeds, so a
  // concurrency replay does not report rows twice.
  let created = 0;
  let updated = 0;
  let assessments = 0;
  await withWorkspace('process:write', (ws) => {
    created = 0;
    updated = 0;
    assessments = 0;
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
        updated++;
      } else {
        processId = nanoid(10);
        const createdRow = {
          ...fields,
          id: processId,
          upstreamProcessIds: [],
          createdAt: now,
          updatedAt: now,
        };
        ws.processes.push(createdRow);
        byName.set(row.name.toLowerCase(), createdRow);
        created++;
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
        assessments++;
      }
    }

    // Resolve upstream references once every row exists.
    const upstreamWarnings: string[] = [];
    for (const row of valid) {
      const process = byName.get(row.name.toLowerCase())!;
      const ids: string[] = [];
      for (const upstreamName of row.upstreamNames) {
        const target = byName.get(upstreamName.toLowerCase());
        if (!target) {
          upstreamWarnings.push(
            `"${row.name}": upstream process "${upstreamName}" not found; skipped`
          );
        } else if (target.id !== process.id) {
          ids.push(target.id);
        }
      }
      if (row.upstreamNames.length > 0) process.upstreamProcessIds = ids;
    }
    result.warnings = [...baseWarnings, ...upstreamWarnings];
  });

  result.created = created;
  result.updated = updated;
  result.assessments = assessments;

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
  await withWorkspace('exercise:run', (w) => {
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
  focus = focus.trim().slice(0, 1000);

  // Checked before the call, not just before the save: a member who cannot
  // run exercises must not be able to spend the organization's allowance.
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'exercise:run');
  assertCan(ctx.role, 'ai:generate');
  const ws = await loadWorkspace();
  const scenario = await withAiQuota(
    { orgId: ctx.organization.id, userId: ctx.userId },
    'exercise',
    () =>
      generateScenarioWithClaude({
        ws,
        category: base.category,
        baseTitle: base.title,
        baseSummary: base.summary,
        focus,
      })
  );

  const now = new Date().toISOString();
  const id = nanoid(10);
  await withWorkspace('exercise:run', (w) => {
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

const progressSchema = z
  .object({
    sessionId: z.string().min(1),
    currentPhase: z.number().int().min(0),
    responses: z.record(z.string(), z.string().max(5000)),
    notes: z.array(
      z.object({
        id: z.string(),
        text: z.string().max(5000),
        phase: z.number().int().nullable(),
        at: z.string(),
      })
    ),
  })
  .refine((p) => Object.keys(p.responses).length <= 1000 && p.notes.length <= 500, {
    message: 'Too much session content in one save',
  });

export async function saveExerciseProgress(input: z.infer<typeof progressSchema>) {
  const parsed = progressSchema.parse(input);
  await withWorkspace('exercise:run', (ws) => {
    const session = ws.exercises.find((e) => e.id === parsed.sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'in_progress') {
      throw new Error('This exercise is complete; its recorded responses are locked.');
    }
    session.currentPhase = parsed.currentPhase;
    session.responses = parsed.responses;
    session.notes = parsed.notes;
    session.updatedAt = new Date().toISOString();
  });
}

export async function completeExercise(sessionId: string) {
  await withWorkspace('exercise:run', (ws) => {
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

  const ctx = await getAuthContext();
  assertCan(ctx.role, 'exercise:run');
  assertCan(ctx.role, 'ai:generate');
  const report = await withAiQuota(
    { orgId: ctx.organization.id, userId: ctx.userId },
    'aar',
    () => generateAarWithClaude({ ws, session })
  );
  await withWorkspace('exercise:run', (w) => {
    const s = w.exercises.find((e) => e.id === sessionId);
    if (!s) throw new Error('Session not found');
    s.report = report;
    s.updatedAt = new Date().toISOString();
  });

  const { notifyWorkspaceUser } = await import('@/lib/email/send');
  const { aarReadyEmail } = await import('@/lib/email/templates');
  await notifyWorkspaceUser(
    ws,
    await getUserId(),
    'aarReady',
    aarReadyEmail({
      exerciseTitle: session.scenario.title,
      sessionId,
      recommendationCount: report.recommendations.length,
      highPriorityCount: report.recommendations.filter((r) => r.priority === 'high').length,
    })
  );
}

export async function deleteExercise(sessionId: string) {
  await withWorkspace('exercise:run', (ws) => {
    ws.exercises = ws.exercises.filter((e) => e.id !== sessionId);
  });
}

// ---------------- AI recovery workflow draft ----------------

export interface WorkflowDraft {
  steps: RecoveryStep[];
  assumptions: string[];
  sequencingNotes: string;
  fitsRto: boolean;
  rtoCommentary: string;
}

/**
 * Drafts a recovery workflow from the process's own assessment data. The
 * draft is returned for review rather than saved: a generated sequence is a
 * starting point for the people who would actually run it, and the person
 * accountable should press save.
 */
export async function draftWorkflowWithAi(
  processId: string,
  focus: string
): Promise<WorkflowDraft> {
  const { aiEnabled } = await import('@/lib/ai/client');
  if (!aiEnabled()) throw new Error('AI drafting requires ANTHROPIC_API_KEY to be configured.');
  const { generateWorkflowWithClaude } = await import('@/lib/ai/generate');

  // The focus is free text headed straight into the prompt; a cap keeps it
  // from inflating input tokens charged against the org's allowance.
  focus = focus.trim().slice(0, 1000);
  const ws = await loadWorkspace();
  if (!ws.processes.some((p) => p.id === processId)) throw new Error('Process not found');

  const ctx = await getAuthContext();
  assertCan(ctx.role, 'workflow:write');
  assertCan(ctx.role, 'ai:generate');
  const draft = await withAiQuota(
    { orgId: ctx.organization.id, userId: ctx.userId },
    'workflow',
    () => generateWorkflowWithClaude({ ws, processId, focus })
  );
  return {
    steps: draft.steps.map((s) => ({
      id: nanoid(8),
      description: s.description,
      team: s.team,
      durationHours: Math.max(0, s.durationHours),
      dependencies: s.dependencies,
      alternateStaff: s.alternateStaff,
    })),
    assumptions: draft.assumptions,
    sequencingNotes: draft.sequencingNotes,
    fitsRto: draft.fitsRto,
    rtoCommentary: draft.rtoCommentary,
  };
}

// ---------------- Risk suggestions ----------------

/**
 * Ask Claude for threats the structural rules cannot reach: sector and
 * regulator specifics, failure modes implied by the prose in the data, and
 * combinations. Returns suggestions for review; nothing is saved.
 */
export async function suggestRisksWithAi(): Promise<RiskSuggestion[]> {
  const ctx = await getAuthContext();
  assertCan(ctx.role, 'risk:write');
  assertCan(ctx.role, 'ai:generate');
  const { aiEnabled } = await import('@/lib/ai/client');
  if (!aiEnabled()) throw new Error('AI suggestions require ANTHROPIC_API_KEY to be configured.');

  const ws = await loadWorkspaceRaw();
  const { suggestRisks, isDuplicateSuggestion } = await import('@/lib/domain/risk-suggestions');
  const derived = suggestRisks(ws);
  const priorAi = ws.riskSuggestions ?? [];

  const { generateRiskSuggestionsWithClaude } = await import('@/lib/ai/generate');
  const result = await withAiQuota(
    { orgId: ctx.organization.id, userId: ctx.userId },
    'risk',
    () => generateRiskSuggestionsWithClaude({
    ws,
    existing: ws.risks
      .map((r) => `- ${r.title} [${r.category}] affecting ${r.processIds.length} processes`)
      .join('\n'),
    derived: derived.map((d) => `- ${d.title} [${d.category}]`).join('\n'),
    // Everything Claude proposed on earlier runs, including what the assessor
    // rejected. Repeating a dismissed suggestion is worse than repeating an
    // accepted one: the answer was already no.
    priorAi: priorAi
      .map((s) => `- ${s.title} [${s.category}]${s.status === 'dismissed' ? ' (rejected by the assessor)' : ''}`)
      .join('\n'),
    })
  );

  const byName = new Map(ws.processes.map((p) => [p.name.trim().toLowerCase(), p.id]));
  const knownDeps = new Set(
    ws.processes.flatMap((p) =>
      Object.values(p.dependencies).flat().map((d) => d.trim().toLowerCase())
    )
  );

  const candidates: RiskSuggestion[] = result.suggestions.map((s) => ({
    id: '',
    title: s.title,
    category: s.category,
    description: s.description,
    // Names are mapped back to ids here; anything that does not match a real
    // process is dropped rather than trusted.
    processIds: s.processNames
      .map((n) => byName.get(n.trim().toLowerCase()))
      .filter((id): id is string => id != null),
    dependencies: s.dependencies.filter((d) => knownDeps.has(d.trim().toLowerCase())),
    basis: s.rationale,
    source: 'ai' as const,
  }));

  // The prompt asks for novelty but cannot guarantee it, so the same test runs
  // against the register, the derived list, and every prior run. `seen` grows
  // as we go, which also catches two near-identical items in one response.
  const seen: RiskSuggestion[] = [
    ...ws.risks.map((r) => ({ ...r, basis: '', source: 'derived' as const })),
    ...derived,
    ...priorAi.map((p) => ({ ...p, source: 'ai' as const })),
  ];
  const fresh: RiskSuggestion[] = [];
  for (const c of candidates) {
    if (isDuplicateSuggestion(c, seen)) continue;
    const record = { ...c, id: nanoid(10) };
    fresh.push(record);
    seen.push(record);
  }

  const now = new Date().toISOString();
  await withWorkspace(
    'risk:write',
    (draft) => {
      draft.riskSuggestions = [
        ...(draft.riskSuggestions ?? []),
        ...fresh.map((f) => ({
          id: f.id,
          title: f.title,
          category: f.category,
          description: f.description,
          processIds: f.processIds,
          dependencies: f.dependencies,
          basis: f.basis,
          createdAt: now,
          status: 'open' as const,
        })),
      ];
    },
    `Claude suggested ${fresh.length} risk${fresh.length === 1 ? '' : 's'}` +
      (candidates.length > fresh.length
        ? ` (${candidates.length - fresh.length} duplicate${candidates.length - fresh.length === 1 ? '' : 's'} discarded)`
        : '')
  );

  // Everything still open, not just this run's additions, so the panel shows
  // one consistent list however many times the button has been pressed.
  return [
    ...priorAi
      .filter((p) => p.status === 'open')
      .map((p) => ({ ...p, source: 'ai' as const })),
    ...fresh,
  ];
}

const suggestionSnapshotSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string(),
  description: z.string(),
  processIds: z.array(z.string()),
  dependencies: z.array(z.string()),
  basis: prose,
});

/**
 * Record a decision about a suggestion so it does not come back.
 *
 * Derived suggestions are recomputed from the inventory on every load and have
 * no stored row until now, so a dismissal is stored as a tombstone carrying
 * the same id the generator produces. AI suggestions already have a row and
 * are updated in place.
 */
async function markSuggestion(
  input: z.infer<typeof suggestionSnapshotSchema>,
  status: 'dismissed' | 'added'
) {
  const snapshot = suggestionSnapshotSchema.parse(input);
  const now = new Date().toISOString();
  await withWorkspace(
    'risk:write',
    (ws) => {
      const list = ws.riskSuggestions ?? (ws.riskSuggestions = []);
      const existing = list.find((s) => s.id === snapshot.id);
      if (existing) existing.status = status;
      else list.push({ ...snapshot, createdAt: now, status });
    },
    `${status === 'dismissed' ? 'Dismissed' : 'Accepted'} suggested risk "${snapshot.title}"`
  );
}

export async function dismissRiskSuggestion(input: z.infer<typeof suggestionSnapshotSchema>) {
  await markSuggestion(input, 'dismissed');
}

export async function acceptRiskSuggestion(input: z.infer<typeof suggestionSnapshotSchema>) {
  await markSuggestion(input, 'added');
}

// ---------------- Risk register ----------------

const riskSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(SHORT),
  category: z.string().max(100),
  description: prose,
  processIds: z.array(z.string()).max(500),
  dependencies: z.array(short).max(LIST_ITEMS),
  likelihood: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  likelihoodRationale: prose,
  existingControls: prose,
  treatment: z.enum(['avoid', 'reduce', 'transfer', 'accept']).nullable(),
  treatmentAction: prose,
  owner: short,
  targetDate: z.string().max(40).nullable(),
  status: z.enum(['open', 'treating', 'treated', 'accepted']),
});

export async function saveRisk(input: z.infer<typeof riskSchema>) {
  const parsed = riskSchema.parse(input);
  const now = new Date().toISOString();
  // Minted up front so a concurrency retry reuses the same id; assigning
  // inside the closure would turn a replay into a spurious "not found".
  const id = parsed.id ?? nanoid(10);
  await withWorkspace('risk:write', (ws) => {
    const existing = ws.risks.find((r) => r.id === id);
    if (existing) {
      Object.assign(existing, { ...parsed, id, updatedAt: now });
    } else {
      ws.risks.push({ ...parsed, id, updatedAt: now });
    }
  }, `${parsed.id ? 'Updated' : 'Registered'} risk "${parsed.title}"`);
  return { id };
}

export async function deleteRisk(id: string) {
  let removed = id;
  await withWorkspace('risk:write', (ws) => {
    removed = ws.risks.find((r) => r.id === id)?.title ?? id;
    ws.risks = ws.risks.filter((r) => r.id !== id);
  }, `Deleted risk "${removed}"`);
}

// ---------------- Delegated data collection ----------------

/**
 * Ask a process owner to complete their own impact assessment through a
 * signed link. Creating a new request supersedes any earlier one for the
 * same process, so a resend invalidates the previous link.
 */
export async function requestAssessmentFromOwner(processId: string, emailOverride?: string) {
  const { createContributionToken, contributionsEnabled, CONTRIBUTION_TTL_MS } = await import(
    '@/lib/contribution/token'
  );
  if (!contributionsEnabled()) {
    return { ok: false as const, reason: 'unconfigured' as const };
  }

  const ctx = await getAuthContext();
  assertCan(ctx.role, 'collection:manage');
  const store = getStore();
  const { workspace: ws, version } = await store.loadForUpdate(ctx.organization.id);
  const process = ws.processes.find((p) => p.id === processId);
  if (!process) return { ok: false as const, reason: 'not_found' as const };

  const address = (emailOverride ?? process.ownerEmail ?? '').trim();
  if (!address) return { ok: false as const, reason: 'no_email' as const };

  const now = new Date();
  const requestId = nanoid(12);
  for (const r of ws.collectionRequests) {
    if (r.processId === processId && r.status === 'sent') r.status = 'revoked';
  }

  const token = createContributionToken({
    orgId: ctx.organization.id,
    processId,
    requestId,
    issuedAt: now.getTime(),
  });

  const { emailEnabled, APP_URL } = await import('@/lib/email/client');
  const link = `${APP_URL}/contribute/${token}`;

  // Persist first: a crash or concurrency loss after the email is sent would
  // leave the owner holding a link whose request was never recorded, and
  // submission would come back "not found".
  ws.collectionRequests.push({
    id: requestId,
    processId,
    ownerName: process.owner,
    email: address,
    status: 'sent',
    sentAt: now.toISOString(),
    submittedAt: null,
    emailed: false,
  });
  if (!(await store.save(ctx.organization.id, ws, version))) throw new ConcurrentEditError();
  revalidatePath('/', 'layout');

  let emailed = false;
  if (emailEnabled()) {
    const { getResend, EMAIL_FROM } = await import('@/lib/email/client');
    const { assessmentRequestEmail } = await import('@/lib/email/templates');
    const content = assessmentRequestEmail({
      orgName: ws.org?.name ?? 'your organization',
      processName: process.name,
      ownerName: process.owner,
      link,
      expiresInDays: Math.round(CONTRIBUTION_TTL_MS / (24 * 60 * 60 * 1000)),
    });
    try {
      const { error } = await getResend().emails.send({
        from: EMAIL_FROM,
        to: address,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
      if (error) console.error('[email] assessment request failed:', error.message ?? error);
      else emailed = true;
    } catch (e) {
      console.error('[email] assessment request threw:', e instanceof Error ? e.message : e);
    }
    // Record whether delivery worked; the request already exists either way
    // and the link is returned so the coordinator can pass it on by hand.
    await withWorkspace('collection:manage', (w) => {
      const stored = w.collectionRequests.find((r) => r.id === requestId);
      if (stored) stored.emailed = emailed;
    });
  }

  return { ok: true as const, link, emailed };
}

export async function revokeAssessmentRequest(requestId: string) {
  await withWorkspace('collection:manage', (ws) => {
    const request = ws.collectionRequests.find((r) => r.id === requestId);
    if (request) request.status = 'revoked';
  });
}

// ---------------- Continuity plan (activation & comms) ----------------

const planSchema = z.object({
  declarationAuthority: short,
  standDownAuthority: short,
  commandLocation: short,
  bridgeDetails: short,
  team: z.array(
    z.object({
      id: z.string(),
      role: short,
      name: short,
      title: short,
      email: short,
      phone: z.string().max(40),
      deputy: short,
      deputyPhone: z.string().max(40),
    })
  ).max(50),
  triggers: z.array(
    z.object({
      id: z.string(),
      level: z.enum(['monitor', 'partial', 'full']),
      condition: prose,
      authority: short,
    })
  ).max(20),
  communications: z.array(
    z.object({
      id: z.string(),
      audience: short,
      channel: short,
      timing: short,
      owner: short,
      keyMessage: prose,
    })
  ).max(30),
});

export async function savePlan(input: z.infer<typeof planSchema>) {
  const parsed = planSchema.parse(input);
  await withWorkspace('plan:write', (ws) => {
    ws.plan = { ...parsed, updatedAt: new Date().toISOString() };
  });
}

// ---------------- Notification preferences ----------------

const notificationPrefsSchema = z.object({
  signOffRequests: z.boolean(),
  aarReady: z.boolean(),
  reviewReminders: z.boolean(),
});

export async function saveNotificationPrefs(
  input: z.infer<typeof notificationPrefsSchema>
) {
  const parsed = notificationPrefsSchema.parse(input);
  await withWorkspace('notifications:manage', (ws) => {
    ws.notifications = parsed;
  });
}

/**
 * A member's personal mutes, on top of the organization defaults. Stored
 * per user id inside the workspace document; an absent entry means the
 * category simply follows the org toggle.
 */
export async function saveMyNotificationPrefs(
  input: z.infer<typeof notificationPrefsSchema>
) {
  const parsed = notificationPrefsSchema.parse(input);
  const userId = await getUserId();
  await withWorkspace(
    'notifications:self',
    (ws) => {
      const all = ws.emailOptOuts ?? (ws.emailOptOuts = {});
      all[userId] = { ...all[userId], ...parsed };
    },
    'Updated personal email notification preferences'
  );
}

// ---------------- Workspace utilities ----------------

export async function loadSampleData() {
  await withWorkspace('workspace:destroy', (ws) => {
    Object.assign(ws, sampleWorkspace());
  }, 'Replaced the entire workspace with the sample dataset');
}

export async function resetWorkspace() {
  await withWorkspace('workspace:destroy', (ws) => {
    Object.assign(ws, emptyWorkspace());
  }, 'Erased the entire workspace');
}

export async function importWorkspace(json: string) {
  // Capped before parsing: the workspace is one document read whole forever
  // after, so a bloated import is a permanent tax on every action.
  if (json.length > 20_000_000) throw new Error('That export is too large to import.');
  const parsed = JSON.parse(json) as Workspace;
  // Minimal shape check; detailed validation happens on next edit of each record.
  if (typeof parsed !== 'object' || parsed === null || !Array.isArray(parsed.processes)) {
    throw new Error('Not a valid workspace export');
  }
  await withWorkspace('workspace:destroy', (ws) => {
    Object.assign(ws, { ...emptyWorkspace(), ...parsed });
  });
}

// ---------------- AI plan limits ----------------

/**
 * Whether a given AI control can be used right now, and why not if it cannot.
 * Pages call this so a control that would fail is disabled with the real
 * reason attached, rather than looking available and erroring on click.
 */
export async function getAiStatus(feature: AiFeature): Promise<AiStatus> {
  const { aiEnabled } = await import('@/lib/ai/client');
  if (!aiEnabled()) return { enabled: false, blockedReason: null, allowance: null };
  const ctx = await getAuthContext();
  const { allowanceFor, blockedReason } = await import('@/lib/ai/quota');
  const allowance = await allowanceFor(ctx.organization.id);
  return { enabled: true, blockedReason: blockedReason(allowance, feature), allowance };
}

/** The organization's full AI standing, for the usage panel. */
export async function getAiAllowance(): Promise<AiAllowance | null> {
  const { aiEnabled } = await import('@/lib/ai/client');
  if (!aiEnabled()) return null;
  const ctx = await getAuthContext();
  const { allowanceFor } = await import('@/lib/ai/quota');
  return allowanceFor(ctx.organization.id);
}
