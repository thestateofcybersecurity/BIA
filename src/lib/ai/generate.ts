import { nanoid } from 'nanoid';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type {
  Workspace,
  GeneratedScenario,
  ExerciseSession,
  AfterActionReport,
} from '@/lib/domain/types';
import { getAnthropic, AI_MODEL } from './client';
import { AiScenarioSchema, AarSchema } from './schemas';
import { workspaceBrief } from './context';
import {
  SCENARIO_SYSTEM,
  scenarioUserPrompt,
  AAR_SYSTEM,
  aarUserPrompt,
} from './prompts';

function assertUsable(stopReason: string | null): void {
  if (stopReason === 'refusal') {
    throw new Error('Claude declined to generate this content. Adjust the focus and try again.');
  }
  if (stopReason === 'max_tokens') {
    throw new Error('The generation ran out of output tokens. Try a narrower focus.');
  }
}

export async function generateScenarioWithClaude(args: {
  ws: Workspace;
  category: string;
  baseTitle: string;
  baseSummary: string;
  focus: string;
}): Promise<GeneratedScenario> {
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
          brief: workspaceBrief(args.ws),
          baseTitle: args.baseTitle,
          baseSummary: args.baseSummary,
          focus: args.focus,
        }),
      },
    ],
    output_config: { format: zodOutputFormat(AiScenarioSchema) },
  });

  assertUsable(response.stop_reason);
  const parsed = response.parsed_output;
  if (!parsed) throw new Error('Claude returned output that did not match the expected structure.');

  return {
    id: `ai-${nanoid(8)}`,
    category: args.category,
    title: parsed.title,
    duration: parsed.duration,
    objective: parsed.objective,
    contextNotes: parsed.contextNotes,
    phases: parsed.phases,
    evaluates: parsed.evaluates,
  };
}

export async function generateAarWithClaude(args: {
  ws: Workspace;
  session: ExerciseSession;
}): Promise<AfterActionReport> {
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
          brief: workspaceBrief(args.ws),
          scenarioTitle: session.scenario.title,
          scenarioObjective: session.scenario.objective,
          transcript,
          notes,
        }),
      },
    ],
    output_config: { format: zodOutputFormat(AarSchema) },
  });

  assertUsable(response.stop_reason);
  const parsed = response.parsed_output;
  if (!parsed) throw new Error('Claude returned output that did not match the expected structure.');

  return { ...parsed, generatedAt: new Date().toISOString() };
}
