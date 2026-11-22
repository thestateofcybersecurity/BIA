import { nanoid } from 'nanoid';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type {
  Workspace,
  GeneratedScenario,
  ExerciseSession,
  AfterActionReport,
} from '@/lib/domain/types';
import { getAnthropic, AI_MODEL } from './client';
import { BilledGenerationError, type AiResult, type TokenUsage } from './quota';
import {
  AiScenarioSchema,
  AarSchema,
  AiWorkflowSchema,
  AiRiskSuggestionsSchema,
  type AiWorkflow,
  type AiRiskSuggestions,
} from './schemas';
import { workspaceBrief, orgBrief, processBrief } from './context';
import {
  SCENARIO_SYSTEM,
  scenarioUserPrompt,
  AAR_SYSTEM,
  aarUserPrompt,
  WORKFLOW_SYSTEM,
  workflowUserPrompt,
  RISK_SUGGEST_SYSTEM,
  riskSuggestUserPrompt,
} from './prompts';

/**
 * Everything billable on a response. Cache fields are included because a
 * cached read still costs, just less; leaving them out would under-report
 * spend against the plan allowance.
 */
function usageOf(u: {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}): TokenUsage {
  return {
    input:
      (u.input_tokens ?? 0) +
      (u.cache_creation_input_tokens ?? 0) +
      (u.cache_read_input_tokens ?? 0),
    output: u.output_tokens ?? 0,
  };
}

/**
 * Ceiling on the tenant text placed in one prompt, roughly 60,000 tokens.
 * A workspace has no size limit of its own, and input tokens are billed, so
 * without this one call could carry a whole context window of inventory.
 * Anything past the ceiling is dropped with a note the model can see.
 */
export const MAX_PROMPT_CHARS = 240_000;

export function clampForPrompt(text: string, max: number = MAX_PROMPT_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n[Truncated: this section is larger than one prompt carries.]`;
}

type BilledResponse<T> = {
  stop_reason: string | null;
  parsed_output: T | null;
  usage: Parameters<typeof usageOf>[0];
};

/**
 * The parsed output of a response, or a BilledGenerationError carrying its
 * usage. Every one of these outcomes was billed by the provider, so the
 * error keeps the token counts for the meter instead of dropping them.
 */
function usableOutput<T>(response: BilledResponse<T>): T {
  const usage = usageOf(response.usage);
  if (response.stop_reason === 'refusal') {
    throw new BilledGenerationError(
      'Claude declined to generate this content. Adjust the focus and try again.',
      usage
    );
  }
  if (response.stop_reason === 'max_tokens') {
    throw new BilledGenerationError(
      'The generation ran out of output tokens. Try a narrower focus.',
      usage
    );
  }
  if (!response.parsed_output) {
    throw new BilledGenerationError(
      'Claude returned output that did not match the expected structure.',
      usage
    );
  }
  return response.parsed_output;
}

export async function generateScenarioWithClaude(args: {
  ws: Workspace;
  category: string;
  baseTitle: string;
  baseSummary: string;
  focus: string;
}): Promise<AiResult<GeneratedScenario>> {
  const client = getAnthropic();
  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SCENARIO_SYSTEM,
    messages: [
      {
        role: 'user',
        content: scenarioUserPrompt({
          brief: clampForPrompt(workspaceBrief(args.ws)),
          baseTitle: args.baseTitle,
          baseSummary: args.baseSummary,
          focus: args.focus,
        }),
      },
    ],
    output_config: { format: zodOutputFormat(AiScenarioSchema) },
  });

  const parsed = usableOutput(response);

  return {
    value: {
      id: `ai-${nanoid(8)}`,
      category: args.category,
      title: parsed.title,
      duration: parsed.duration,
      objective: parsed.objective,
      contextNotes: parsed.contextNotes,
      phases: parsed.phases,
      evaluates: parsed.evaluates,
    },
    usage: usageOf(response.usage),
  };
}

export async function generateWorkflowWithClaude(args: {
  ws: Workspace;
  processId: string;
  focus: string;
}): Promise<AiResult<AiWorkflow>> {
  const client = getAnthropic();
  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: WORKFLOW_SYSTEM,
    messages: [
      {
        role: 'user',
        content: workflowUserPrompt({
          orgBrief: clampForPrompt(orgBrief(args.ws), 20_000),
          processBrief: clampForPrompt(processBrief(args.ws, args.processId)),
          focus: args.focus,
          existingStepCount:
            args.ws.workflows.find((w) => w.processId === args.processId)?.steps.length ?? 0,
        }),
      },
    ],
    output_config: { format: zodOutputFormat(AiWorkflowSchema) },
  });

  const parsed = usableOutput(response);
  if (parsed.steps.length === 0) {
    throw new BilledGenerationError(
      'Claude returned no steps. Add recovery objectives or dependencies and retry.',
      usageOf(response.usage)
    );
  }
  return { value: parsed, usage: usageOf(response.usage) };
}

export async function generateRiskSuggestionsWithClaude(args: {
  ws: Workspace;
  existing: string;
  derived: string;
  priorAi: string;
}): Promise<AiResult<AiRiskSuggestions>> {
  const client = getAnthropic();
  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: RISK_SUGGEST_SYSTEM,
    messages: [
      {
        role: 'user',
        content: riskSuggestUserPrompt({
          brief: clampForPrompt(workspaceBrief(args.ws)),
          existing: clampForPrompt(args.existing, 40_000),
          derived: clampForPrompt(args.derived, 40_000),
          priorAi: clampForPrompt(args.priorAi, 40_000),
        }),
      },
    ],
    output_config: { format: zodOutputFormat(AiRiskSuggestionsSchema) },
  });

  const parsed = usableOutput(response);
  return { value: parsed, usage: usageOf(response.usage) };
}

export async function generateAarWithClaude(args: {
  ws: Workspace;
  session: ExerciseSession;
}): Promise<AiResult<AfterActionReport>> {
  const { session } = args;
  const transcript = session.scenario.phases
    .map((phase, pi) => {
      const answers = phase.discussion
        .map((q, qi) => {
          const a = session.responses[`${pi}:${qi}`]?.trim();
          return `Q: ${q}\nA: ${a || '(no response recorded)'}`;
        })
        .join('\n');
      return `### ${phase.title}\nSituation: ${phase.narrative}\nInjects: ${phase.injects.join(' | ') || '(none)'}\n${answers}`;
    })
    .join('\n\n');

  const notes = session.notes
    .map((n) => {
      const where =
        n.phase != null
          ? session.scenario.phases[n.phase]?.title ?? `phase ${n.phase + 1}`
          : 'general';
      return `- [${where}] ${n.text}`;
    })
    .join('\n');

  const client = getAnthropic();
  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: AAR_SYSTEM,
    messages: [
      {
        role: 'user',
        content: aarUserPrompt({
          brief: clampForPrompt(workspaceBrief(args.ws)),
          scenarioTitle: session.scenario.title,
          scenarioObjective: session.scenario.objective,
          transcript: clampForPrompt(transcript),
          notes: clampForPrompt(notes, 60_000),
        }),
      },
    ],
    output_config: { format: zodOutputFormat(AarSchema) },
  });

  const parsed = usableOutput(response);

  return {
    value: { ...parsed, generatedAt: new Date().toISOString() },
    usage: usageOf(response.usage),
  };
}
