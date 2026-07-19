import type {
  Horizon,
  MtpdValue,
  ImpactCategory,
  RatedCategory,
  Severity,
  RiskAppetite,
  Tier,
  DependencyClass,
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
