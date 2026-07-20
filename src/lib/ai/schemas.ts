// zod/v4 subpath: the Anthropic SDK's zodOutputFormat helper expects zod v4
// schema types; the rest of the app stays on the classic v3 API.
import { z } from 'zod/v4';

/**
 * Zod schemas are the single contract for Claude's structured outputs: the
 * API response is validated against them before anything is persisted, so
 * malformed output is rejected at the boundary (no hand-rolled JSON
 * extraction). Kept in sync with the types in src/lib/domain/types.ts.
 */

export const MATURITY_DOMAIN_IDS = [
  'context',
  'leadership',
  'risk',
  'bia',
  'strategies',
  'crisis',
  'testing',
  'documentation',
] as const;

const domainId = z.enum(MATURITY_DOMAIN_IDS);

export const AiScenarioSchema = z.object({
  title: z.string(),
  duration: z.string().describe('Suggested exercise length, e.g. "2 hours"'),
  objective: z.string().describe('One-sentence exercise objective naming the organization'),
  contextNotes: z
    .array(z.string())
    .describe('Facilitator context drawn from the assessment data provided'),
  phases: z.array(
    z.object({
      title: z.string().describe('e.g. "Phase 1 - Detection (T+0 to T+2h)"'),
      narrative: z.string().describe('The situation as read to participants'),
      injects: z
        .array(z.string())
        .describe('Facilitator injects to escalate pressure mid-phase'),
      discussion: z
        .array(z.string())
        .describe('Questions participants must answer before advancing'),
      expectedActions: z
        .array(z.string())
        .describe('What a good response looks like, for the facilitator'),
    })
  ),
  evaluates: z
    .array(domainId)
    .describe('Maturity domains this exercise stresses'),
});

export type AiScenario = z.infer<typeof AiScenarioSchema>;

export const AarSchema = z.object({
  executiveSummary: z.string(),
  timeline: z.array(z.object({ phase: z.string(), summary: z.string() })),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  recommendations: z.array(
    z.object({
      priority: z.enum(['high', 'medium', 'low']),
      item: z.string(),
      rationale: z.string(),
      suggestedOwner: z.string(),
    })
  ),
  followUps: z.array(
    z.object({
      item: z.string(),
      suggestedOwner: z.string(),
      suggestedDue: z.string().describe('Relative timeframe, e.g. "within 30 days"'),
    })
  ),
  maturitySignals: z.array(
    z.object({
      domainId,
      observation: z.string(),
    })
  ),
});

export type Aar = z.infer<typeof AarSchema>;
