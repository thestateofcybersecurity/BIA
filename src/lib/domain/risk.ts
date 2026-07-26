import type {
  Workspace,
  RiskEntry,
  RiskBand,
  Severity,
  Tier,
  Likelihood,
} from './types';
import { deriveAll } from './scoring';
import { RISK_BAND_THRESHOLDS } from './constants';

/**
 * Risk assessment as the BIA's companion (ISO 22301 cl. 8.2 pairs them).
 *
 * The defining rule here: impact is never entered. A threat inherits the
 * impact already established for the processes it would disrupt, so the two
 * halves of clause 8.2 cannot drift apart, and a process cannot be Tier 1 in
 * the BIA while its threats are quietly rated minor in the risk register.
 */

/**
 * Impact comes from the criticality tier of the most critical process a
 * threat disrupts. Peak severity is the wrong source: impact grows with
 * outage length, so nearly every process peaks at 4 by the one month
 * horizon and every risk would score identically. Tier derives from MTPD,
 * which is exactly the discriminating question here: how fast does this
 * become intolerable once the threat lands.
 */
export const IMPACT_FROM_TIER: Record<Tier, Severity> = { 1: 4, 2: 3, 3: 2, 4: 1 };

export interface RiskDerived {
  risk: RiskEntry;
  /** Derived from the top tier among affected processes; null when none are assessed. */
  impact: Severity | null;
  likelihood: Likelihood;
  /** likelihood x impact, 0 to 16. */
  score: number | null;
  band: RiskBand | null;
  /** Highest criticality among affected processes. */
  topTier: Tier | null;
  /** Combined 24 hour downtime cost of the affected processes. */
  exposure24h: number | null;
  affected: { id: string; name: string; tier: Tier | null; assessed: boolean }[];
  /** Affected processes with no completed assessment, so impact is provisional. */
  unassessedCount: number;
}

export function bandFor(score: number): RiskBand {
  for (const { band, min } of RISK_BAND_THRESHOLDS) {
    if (score >= min) return band;
  }
  return 'low';
}

export function deriveRisk(risk: RiskEntry, ws: Workspace): RiskDerived {
  const derived = deriveAll(ws);
  const byId = new Map(ws.processes.map((p) => [p.id, p]));

  const affected = risk.processIds
    .filter((id) => byId.has(id))
    .map((id) => {
      const d = derived.get(id);
      return {
        id,
        name: byId.get(id)!.name,
        tier: d?.tier ?? null,
        assessed: d?.assessmentComplete ?? false,
      };
    });

  let topTier: Tier | null = null;
  let exposure24h: number | null = null;

  for (const a of affected) {
    const d = derived.get(a.id);
    if (!d) continue;
    if (d.tier != null) topTier = topTier == null ? d.tier : (Math.min(topTier, d.tier) as Tier);
    if (d.cost24h != null) exposure24h = (exposure24h ?? 0) + d.cost24h;
  }

  const impact = topTier == null ? null : IMPACT_FROM_TIER[topTier];
  const score = impact == null ? null : risk.likelihood * impact;

  return {
    risk,
    impact,
    likelihood: risk.likelihood,
    score,
    band: score == null ? null : bandFor(score),
    topTier,
    exposure24h,
    affected,
    unassessedCount: affected.filter((a) => !a.assessed).length,
  };
}

/** Highest scoring first; unscorable risks sink to the bottom. */
export function deriveRisks(ws: Workspace): RiskDerived[] {
  return ws.risks
    .map((r) => deriveRisk(r, ws))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.risk.title.localeCompare(b.risk.title));
}

/** Counts per likelihood/impact cell, for the 5x5 matrix. */
export function riskMatrix(rows: RiskDerived[]): number[][] {
  const matrix = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0));
  for (const r of rows) {
    if (r.impact == null) continue;
    matrix[r.likelihood][r.impact] += 1;
  }
  return matrix;
}

/**
 * Dependencies named by more than one risk. A shared dependency turns
 * separate threats into one correlated event, which is exactly the case
 * single-risk thinking misses.
 */
export function riskConcentration(
  ws: Workspace
): { name: string; risks: string[] }[] {
  const map = new Map<string, { name: string; risks: string[] }>();
  for (const risk of ws.risks) {
    for (const raw of risk.dependencies) {
      const name = raw.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const row = map.get(key) ?? { name, risks: [] };
      if (!row.risks.includes(risk.title)) row.risks.push(risk.title);
      map.set(key, row);
    }
  }
  return [...map.values()]
    .filter((r) => r.risks.length > 1)
    .sort((a, b) => b.risks.length - a.risks.length);
}

/** Processes carrying the most high or critical risk, for treatment sequencing. */
export function processRiskLoad(
  rows: RiskDerived[]
): { processId: string; name: string; count: number; topScore: number }[] {
  const map = new Map<string, { processId: string; name: string; count: number; topScore: number }>();
  for (const r of rows) {
    if (r.band !== 'high' && r.band !== 'critical') continue;
    for (const a of r.affected) {
      const row = map.get(a.id) ?? { processId: a.id, name: a.name, count: 0, topScore: 0 };
      row.count += 1;
      row.topScore = Math.max(row.topScore, r.score ?? 0);
      map.set(a.id, row);
    }
  }
  return [...map.values()].sort((a, b) => b.topScore - a.topScore || b.count - a.count);
}
