import { aiUsage, recordAiUsage, tenancyEnabled } from '@/lib/data/tenancy';
import {
  planOf,
  limitsFor,
  allowsFeature,
  monthStart,
  AI_FEATURE_LABELS,
  type AiFeature,
  type Plan,
} from '@/lib/domain/plans';

/**
 * Metering for every AI-backed action.
 *
 * One wrapper holds the whole policy: what a plan may use, how much is left,
 * and what the spend was. Scattering these checks across the actions would
 * mean a new AI feature is unmetered by default, which is exactly the failure
 * mode worth designing out.
 *
 * The check runs before the call and the charge is recorded after it, so a
 * single generation can overshoot the monthly budget by its own size. That is
 * deliberate: refusing to start work that might exceed the cap would mean
 * predicting the token count of a response nobody has generated yet, and the
 * overshoot is bounded by one call.
 */

export interface TokenUsage {
  input: number;
  output: number;
}

/** What a generator returns: the value, plus what it cost to produce. */
export interface AiResult<T> {
  value: T;
  usage: TokenUsage;
}

/** Raised when a plan limit blocks the call, with wording meant for the user. */
export class QuotaExceededError extends Error {
  constructor(
    message: string,
    public readonly feature: AiFeature,
    public readonly plan: Plan
  ) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export interface AiAllowance {
  plan: Plan;
  planLabel: string;
  tokensUsed: number;
  tokensLimit: number | null;
  tokensRemaining: number | null;
  exercisesUsed: number;
  exercisesLimit: number | null;
  exercisesRemaining: number | null;
  features: AiFeature[];
}

/** The standing of an organization with no plan limits at all. */
function unmetered(): AiAllowance {
  const limits = limitsFor('unlimited');
  return {
    plan: 'unlimited',
    planLabel: limits.label,
    tokensUsed: 0,
    tokensLimit: null,
    tokensRemaining: null,
    exercisesUsed: 0,
    exercisesLimit: null,
    exercisesRemaining: null,
    features: limits.features,
  };
}

/** Current standing for an organization, for rendering and for the check. */
export async function allowanceFor(orgId: string): Promise<AiAllowance> {
  // Demo mode has no database and no organizations, so there is nobody to
  // meter and nowhere to record it. Running locally must not require a plan.
  if (!tenancyEnabled()) return unmetered();
  const usage = await aiUsage(orgId, monthStart());
  const plan = planOf(usage.plan);
  const limits = limitsFor(plan);
  return {
    plan,
    planLabel: limits.label,
    tokensUsed: usage.tokensThisMonth,
    tokensLimit: limits.monthlyTokens,
    tokensRemaining:
      limits.monthlyTokens == null
        ? null
        : Math.max(0, limits.monthlyTokens - usage.tokensThisMonth),
    exercisesUsed: usage.exercisesEver,
    exercisesLimit: limits.aiExercisesTotal,
    exercisesRemaining:
      limits.aiExercisesTotal == null
        ? null
        : Math.max(0, limits.aiExercisesTotal - usage.exercisesEver),
    features: limits.features,
  };
}

/**
 * Why a feature is unavailable right now, or null when it is available.
 * Shared by the pre-call check and the UI, so the button and the error say
 * the same thing.
 */
export function blockedReason(a: AiAllowance, feature: AiFeature): string | null {
  if (!a.features.includes(feature)) {
    return `${AI_FEATURE_LABELS[feature]} is not included in the ${a.planLabel} plan.`;
  }
  if (feature === 'exercise' && a.exercisesRemaining === 0) {
    return `The ${a.planLabel} plan includes ${a.exercisesLimit} AI-tailored exercise${
      a.exercisesLimit === 1 ? '' : 's'
    }, and it has been used. The scenario library is still available and unlimited.`;
  }
  if (a.tokensRemaining === 0) {
    return `This month's AI allowance for the ${a.planLabel} plan is used up. It resets on the 1st.`;
  }
  return null;
}

/**
 * Run a metered generation. Throws before spending anything if the plan does
 * not allow it, and records the spend once the call succeeds. A failed
 * generation is not charged, since no usable output was produced.
 */
export async function withAiQuota<T>(
  ctx: { orgId: string; userId: string },
  feature: AiFeature,
  run: () => Promise<AiResult<T>>
): Promise<T> {
  const allowance = await allowanceFor(ctx.orgId);
  const blocked = blockedReason(allowance, feature);
  if (blocked) throw new QuotaExceededError(blocked, feature, allowance.plan);

  const { value, usage } = await run();

  if (!tenancyEnabled()) return value;

  await recordAiUsage({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    feature,
    inputTokens: usage.input,
    outputTokens: usage.output,
  });

  return value;
}

/** What a page needs to render an AI control honestly. */
export interface AiStatus {
  /** Whether AI is configured at all (the API key is present). */
  enabled: boolean;
  /** Why the control is unavailable, or null when it can be used. */
  blockedReason: string | null;
  allowance: AiAllowance | null;
}
