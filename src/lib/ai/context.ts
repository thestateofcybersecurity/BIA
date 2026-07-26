import type { Workspace } from '@/lib/domain/types';
import { deriveAll, computeGaps } from '@/lib/domain/scoring';
import { scoreMaturity } from '@/lib/domain/maturity';
import { deriveRisks, riskConcentration } from '@/lib/domain/risk';
import {
  MTPD_LABELS,
  TIER_SHORT,
  DEPENDENCY_CLASSES,
  DEPENDENCY_LABELS,
  HORIZONS,
  HORIZON_LABELS,
} from '@/lib/domain/constants';
import { formatHours } from '@/lib/format';

/**
 * Serializes the live BIA workspace into a briefing document for Claude.
 * This is the overhaul of TTX's intake form: instead of asking the user to
 * re-describe their organization, the assessment data IS the intake.
 */
/** Just the organization header, for prompts that do not need the inventory. */
export function orgBrief(ws: Workspace): string {
  if (!ws.org) return '## Organization\nNot yet profiled.';
  const lines = [
    '## Organization',
    `${ws.org.name} | ${ws.org.industry || 'industry not specified'} | ${ws.org.employees.toLocaleString()} employees`,
  ];
  if (ws.org.regulatoryContext) lines.push(`Regulatory context: ${ws.org.regulatoryContext}`);
  if (ws.plan?.declarationAuthority) {
    lines.push(`Incident declaration authority: ${ws.plan.declarationAuthority}`);
  }
  if (ws.plan && ws.plan.team.length > 0) {
    lines.push(
      `Response roles available: ${ws.plan.team.map((m) => m.role).filter(Boolean).join(', ')}`
    );
  }
  return lines.join('\n');
}

/**
 * Everything known about one process, for generating its recovery workflow.
 * Deliberately narrower than workspaceBrief: the model needs depth on this
 * process rather than breadth across the inventory.
 */
export function processBrief(ws: Workspace, processId: string): string {
  const process = ws.processes.find((p) => p.id === processId);
  if (!process) return '';
  const derived = deriveAll(ws);
  const d = derived.get(processId);
  const o = ws.objectives.find((x) => x.processId === processId);
  const profile = ws.resourceProfiles.find((x) => x.processId === processId);
  const currency = ws.org?.currency ?? 'USD';
  const lines: string[] = [];

  lines.push(`## Process: ${process.name}`);
  if (process.description) lines.push(process.description);
  lines.push(
    `Owner: ${process.owner || 'unassigned'} | Department: ${process.department || 'not stated'} | Serves: ${process.usersServed || 'not stated'}`
  );
  if (process.peakPeriods) lines.push(`Peak periods: ${process.peakPeriods}`);
  if (d?.tier) lines.push(`Criticality: Tier ${d.tier} ${TIER_SHORT[d.tier]}`);
  if (d?.mtpd) lines.push(`MTPD (point at which disruption becomes intolerable): ${MTPD_LABELS[d.mtpd]}`);
  if (d?.cost24h) lines.push(`Downtime cost at 24 hours: ${currency} ${d.cost24h.toLocaleString()}`);

  lines.push('', '### Recovery objectives');
  if (!o) {
    lines.push('None set. Propose a sequence and state the RTO it implies.');
  } else {
    if (o.rtoTargetHours != null) lines.push(`RTO target: ${formatHours(o.rtoTargetHours)} (the budget the sequence must fit inside)`);
    if (o.rtoAchievableHours != null) lines.push(`RTO currently achievable: ${formatHours(o.rtoAchievableHours)}`);
    if (o.wrtHours != null) lines.push(`WRT (backlog catch-up after systems are back): ${formatHours(o.wrtHours)}`);
    if (o.rpoTargetHours != null) lines.push(`RPO target (tolerable data loss): ${formatHours(o.rpoTargetHours)}`);
    if (o.mbcoPercent != null) lines.push(`MBCO: ${o.mbcoPercent}% of normal output is the minimum acceptable service during recovery`);
    if (o.dataLossNotes) lines.push(`Data protection notes: ${o.dataLossNotes}`);
  }

  lines.push('', '### Dependencies this process runs on');
  for (const c of DEPENDENCY_CLASSES) {
    if (process.dependencies[c].length > 0) {
      lines.push(`- ${DEPENDENCY_LABELS[c]}: ${process.dependencies[c].join(', ')}`);
    }
  }
  if (process.upstreamProcessIds.length > 0) {
    const names = process.upstreamProcessIds
      .map((id) => ws.processes.find((p) => p.id === id)?.name ?? id)
      .join(', ');
    lines.push(`- Upstream processes that must be running first: ${names}`);
  }

  if (profile) {
    lines.push('', '### Minimum resources needed at each point after disruption');
    for (const h of HORIZONS) {
      const parts = [
        profile.staff[h] != null ? `${profile.staff[h]} staff` : null,
        profile.workstations[h] != null ? `${profile.workstations[h]} workstations` : null,
        profile.facilitySeats[h] != null ? `${profile.facilitySeats[h]} seats` : null,
      ].filter(Boolean);
      if (parts.length) lines.push(`- ${HORIZON_LABELS[h]}: ${parts.join(', ')}`);
    }
    if (profile.vitalRecords.length > 0) {
      lines.push(`- Vital records the process cannot operate without: ${profile.vitalRecords.join(', ')}`);
    }
    if (profile.notes) lines.push(`- Notes: ${profile.notes}`);
  }

  const gaps = o ? computeGaps(o, d?.mtpd ?? null) : [];
  if (gaps.length > 0) {
    lines.push('', '### Known recovery gaps for this process');
    for (const g of gaps) {
      const rem = ws.remediations.find((r) => r.processId === processId && r.kind === g.kind);
      lines.push(
        `- ${g.kind.toUpperCase()}: target ${formatHours(g.targetHours)}, achievable ${formatHours(g.achievableHours)} (${g.severity} severity)` +
          (rem?.action ? `. Remediation under way: ${rem.action}` : '. No remediation recorded.')
      );
    }
    lines.push(
      'Plan around what is achievable today, and say plainly where the target is unreachable until a gap closes.'
    );
  }

  const risks = ws.risks.filter((r) => r.processIds.includes(processId));
  if (risks.length > 0) {
    lines.push('', '### Registered threats to this process');
    for (const r of risks) {
      lines.push(
        `- ${r.title} [${r.category}]${r.existingControls ? `. Existing controls: ${r.existingControls}` : ''}`
      );
    }
  }

  return lines.join('\n');
}

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
