import type {
  BusinessProcess,
  ImpactAssessment,
  RecoveryObjectives,
  OrgProfile,
  Horizon,
  MtpdValue,
  Severity,
  Tier,
  ProcessDerived,
  Workspace,
  ImpactCategory,
} from './types';
import {
  HORIZONS,
  HORIZON_HOURS,
  RATED_CATEGORIES,
  FINANCIAL_BAND_FRACTIONS,
  APPETITE_MULTIPLIER,
  TIME_CRITICALITY,
  RTO_BUFFER_FRACTION,
} from './constants';

/** Currency thresholds for financial severity, scaled to the org profile. */
export function financialThresholds(org: OrgProfile): number[] {
  const scale = APPETITE_MULTIPLIER[org.riskAppetite];
  return FINANCIAL_BAND_FRACTIONS.map((f) => f * org.annualRevenue * scale);
}

export function financialSeverity(loss: number, org: OrgProfile): Severity {
  const thresholds = financialThresholds(org);
  for (let i = 0; i < thresholds.length; i++) {
    if (loss < thresholds[i]) return i as Severity;
  }
  return 4;
}

function horizonIndex(h: Horizon): number {
  return HORIZONS.indexOf(h);
}

export function mtpdToHours(mtpd: MtpdValue): number {
  return mtpd === 'beyond' ? Infinity : HORIZON_HOURS[mtpd];
}

/** Earliest horizon where any category reaches severity 4; 'beyond' if none does. */
export function deriveMtpd(
  assessment: ImpactAssessment,
  org: OrgProfile | null
): MtpdValue | null {
  if (!isAssessmentComplete(assessment)) return null;
  for (const h of HORIZONS) {
    const loss = assessment.financialLoss[h];
    if (org && loss != null && financialSeverity(loss, org) === 4) return h;
    for (const cat of RATED_CATEGORIES) {
      if (assessment.ratings[cat][h] === 4) return h;
    }
  }
  return 'beyond';
}

export function isAssessmentComplete(a: ImpactAssessment): boolean {
  for (const h of HORIZONS) {
    if (a.financialLoss[h] == null) return false;
    for (const cat of RATED_CATEGORIES) {
      if (a.ratings[cat][h] == null) return false;
    }
  }
  return true;
}

export function tierFromMtpd(mtpd: MtpdValue): Tier {
  if (mtpd === 'h4' || mtpd === 'h24') return 1;
  if (mtpd === 'd3') return 2;
  if (mtpd === 'w1' || mtpd === 'm1') return 3;
  return 4;
}

/** priority = 60 x timeCriticality + 40 x magnitude, on a 0-100 scale. */
export function priorityScore(
  mtpd: MtpdValue,
  peakSeverity: Record<ImpactCategory, Severity>
): number {
  const magnitudes = Object.values(peakSeverity);
  const magnitude =
    magnitudes.reduce((sum: number, s) => sum + s, 0) / (magnitudes.length * 4);
  return Math.round((60 * TIME_CRITICALITY[mtpd] + 40 * magnitude) * 10) / 10;
}

export function deriveProcess(
  process: BusinessProcess,
  assessment: ImpactAssessment | undefined,
  org: OrgProfile | null
): ProcessDerived {
  const empty: ProcessDerived = {
    processId: process.id,
    financialSeverity: { h4: null, h24: null, d3: null, w1: null, m1: null },
    peakSeverity: {
      financial: 0,
      operational: 0,
      reputational: 0,
      legal: 0,
      safety: 0,
    },
    mtpd: null,
    mtpdDerived: null,
    mtpdOverridden: false,
    tier: null,
    priority: null,
    cost24h: null,
    assessmentComplete: false,
  };
  if (!assessment) return empty;

  const finSev: Record<Horizon, Severity | null> = { ...empty.financialSeverity };
  let peakFin: Severity = 0;
  for (const h of HORIZONS) {
    const loss = assessment.financialLoss[h];
    if (loss != null && org) {
      const s = financialSeverity(loss, org);
      finSev[h] = s;
      if (s > peakFin) peakFin = s;
    }
  }

  const peak: Record<ImpactCategory, Severity> = {
    financial: peakFin,
    operational: 0,
    reputational: 0,
    legal: 0,
    safety: 0,
  };
  for (const cat of RATED_CATEGORIES) {
    for (const h of HORIZONS) {
      const s = assessment.ratings[cat][h];
      if (s != null && s > peak[cat]) peak[cat] = s;
    }
  }

  const complete = isAssessmentComplete(assessment);
  const derivedMtpd = deriveMtpd(assessment, org);
  const mtpd = assessment.mtpdOverride?.value ?? derivedMtpd;

  return {
    processId: process.id,
    financialSeverity: finSev,
    peakSeverity: peak,
    mtpd,
    mtpdDerived: derivedMtpd,
    mtpdOverridden: assessment.mtpdOverride != null,
    tier: mtpd ? tierFromMtpd(mtpd) : null,
    priority: mtpd && complete ? priorityScore(mtpd, peak) : null,
    cost24h: assessment.financialLoss.h24,
    assessmentComplete: complete,
  };
}

export function deriveAll(
  ws: Workspace
): Map<string, ProcessDerived> {
  const byProcess = new Map(ws.assessments.map((a) => [a.processId, a]));
  return new Map(
    ws.processes.map((p) => [p.id, deriveProcess(p, byProcess.get(p.id), ws.org)])
  );
}

export interface RtoValidation {
  status: 'ok' | 'warn' | 'violation' | 'unknown';
  message: string;
}

/**
 * RTO plus WRT (backlog catch-up) must fit inside the MTPD, ideally with a
 * buffer: normal service, not just restored systems, is what the MTPD bounds.
 */
export function validateRto(
  rtoTargetHours: number | null,
  mtpd: MtpdValue | null,
  wrtHours: number | null = null
): RtoValidation {
  if (rtoTargetHours == null) {
    return { status: 'unknown', message: 'Set an RTO target to validate it against the MTPD.' };
  }
  if (mtpd == null) {
    return { status: 'unknown', message: 'Complete the impact assessment to derive the MTPD this target must sit below.' };
  }
  const mtpdHours = mtpdToHours(mtpd);
  if (mtpdHours === Infinity) {
    return { status: 'ok', message: 'MTPD is beyond the assessed window; any practical RTO is acceptable.' };
  }
  const wrt = wrtHours ?? 0;
  const effective = rtoTargetHours + wrt;
  const label = wrt > 0 ? `RTO ${rtoTargetHours}h + WRT ${wrt}h = ${effective}h` : `RTO target (${rtoTargetHours}h)`;
  if (effective > mtpdHours) {
    return {
      status: 'violation',
      message: `${label} exceeds the MTPD (${mtpdHours}h). Normal service would resume after the disruption became intolerable.`,
    };
  }
  if (effective > mtpdHours * RTO_BUFFER_FRACTION) {
    return {
      status: 'warn',
      message: `${label} leaves little headroom below the MTPD (${mtpdHours}h). Aim for at most ${Math.round(mtpdHours * RTO_BUFFER_FRACTION)}h combined.`,
    };
  }
  return {
    status: 'ok',
    message: wrt > 0
      ? `RTO plus backlog recovery (${effective}h) sits comfortably below the MTPD.`
      : 'RTO target sits comfortably below the MTPD.',
  };
}

/** Assessments should be reviewed at least annually (ISO 22301). */
export const REVIEW_INTERVAL_MONTHS = 12;

export function isReviewDue(assessment: ImpactAssessment, now = new Date()): boolean {
  const last = new Date(assessment.approvedAt ?? assessment.updatedAt);
  const due = new Date(last);
  due.setMonth(due.getMonth() + REVIEW_INTERVAL_MONTHS);
  return now >= due;
}

export interface GapInfo {
  processId: string;
  kind: 'rto' | 'rpo';
  targetHours: number;
  achievableHours: number;
  gapHours: number;
  /** Gap relative to MTPD headroom: how badly the shortfall matters. */
  severity: 'low' | 'medium' | 'high';
}

export function computeGaps(
  objectives: RecoveryObjectives,
  mtpd: MtpdValue | null
): GapInfo[] {
  const gaps: GapInfo[] = [];
  const mtpdHours = mtpd ? mtpdToHours(mtpd) : Infinity;

  const check = (
    kind: 'rto' | 'rpo',
    target: number | null,
    achievable: number | null
  ) => {
    if (target == null || achievable == null) return;
    const gap = achievable - target;
    if (gap <= 0) return;
    let severity: GapInfo['severity'] = 'low';
    if (kind === 'rto' && mtpdHours !== Infinity) {
      // RTO gaps rate against MTPD headroom: recovery past the point where
      // disruption becomes intolerable is high severity by definition.
      if (achievable > mtpdHours) severity = 'high';
      else if (achievable > mtpdHours * RTO_BUFFER_FRACTION) severity = 'medium';
    } else {
      // RPO gaps, and RTO gaps without a derived MTPD, rate on the size of
      // the shortfall relative to the target.
      if (gap >= target * 3) severity = 'high';
      else if (gap >= target) severity = 'medium';
    }
    gaps.push({
      processId: objectives.processId,
      kind,
      targetHours: target,
      achievableHours: achievable,
      gapHours: gap,
      severity,
    });
  };

  check('rto', objectives.rtoTargetHours, objectives.rtoAchievableHours);
  check('rpo', objectives.rpoTargetHours, objectives.rpoAchievableHours);
  return gaps;
}

/** Sum of recovery step durations vs the RTO target. */
export function workflowVsRto(
  totalStepHours: number,
  rtoTargetHours: number | null
): 'ok' | 'over' | 'unknown' {
  if (rtoTargetHours == null) return 'unknown';
  return totalStepHours > rtoTargetHours ? 'over' : 'ok';
}

/**
 * Enforce non-decreasing ratings over time: raising a severity at one horizon
 * raises later horizons to at least that level; lowering one caps earlier ones.
 */
export function enforceMonotonic(
  values: Record<Horizon, Severity | null>,
  changed: Horizon,
  newValue: Severity
): Record<Horizon, Severity | null> {
  const out = { ...values, [changed]: newValue };
  const idx = horizonIndex(changed);
  for (const h of HORIZONS) {
    const i = horizonIndex(h);
    const v = out[h];
    if (v == null) continue;
    if (i > idx && v < newValue) out[h] = newValue;
    if (i < idx && v > newValue) out[h] = newValue;
  }
  return out;
}

/** Same rule for currency amounts. */
export function enforceMonotonicLoss(
  values: Record<Horizon, number | null>,
  changed: Horizon,
  newValue: number
): Record<Horizon, number | null> {
  const out = { ...values, [changed]: newValue };
  const idx = horizonIndex(changed);
  for (const h of HORIZONS) {
    const i = horizonIndex(h);
    const v = out[h];
    if (v == null) continue;
    if (i > idx && v < newValue) out[h] = newValue;
    if (i < idx && v > newValue) out[h] = newValue;
  }
  return out;
}
