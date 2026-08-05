/**
 * Plan limits for AI generation.
 *
 * Two things are metered, because they fail in different ways. Tokens bound
 * the cost of a runaway loop or an unusually large workspace. The exercise
 * count bounds the thing that is actually valuable to give away once: a
 * tailored tabletop. A token budget alone would not do that job, since an
 * organization could spend its whole month on one feature and never reach the
 * exercise generator.
 *
 * Everything here is policy, deliberately kept out of the enforcement code so
 * the numbers can be changed without touching the mechanism.
 */

export type Plan = 'free' | 'team' | 'unlimited';

/** The AI-backed surfaces, each metered separately. */
export type AiFeature = 'exercise' | 'aar' | 'workflow' | 'risk';

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  exercise: 'AI-tailored tabletop exercise',
  aar: 'AI after-action report',
  workflow: 'AI recovery workflow draft',
  risk: 'AI risk suggestions',
};

export interface PlanLimits {
  label: string;
  /** Input plus output tokens allowed per calendar month; null = unmetered. */
  monthlyTokens: number | null;
  /**
   * AI-generated exercises allowed for the lifetime of the organization;
   * null = unmetered. Library scenarios are never limited, so an organization
   * that exhausts this can still run tabletops, just not newly written ones.
   */
  aiExercisesTotal: number | null;
  /** Features the plan may use at all. */
  features: AiFeature[];
}

export const PLANS: Record<Plan, PlanLimits> = {
  free: {
    label: 'Free',
    // Comfortably covers one exercise and its report with headroom to retry,
    // and stops well short of a month of unattended generation.
    monthlyTokens: 300_000,
    aiExercisesTotal: 1,
    // The report is included with the exercise: a tabletop with no debrief is
    // half a feature, and the free tier is meant to show what the paid one
    // actually does.
    features: ['exercise', 'aar'],
  },
  team: {
    label: 'Team',
    monthlyTokens: 6_000_000,
    aiExercisesTotal: null,
    features: ['exercise', 'aar', 'workflow', 'risk'],
  },
  unlimited: {
    label: 'Unlimited',
    monthlyTokens: null,
    aiExercisesTotal: null,
    features: ['exercise', 'aar', 'workflow', 'risk'],
  },
};

export const DEFAULT_PLAN: Plan = 'free';

export function planOf(value: string | null | undefined): Plan {
  return value != null && value in PLANS ? (value as Plan) : DEFAULT_PLAN;
}

export function limitsFor(plan: Plan): PlanLimits {
  return PLANS[plan];
}

export function allowsFeature(plan: Plan, feature: AiFeature): boolean {
  return PLANS[plan].features.includes(feature);
}

/**
 * First instant of the current calendar month in UTC, used as the token
 * window boundary. A calendar month rather than a rolling 30 days, because
 * "resets on the 1st" is something a person can predict without being told.
 */
export function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
