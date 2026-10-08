import { z } from 'zod';
import type { DependencyMap, Workspace } from '@/lib/domain/types';

/**
 * Zod schemas for every record the actions accept, shared with the workspace
 * import so an exported file is validated the same way as a form. Kept out
 * of actions.ts because a 'use server' module may export only async
 * functions.
 */

/**
 * Input size caps. Everything here lands in one JSONB document that is read
 * and written whole on every action, so an unbounded string lets one field
 * slow every page for the whole organization.
 */
export const SHORT = 200;
export const PROSE = 4000;
export const LIST_ITEMS = 50;
export const short = z.string().max(SHORT);
export const prose = z.string().max(PROSE);

export const orgSchema = z.object({
  name: z.string().trim().min(1).max(SHORT),
  industry: z.string().trim().max(SHORT),
  regulatoryContext: z.string().trim().max(PROSE),
  annualRevenue: z.number().positive(),
  employees: z.number().int().positive(),
  riskAppetite: z.enum(['conservative', 'moderate', 'aggressive']),
  currency: z.string().trim().min(3).max(3),
});

export const depsSchema: z.ZodType<DependencyMap> = z.object({
  people: z.array(short).max(LIST_ITEMS),
  applications: z.array(short).max(LIST_ITEMS),
  equipment: z.array(short).max(LIST_ITEMS),
  facilities: z.array(short).max(LIST_ITEMS),
  suppliers: z.array(short).max(LIST_ITEMS),
  data: z.array(short).max(LIST_ITEMS),
});

export const processSchema = z.object({
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

export const severity = z.union([
  z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4),
]).nullable();

export const horizonRecord = <T extends z.ZodTypeAny>(v: T) =>
  z.object({ h4: v, h24: v, d3: v, w1: v, m1: v });

export const assessmentSchema = z.object({
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

export const objectivesSchema = z.object({
  processId: z.string().min(1),
  rtoTargetHours: z.number().min(0).nullable(),
  rpoTargetHours: z.number().min(0).nullable(),
  mbcoPercent: z.number().min(0).max(100).nullable(),
  rtoAchievableHours: z.number().min(0).nullable(),
  rpoAchievableHours: z.number().min(0).nullable(),
  wrtHours: z.number().min(0).nullable(),
  dataLossNotes: prose,
});

export const remediationSchema = z.object({
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

export const horizonNumbers = horizonRecord(z.number().min(0).nullable());

export const resourceProfileSchema = z.object({
  processId: z.string().min(1),
  staff: horizonNumbers,
  workstations: horizonNumbers,
  facilitySeats: horizonNumbers,
  vitalRecords: z.array(short).max(LIST_ITEMS),
  notes: prose,
});

export const stepSchema = z.object({
  id: z.string(),
  description: z.string().max(1000),
  team: short,
  durationHours: z.number().min(0),
  dependencies: depsSchema,
  alternateStaff: z.array(short).max(LIST_ITEMS),
});

export const workflowSchema = z.object({
  processId: z.string().min(1),
  steps: z.array(stepSchema).max(200),
});

/** Question ids are short slugs; levels are the anchored 0-5 scale or null. */
export const maturityAnswersSchema = z
  .record(z.string().max(64), z.number().int().min(0).max(5).nullable())
  .refine((a) => Object.keys(a).length <= 200, { message: 'Too many answers in one save' });

export const progressSchema = z
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

export const suggestionSnapshotSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string(),
  description: z.string(),
  processIds: z.array(z.string()),
  dependencies: z.array(z.string()),
  basis: prose,
});

export const riskSchema = z.object({
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

export const planSchema = z.object({
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

export const notificationPrefsSchema = z.object({
  signOffRequests: z.boolean(),
  aarReady: z.boolean(),
  reviewReminders: z.boolean(),
});


// ---------------- Workspace import ----------------

/** Characters of JSON accepted by the import; roughly 5 MB. */
export const WORKSPACE_IMPORT_MAX_CHARS = 5 * 1024 * 1024;
/** Records accepted per collection in one import. */
const RECORDS = 5000;

const stamp = z.string().max(40);
const id = z.string().min(1).max(64);
const text = (max: number) => z.string().max(max);
const stringList = (max = LIST_ITEMS) => z.array(text(PROSE)).max(max);

const importedProcessSchema = processSchema.extend({ id, createdAt: stamp, updatedAt: stamp });

const importedAssessmentSchema = assessmentSchema.extend({
  id,
  updatedAt: stamp,
  approvedBy: z.string().max(SHORT).nullable().optional(),
  approvedAt: stamp.nullable().optional(),
});

const importedObjectivesSchema = objectivesSchema.extend({
  id,
  updatedAt: stamp,
  wrtHours: z.number().min(0).nullable().optional(),
});

const importedRemediationSchema = remediationSchema.extend({ id, updatedAt: stamp });
const importedWorkflowSchema = workflowSchema.extend({ id, updatedAt: stamp });
const importedResourceProfileSchema = resourceProfileSchema.extend({ id, updatedAt: stamp });
const importedRiskSchema = riskSchema.extend({ id, updatedAt: stamp });

const importedRiskSuggestionSchema = z.object({
  id,
  title: text(SHORT),
  category: text(100),
  description: prose,
  processIds: z.array(z.string().max(64)).max(500),
  dependencies: stringList(),
  basis: prose,
  createdAt: stamp,
  status: z.enum(['open', 'dismissed', 'added']),
});

const importedCollectionRequestSchema = z.object({
  id,
  processId: id,
  ownerName: short,
  email: short,
  status: z.enum(['sent', 'submitted', 'revoked']),
  sentAt: stamp,
  submittedAt: stamp.nullable().optional(),
  emailed: z.boolean(),
});

const scenarioPhaseSchema = z.object({
  title: text(SHORT),
  narrative: text(PROSE * 2),
  injects: stringList(),
  discussion: stringList(),
  expectedActions: stringList(),
});

const scenarioSchema = z.object({
  id,
  title: text(SHORT),
  category: text(100),
  duration: text(100),
  objective: prose,
  contextNotes: stringList(),
  phases: z.array(scenarioPhaseSchema).max(20),
  evaluates: z.array(text(64)).max(LIST_ITEMS),
});

const afterActionReportSchema = z.object({
  executiveSummary: text(PROSE * 2),
  timeline: z.array(z.object({ phase: text(SHORT), summary: prose })).max(LIST_ITEMS),
  strengths: stringList(),
  gaps: stringList(),
  recommendations: z
    .array(
      z.object({
        priority: z.enum(['high', 'medium', 'low']),
        item: prose,
        rationale: prose,
        suggestedOwner: short,
      })
    )
    .max(LIST_ITEMS),
  followUps: z
    .array(z.object({ item: prose, suggestedOwner: short, suggestedDue: text(100) }))
    .max(LIST_ITEMS),
  maturitySignals: z
    .array(z.object({ domainId: text(64), observation: prose }))
    .max(LIST_ITEMS),
  generatedAt: stamp,
});

const importedExerciseSchema = z.object({
  id,
  scenarioId: text(64),
  mode: z.enum(['library', 'ai']),
  focus: text(1000),
  scenario: scenarioSchema,
  status: z.enum(['in_progress', 'completed']),
  currentPhase: z.number().int().min(0),
  responses: z
    .record(z.string().max(64), z.string().max(5000))
    .refine((r) => Object.keys(r).length <= 1000, { message: 'Too many responses' }),
  notes: z
    .array(
      z.object({
        id: z.string().max(64),
        text: z.string().max(5000),
        phase: z.number().int().nullable(),
        at: stamp,
      })
    )
    .max(500),
  report: afterActionReportSchema.nullable(),
  createdAt: stamp,
  updatedAt: stamp,
});

/**
 * An exported workspace. Every collection defaults to empty so a partial
 * export still imports; unknown keys are stripped. Personal mutes
 * (emailOptOuts) are not accepted from a file.
 */
export const workspaceImportSchema = z.object({
  org: orgSchema.extend({ updatedAt: stamp }).nullable().default(null),
  processes: z.array(importedProcessSchema).max(RECORDS),
  assessments: z.array(importedAssessmentSchema).max(RECORDS).default([]),
  objectives: z.array(importedObjectivesSchema).max(RECORDS).default([]),
  remediations: z.array(importedRemediationSchema).max(RECORDS).default([]),
  workflows: z.array(importedWorkflowSchema).max(RECORDS).default([]),
  maturity: z.object({ answers: maturityAnswersSchema, updatedAt: stamp }).nullable().default(null),
  exercises: z.array(importedExerciseSchema).max(RECORDS).default([]),
  resourceProfiles: z.array(importedResourceProfileSchema).max(RECORDS).default([]),
  plan: planSchema.extend({ updatedAt: stamp }).nullable().default(null),
  collectionRequests: z.array(importedCollectionRequestSchema).max(RECORDS).default([]),
  risks: z.array(importedRiskSchema).max(RECORDS).default([]),
  riskSuggestions: z.array(importedRiskSuggestionSchema).max(RECORDS).default([]),
  notifications: notificationPrefsSchema.partial().optional(),
});

export type WorkspaceImportResult =
  | { ok: true; workspace: Workspace }
  | { ok: false; message: string };

/**
 * Parse and validate an exported workspace document. Size is checked
 * before parsing: the workspace is one document read whole forever after,
 * so a bloated import is a permanent tax on every action.
 */
export function parseWorkspaceImport(json: string): WorkspaceImportResult {
  if (json.length > WORKSPACE_IMPORT_MAX_CHARS) {
    return { ok: false, message: 'That export is too large to import (the limit is 5 MB).' };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, message: 'That file is not valid JSON.' };
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, message: 'Not a valid workspace export.' };
  }
  const result = workspaceImportSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue.path.length > 0 ? ` at ${issue.path.join('.')}` : '';
    return { ok: false, message: `Not a valid workspace export${where}: ${issue.message}.` };
  }
  return { ok: true, workspace: result.data as Workspace };
}
