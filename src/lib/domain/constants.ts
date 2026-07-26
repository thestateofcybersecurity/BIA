import type {
  Horizon,
  MtpdValue,
  ImpactCategory,
  RatedCategory,
  Severity,
  RiskAppetite,
  Tier,
  DependencyClass,
  ActivationLevel,
  RecoveryStrategy,
  Likelihood,
  RiskTreatment,
  RiskBand,
} from './types';

export const HORIZONS: Horizon[] = ['h4', 'h24', 'd3', 'w1', 'm1'];

export const HORIZON_LABELS: Record<Horizon, string> = {
  h4: '4 hours',
  h24: '24 hours',
  d3: '3 days',
  w1: '1 week',
  m1: '1 month',
};

export const HORIZON_HOURS: Record<Horizon, number> = {
  h4: 4,
  h24: 24,
  d3: 72,
  w1: 168,
  m1: 720,
};

export const MTPD_LABELS: Record<MtpdValue, string> = {
  ...HORIZON_LABELS,
  beyond: 'Beyond 1 month',
};

export const CATEGORIES: ImpactCategory[] = [
  'financial',
  'operational',
  'reputational',
  'legal',
  'safety',
];

export const RATED_CATEGORIES: RatedCategory[] = [
  'operational',
  'reputational',
  'legal',
  'safety',
];

export const CATEGORY_LABELS: Record<ImpactCategory, string> = {
  financial: 'Financial',
  operational: 'Operational',
  reputational: 'Customers & reputation',
  legal: 'Legal, regulatory & contractual',
  safety: 'Health & safety',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  0: 'Negligible',
  1: 'Minor',
  2: 'Moderate',
  3: 'Major',
  4: 'Severe',
};

/**
 * Anchored descriptors shown to assessors. Each qualitative category gets a
 * described condition per level so ratings are picked by meaning, not number.
 */
export const SEVERITY_ANCHORS: Record<RatedCategory, Record<Severity, string>> = {
  operational: {
    0: 'No noticeable effect on service delivery',
    1: 'Slight slowdown; absorbed by normal operations without workarounds',
    2: 'Noticeable degradation; workarounds keep essential output flowing',
    3: 'Serious backlog or partial stoppage; workarounds failing, senior attention required',
    4: 'Delivery of products or services effectively stops; backlog may be unrecoverable',
  },
  reputational: {
    0: 'Customers and partners unaware or unaffected',
    1: 'Isolated complaints; no lasting effect on confidence',
    2: 'Visible customer dissatisfaction; some churn risk, local press or social attention',
    3: 'Significant customer harm or attrition; sustained negative coverage, partner concern',
    4: 'Lasting loss of customer or partner trust; brand damage threatens the business',
  },
  legal: {
    0: 'No legal, regulatory, or contractual exposure',
    1: 'Minor contractual friction; no formal obligations triggered',
    2: 'Reporting obligations or contract penalties triggered; manageable exposure',
    3: 'Probable regulatory action, material contract breach, or litigation exposure',
    4: 'License to operate at risk; severe sanctions, prosecution, or contract termination',
  },
  safety: {
    0: 'No effect on anyone’s health or safety',
    1: 'Minor inconvenience to wellbeing; no safety services affected',
    2: 'Some degradation of health or safety services',
    3: 'High degradation of safety services, or some risk of serious harm',
    4: 'High risk of loss of life or serious harm',
  },
};

/**
 * Financial banding thresholds as a fraction of annual revenue, at Moderate
 * appetite. A loss below threshold[i] scores severity i; at or above the last
 * threshold scores 4. Appetite scales the thresholds.
 */
export const FINANCIAL_BAND_FRACTIONS: number[] = [0.0001, 0.0005, 0.0025, 0.01];

export const APPETITE_MULTIPLIER: Record<RiskAppetite, number> = {
  conservative: 0.5,
  moderate: 1,
  aggressive: 2,
};

export const APPETITE_LABELS: Record<RiskAppetite, string> = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  aggressive: 'Aggressive',
};

export const TIER_LABELS: Record<Tier, string> = {
  1: 'Tier 1 · Critical',
  2: 'Tier 2 · Essential',
  3: 'Tier 3 · Important',
  4: 'Tier 4 · Deferrable',
};

export const TIER_SHORT: Record<Tier, string> = {
  1: 'Critical',
  2: 'Essential',
  3: 'Important',
  4: 'Deferrable',
};

/** timeCriticality component of the priority score, keyed by MTPD. */
export const TIME_CRITICALITY: Record<MtpdValue, number> = {
  h4: 1.0,
  h24: 0.8,
  d3: 0.6,
  w1: 0.4,
  m1: 0.25,
  beyond: 0.1,
};

export const DEPENDENCY_CLASSES: DependencyClass[] = [
  'people',
  'applications',
  'equipment',
  'facilities',
  'suppliers',
  'data',
];

export const DEPENDENCY_LABELS: Record<DependencyClass, string> = {
  people: 'People',
  applications: 'Applications & IT services',
  equipment: 'Equipment & devices',
  facilities: 'Facilities & locations',
  suppliers: 'Suppliers & third parties',
  data: 'Data & records',
};

/** RTO should leave headroom below MTPD. */
export const RTO_BUFFER_FRACTION = 0.8;

export const LIKELIHOODS: Likelihood[] = [0, 1, 2, 3, 4];

export const LIKELIHOOD_LABELS: Record<Likelihood, string> = {
  0: 'Rare',
  1: 'Unlikely',
  2: 'Possible',
  3: 'Likely',
  4: 'Almost certain',
};

/** Anchored to expected frequency so different assessors rate alike. */
export const LIKELIHOOD_ANCHORS: Record<Likelihood, string> = {
  0: 'Not expected within ten years; no known occurrence in the sector.',
  1: 'Plausible within five to ten years; has happened to comparable organizations.',
  2: 'Expected within two to five years; has happened in the sector recently.',
  3: 'Expected within one to two years; near misses or partial occurrences already seen here.',
  4: 'Expected within the year, or it has already occurred here in the last twelve months.',
};

export const RISK_CATEGORIES = [
  'Cyber attack',
  'Technology failure',
  'Supplier or third-party failure',
  'Facility loss',
  'Natural hazard',
  'Workforce disruption',
  'Utility or infrastructure',
  'Regulatory or legal',
];

export const RISK_TREATMENTS: RiskTreatment[] = ['avoid', 'reduce', 'transfer', 'accept'];

export const TREATMENT_LABELS: Record<RiskTreatment, string> = {
  avoid: 'Avoid',
  reduce: 'Reduce',
  transfer: 'Transfer',
  accept: 'Accept',
};

export const TREATMENT_DESCRIPTIONS: Record<RiskTreatment, string> = {
  avoid: 'Stop doing the thing that creates the exposure, or remove the dependency entirely.',
  reduce: 'Lower the likelihood with controls, or the impact with continuity capability.',
  transfer: 'Move the financial consequence elsewhere through insurance or contract terms. The disruption still happens.',
  accept: 'A documented decision to carry the risk as it stands, made with the rating visible.',
};

/** Impact axis of the risk matrix: derived from the tier it came from. */
export const RISK_IMPACT_LABELS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'None',
  1: 'T4 Deferrable',
  2: 'T3 Important',
  3: 'T2 Essential',
  4: 'T1 Critical',
};

export const RISK_BAND_LABELS: Record<RiskBand, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

/** Score = likelihood x impact on the shared 0-4 scales, so 0 to 16. */
export const RISK_BAND_THRESHOLDS: { band: RiskBand; min: number }[] = [
  { band: 'critical', min: 12 },
  { band: 'high', min: 8 },
  { band: 'medium', min: 4 },
  { band: 'low', min: 0 },
];

export const RECOVERY_STRATEGIES: RecoveryStrategy[] = [
  'workaround',
  'alternate_site',
  'standby',
  'third_party',
  'capacity',
  'data_protection',
  'accept',
];

export const STRATEGY_LABELS: Record<RecoveryStrategy, string> = {
  workaround: 'Manual workaround',
  alternate_site: 'Alternate site or workspace',
  standby: 'Standby system or replication',
  third_party: 'Third-party or outsourced service',
  capacity: 'Additional capacity (people or equipment)',
  data_protection: 'Improved backup or data protection',
  accept: 'Accept the risk',
};

export const STRATEGY_DESCRIPTIONS: Record<RecoveryStrategy, string> = {
  workaround:
    'Documented manual or degraded-mode procedure that keeps the process running without the failed resource. Cheapest option; needs rehearsal to be real.',
  alternate_site:
    'Relocation to another workspace, whether a company site, a reciprocal arrangement, or remote working at scale.',
  standby:
    'Warm or hot standby, clustering, or replication so the technical service fails over inside the RTO.',
  third_party:
    'A contracted provider takes the load, with continuity obligations written into the contract.',
  capacity:
    'Cross-trained staff, spare equipment, or surge arrangements that restore throughput rather than systems.',
  data_protection:
    'More frequent backups, replication, or journalling; the usual answer to an RPO gap rather than an RTO gap.',
  accept:
    'A documented decision to tolerate the shortfall, signed off with the exposure understood.',
};

export const ACTIVATION_LEVELS: ActivationLevel[] = ['monitor', 'partial', 'full'];

export const ACTIVATION_LABELS: Record<ActivationLevel, string> = {
  monitor: 'Monitor',
  partial: 'Partial activation',
  full: 'Full activation',
};

export const ACTIVATION_DESCRIPTIONS: Record<ActivationLevel, string> = {
  monitor:
    'Response team notified and tracking; no continuity plans invoked and business as usual continues.',
  partial:
    'Continuity plans invoked for affected processes only; the response team runs a bridge and communications begin.',
  full: 'Organization-wide invocation: command location stood up, all Tier 1 recovery plans running, external communications issued.',
};

/**
 * Roles a response team is expected to fill (NIST SP 800-34 and BCI GPG).
 * Offered as starting points; the roster is free-form.
 */
export const SUGGESTED_RESPONSE_ROLES = [
  'Incident Commander',
  'Deputy Incident Commander',
  'Operations Lead',
  'IT / Technical Recovery Lead',
  'Communications Lead',
  'Legal & Regulatory Lead',
  'HR / People Lead',
  'Facilities Lead',
  'Scribe / Loggist',
];

/** Audiences a continuity communications plan is expected to cover. */
export const SUGGESTED_AUDIENCES = [
  'Staff',
  'Customers',
  'Regulators',
  'Key suppliers',
  'Board & executives',
  'Media',
];
