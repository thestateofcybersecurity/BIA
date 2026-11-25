import {
  aiUsage,
  claimAiUsage,
  settleAiUsage,
  refundAiUsage,
  tenancyEnabled,
} from '@/lib/data/tenancy';
import {
  planOf,
  limitsFor,
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
 * Every generation claims a ledger row before the provider is called. The
 * row carries a token reservation (AI_RESERVE_TOKENS) that counts against
 * the monthly allowance while the call is in flight, so simultaneous
 * requests cannot all pass against the same remaining balance, and it is
 * replaced by the real usage when the call returns. The allowance can
 * still be overshot, but by a bounded amount: the calls admitted while any
 * balance remained, each by its own size.
 *
 * What the provider billed is what gets charged, whether or not the output
 * was usable. A generation that stops at the output-token limit or is
 * refused has been paid for; leaving it uncharged would let a member spend
 * without limit by asking for output that cannot fit.
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

/**
 * Tokens held against the allowance for each generation in flight. Sized to
 * a typical call (a workspace brief plus up to 16,000 output tokens); the
 * free plan therefore admits at most eight generations at once.
 */
export const AI_RESERVE_TOKENS = 40_000;

/**
 * A generation the provider billed for but that produced nothing usable
 * (output-token limit reached, refusal, output that failed the schema).
 * Carries the usage so the spend is still charged.
 */
export class BilledGenerationError extends Error {
  constructor(
    message: string,
    public readonly usage: TokenUsage
  ) {
    super(message);
    this.name = 'BilledGenerationError';
  }
}

/** The provider gave up waiting; by then it had usually been generating. */
function isProviderTimeout(e: unknown): boolean {
  return e instanceof Error && e.name === 'APIConnectionTimeoutError';
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

/** Shown when only reservations held by running generations block a call. */
const IN_FLIGHT_MESSAGE =
  "Other AI generations for this organization are still running and hold the rest of this month's allowance. Try again when they finish.";

/**
 * Run a metered generation. Throws before spending anything if the plan does
 * not allow it, claims a reserved ledger row, and settles that row with the
 * real usage once the call returns.
 *
 * On failure the row is settled with whatever the provider billed
 * (BilledGenerationError), kept at the reservation when the provider timed
 * out mid-generation, and removed only when nothing was billed. A failed
 * exercise keeps its token charge but is re-labelled, so it does not use up
 * the plan's exercise count.
 */
export async function withAiQuota<T>(
  ctx: { orgId: string; userId: string },
  feature: AiFeature,
  run: () => Promise<AiResult<T>>
): Promise<T> {
  const allowance = await allowanceFor(ctx.orgId);
  const blocked = blockedReason(allowance, feature);
  if (blocked) throw new QuotaExceededError(blocked, feature, allowance.plan);

  // Demo mode: nobody to meter and nowhere to record it.
  if (!tenancyEnabled()) return (await run()).value;

  const claimId = await claimAiUsage({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    feature,
    reserveTokens: AI_RESERVE_TOKENS,
    tokenLimit: allowance.tokensLimit,
    since: monthStart(),
    exerciseLimit: feature === 'exercise' ? allowance.exercisesLimit : null,
  });
  if (claimId == null) {
    const fresh = await allowanceFor(ctx.orgId);
    throw new QuotaExceededError(
      blockedReason(fresh, feature) ?? IN_FLIGHT_MESSAGE,
      feature,
      fresh.plan
    );
  }

  const failedLabel = feature === 'exercise' ? 'exercise_failed' : undefined;
  try {
    const { value, usage } = await run();
    await settleAiUsage(claimId, usage.input, usage.output);
    return value;
  } catch (e) {
    if (e instanceof BilledGenerationError) {
      await settleAiUsage(claimId, e.usage.input, e.usage.output, failedLabel).catch(() => {});
    } else if (isProviderTimeout(e)) {
      await settleAiUsage(claimId, 0, AI_RESERVE_TOKENS, failedLabel).catch(() => {});
    } else {
      await refundAiUsage(claimId).catch(() => {});
    }
    throw e;
  }
}

/** What a page needs to render an AI control honestly. */
export interface AiStatus {
  /** Whether AI is configured at all (the API key is present). */
  enabled: boolean;
  /** Why the control is unavailable, or null when it can be used. */
  blockedReason: string | null;
  allowance: AiAllowance | null;
}
