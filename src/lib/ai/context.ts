import type { Workspace } from '@/lib/domain/types';
import { deriveAll, computeGaps } from '@/lib/domain/scoring';
import { scoreMaturity } from '@/lib/domain/maturity';
import { deriveRisks, riskConcentration } from '@/lib/domain/risk';
import {
  MTPD_LABELS,
  TIER_SHORT,
  DEPENDENCY_CLASSES,
  DEPENDENCY_LABELS,
} from '@/lib/domain/constants';
import { formatHours } from '@/lib/format';

/**
 * Serializes the live BIA workspace into a briefing document for Claude.
 * This is the overhaul of TTX's intake form: instead of asking the user to
 * re-describe their organization, the assessment data IS the intake.
 */
export function workspaceBrief(ws: Workspace): string {
  const lines: string[] = [];
  const derived = deriveAll(ws);

  if (ws.org) {
    lines.push('## Organization');
    lines.push(
      `${ws.org.name} | ${ws.org.industry || 'industry not specified'} | ` +
        `${ws.org.employees.toLocaleString()} employees | ` +
        `annual revenue ${ws.org.currency} ${ws.org.annualRevenue.toLocaleString()} | ` +
        `risk appetite: ${ws.org.riskAppetite}`
    );
    if (ws.org.regulatoryContext) {
      lines.push(`Regulatory context: ${ws.org.regulatoryContext}`);
    }
  }

  if (ws.processes.length > 0) {
    lines.push('', '## Business processes (from the business impact analysis)');
    for (const p of ws.processes) {
      const d = derived.get(p.id);
      const o = ws.objectives.find((x) => x.processId === p.id);
      const bits: string[] = [];
      if (d?.tier) bits.push(`Tier ${d.tier} ${TIER_SHORT[d.tier]}`);
      if (d?.mtpd) bits.push(`MTPD ${MTPD_LABELS[d.mtpd]}`);
      if (o?.rtoTargetHours != null) bits.push(`RTO target ${formatHours(o.rtoTargetHours)}`);
      if (o?.rtoAchievableHours != null)
        bits.push(`RTO achievable ${formatHours(o.rtoAchievableHours)}`);
      if (d?.cost24h) bits.push(`24h downtime cost ~${ws.org?.currency ?? 'USD'} ${d.cost24h.toLocaleString()}`);
      lines.push(`- ${p.name} (owner: ${p.owner || 'unassigned'})${bits.length ? ': ' + bits.join(', ') : ''}`);
      const deps = DEPENDENCY_CLASSES.filter((c) => p.dependencies[c].length > 0)
        .map((c) => `${DEPENDENCY_LABELS[c]}: ${p.dependencies[c].join(', ')}`)
        .join(' | ');
      if (deps) lines.push(`  Dependencies: ${deps}`);
    }
  }

  const gaps = ws.objectives.flatMap((o) =>
    computeGaps(o, derived.get(o.processId)?.mtpd ?? null)
  );
  if (gaps.length > 0) {
    lines.push('', '## Known recovery gaps (achievable capability short of target)');
    for (const g of gaps) {
      const name = ws.processes.find((p) => p.id === g.processId)?.name ?? g.processId;
      lines.push(
        `- ${name}: ${g.kind.toUpperCase()} target ${formatHours(g.targetHours)}, achievable ${formatHours(g.achievableHours)} (${g.severity} severity gap)`
      );
    }
  }

  const risks = deriveRisks(ws).slice(0, 8);
  if (risks.length > 0) {
    lines.push('', '## Risk register (highest rated first)');
    for (const r of risks) {
      const rating =
        r.band && r.score != null ? `${r.band} (${r.score})` : 'not yet scorable';
      const affected = r.affected.map((a) => a.name).join(', ') || 'no processes linked';
      lines.push(
        `- ${r.risk.title} [${r.risk.category}]: likelihood ${r.risk.likelihood}/4, impact ${r.impact ?? '?'}/4, ${rating}. Affects: ${affected}.` +
          (r.risk.treatment ? ` Treatment: ${r.risk.treatment}.` : ' No treatment decided.') +
          (r.risk.existingControls ? ` Existing controls: ${r.risk.existingControls}` : '')
      );
    }
    const shared = riskConcentration(ws);
    if (shared.length > 0) {
      lines.push(
        `Correlated exposure (one dependency behind several risks): ${shared
          .map((c) => `${c.name} appears in ${c.risks.length} risks`)
          .join('; ')}`
      );
    }
  }

  const maturity = scoreMaturity(ws.maturity);
  if (maturity.overall != null) {
    lines.push('', `## Program maturity (${maturity.overall.toFixed(1)} / 5 overall)`);
    for (const d of maturity.domains) {
      if (d.score != null) lines.push(`- ${d.name} (id: ${d.domainId}): ${d.score.toFixed(1)} / 5`);
    }
    if (maturity.roadmap.length > 0) {
      lines.push(
        `Weakest domains: ${maturity.roadmap.slice(0, 3).map((d) => d.name).join(', ')}`
      );
    }
  }

  return lines.join('\n');
}
