import type { Workspace, Tier } from './types';
import { deriveAll, computeGaps } from './scoring';
import { DEPENDENCY_CLASSES, DEPENDENCY_LABELS } from './constants';

/**
 * Candidate risks derived from what the workspace already knows.
 *
 * A blank risk register is the hardest page in the app to start, and the
 * inventory already implies most of a first draft: anything two processes
 * share is a correlated failure, anything a critical process depends on
 * alone is a single point, and the notes people write about untested
 * arrangements are risk statements in all but name.
 *
 * Suggestions are never saved. Each one carries the data that produced it,
 * and leaves likelihood blank, because that judgement is the one thing the
 * app must not invent on the assessor's behalf.
 */

export interface RiskSuggestion {
  /** Stable across regenerations, so the UI can dismiss individual rows. */
  id: string;
  title: string;
  category: string;
  description: string;
  processIds: string[];
  dependencies: string[];
  /** Why this was suggested, quoting the data behind it. */
  basis: string;
  source: 'derived' | 'ai';
}

const CLASS_CATEGORY: Record<string, string> = {
  people: 'Workforce disruption',
  applications: 'Technology failure',
  equipment: 'Technology failure',
  facilities: 'Facility loss',
  suppliers: 'Supplier or third-party failure',
  data: 'Technology failure',
};

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const listNames = (names: string[], limit = 3) =>
  names.length <= limit
    ? names.join(' and ')
    : `${names.slice(0, limit).join(', ')} and ${names.length - limit} more`;

/**
 * A suggestion is redundant when an existing risk already names one of the
 * same dependencies, which is the strongest signal that the threat is
 * covered however it happens to be worded.
 */
function alreadyCovered(ws: Workspace, suggestion: RiskSuggestion): boolean {
  const deps = suggestion.dependencies.map((d) => d.trim().toLowerCase()).filter(Boolean);
  return ws.risks.some((risk) => {
    const existing = risk.dependencies.map((d) => d.trim().toLowerCase());
    if (deps.some((d) => existing.includes(d))) return true;
    // Or the same processes under the same category, worded differently.
    if (risk.category === suggestion.category && suggestion.processIds.length > 0) {
      const covered = suggestion.processIds.every((p) => risk.processIds.includes(p));
      if (covered) return true;
    }
    return false;
  });
}

const UNTESTED = /\b(untested|never been tested|not been tested|not tested|unproven|never rehearsed|not rehearsed)\b/i;
const ONSITE_RECORDS = /\b(printed|on site|on-site|paper|only held)\b/i;

export function suggestRisks(ws: Workspace): RiskSuggestion[] {
  const derived = deriveAll(ws);
  const out: RiskSuggestion[] = [];
  const tierOf = (id: string) => derived.get(id)?.tier ?? null;
  const nameOf = (id: string) => ws.processes.find((p) => p.id === id)?.name ?? id;

  // ---- Dependencies that are shared, or that a critical process leans on ----
  const usage = new Map<
    string,
    { name: string; cls: string; processIds: string[]; topTier: Tier | null }
  >();
  for (const p of ws.processes) {
    for (const cls of DEPENDENCY_CLASSES) {
      for (const raw of p.dependencies[cls]) {
        const name = raw.trim();
        if (!name) continue;
        const key = `${cls}:${name.toLowerCase()}`;
        const row = usage.get(key) ?? { name, cls, processIds: [], topTier: null };
        row.processIds.push(p.id);
        const t = tierOf(p.id);
        if (t != null) row.topTier = row.topTier == null ? t : (Math.min(row.topTier, t) as Tier);
        usage.set(key, row);
      }
    }
  }

  for (const row of usage.values()) {
    const shared = row.processIds.length > 1;
    const critical = row.topTier != null && row.topTier <= 2;

    // Data and records are assets, not threats: losing them is the
    // consequence of a technology or facility failure that is suggested in
    // its own right, and listing them separately fills the register with
    // "loss of call recordings" noise.
    if (row.cls === 'data') continue;

    // For a dependency only one process uses, the useful signal is a system
    // or a supplier standing alone behind something critical. People and
    // equipment at that level are covered by the key-person rule and by the
    // resource profile, and suggesting every one of them turns the inventory
    // into a register.
    const soleWorthRaising =
      critical && (row.cls === 'applications' || row.cls === 'suppliers');
    if (!shared && !soleWorthRaising) continue;

    // A large team is not a single point of failure; the key-person rule
    // handles the small ones with a threshold.
    if (!shared && row.cls === 'people') continue;
    const names = row.processIds.map(nameOf);
    out.push({
      id: `dep-${slug(row.cls)}-${slug(row.name)}`,
      title: `Loss of ${row.name}`,
      category: CLASS_CATEGORY[row.cls] ?? 'Technology failure',
      description: `${row.name} becomes unavailable, stopping ${listNames(names)}.`,
      processIds: [...new Set(row.processIds)],
      dependencies: [row.name],
      basis: shared
        ? `${DEPENDENCY_LABELS[row.cls as keyof typeof DEPENDENCY_LABELS]} shared by ${row.processIds.length} processes (${listNames(names)}), so a single failure takes all of them at once.`
        : `The only recorded ${row.cls === 'suppliers' ? 'supplier' : 'dependency'} of this kind behind ${names[0]}, a Tier ${row.topTier} process.`,
      source: 'derived',
    });
  }

  // ---- Arrangements the workspace itself describes as untested ----
  const untestedSources: { text: string; processId: string; where: string }[] = [];
  for (const o of ws.objectives) {
    if (o.dataLossNotes && UNTESTED.test(o.dataLossNotes)) {
      untestedSources.push({ text: o.dataLossNotes, processId: o.processId, where: 'data protection notes' });
    }
  }
  for (const r of ws.remediations) {
    if (r.action && UNTESTED.test(r.action)) {
      untestedSources.push({ text: r.action, processId: r.processId, where: 'gap remediation' });
    }
  }
  for (const rp of ws.resourceProfiles) {
    if (rp.notes && UNTESTED.test(rp.notes)) {
      untestedSources.push({ text: rp.notes, processId: rp.processId, where: 'resource profile notes' });
    }
  }
  for (const u of untestedSources) {
    out.push({
      id: `untested-${slug(u.processId)}-${slug(u.where)}`,
      title: `Recovery arrangement for ${nameOf(u.processId)} fails when first used`,
      category: 'Technology failure',
      description: `The fallback relied on for ${nameOf(u.processId)} has never been exercised, so its stated recovery time is an assumption rather than a measurement.`,
      processIds: [u.processId],
      dependencies: [],
      basis: `Your own ${u.where} say so: "${u.text.trim()}"`,
      source: 'derived',
    });
  }

  // ---- Small teams and single points of knowledge ----
  for (const p of ws.processes) {
    for (const person of p.dependencies.people) {
      const match = person.match(/\((\d+)\s*FTE\)/i);
      const count = match ? Number(match[1]) : null;
      if (count == null || count > 3) continue;
      out.push({
        id: `people-${slug(p.id)}-${slug(person)}`,
        title: `Loss of ${person.replace(/\s*\(\d+\s*FTE\)/i, '')} for ${p.name}`,
        category: 'Workforce disruption',
        description: `A team of ${count} cannot absorb simultaneous absence, and ${p.name} has no other recorded source of the same knowledge.`,
        processIds: [p.id],
        dependencies: [person],
        basis: `${person} is recorded against ${p.name}, and ${count} ${count === 1 ? 'person is' : 'people are'} too few to cover leave, illness, and departure at once.`,
        source: 'derived',
      });
    }
  }

  // ---- Vital records that exist in only one place ----
  for (const rp of ws.resourceProfiles) {
    if (rp.vitalRecords.length === 0 || !rp.notes || !ONSITE_RECORDS.test(rp.notes)) continue;
    const facilities = ws.processes.find((p) => p.id === rp.processId)?.dependencies.facilities ?? [];
    out.push({
      id: `records-${slug(rp.processId)}`,
      title: `Vital records for ${nameOf(rp.processId)} unavailable away from site`,
      category: 'Facility loss',
      description: `Records the process cannot operate without exist in one location, so any scenario that denies the building also denies the workaround.`,
      processIds: [rp.processId],
      dependencies: facilities,
      basis: `Resource profile lists ${listNames(rp.vitalRecords)} as vital, and notes: "${rp.notes.trim()}"`,
      source: 'derived',
    });
  }

  // ---- Response roles with nobody behind them ----
  const uncovered = (ws.plan?.team ?? []).filter((m) => m.role.trim() && !m.deputy.trim());
  if (uncovered.length > 0) {
    out.push({
      id: 'plan-no-deputy',
      title: `Response roles unavailable when the primary is not reachable`,
      category: 'Workforce disruption',
      description: `${listNames(uncovered.map((m) => m.role))} ${uncovered.length === 1 ? 'has' : 'have'} a named primary but no deputy, so the response depends on specific individuals being contactable.`,
      processIds: [],
      dependencies: [],
      basis: `${uncovered.length} of ${(ws.plan?.team ?? []).length} roster roles have no deputy recorded on the activation plan.`,
      source: 'derived',
    });
  }

  // ---- Peak periods on the processes that matter ----
  for (const p of ws.processes) {
    const tier = tierOf(p.id);
    if (!p.peakPeriods.trim() || tier == null || tier > 2) continue;
    out.push({
      id: `peak-${slug(p.id)}`,
      title: `Disruption to ${p.name} during ${p.peakPeriods}`,
      category: 'Natural hazard',
      description: `The same outage costs materially more inside the peak window, and the recovery estimates were not made with peak volumes in mind.`,
      processIds: [p.id],
      dependencies: [],
      basis: `${p.name} is Tier ${tier} and records its peak as "${p.peakPeriods}", when both impact and backlog run higher.`,
      source: 'derived',
    });
  }

  // ---- Critical processes with no threat registered at all ----
  for (const p of ws.processes) {
    const tier = tierOf(p.id);
    if (tier == null || tier > 2) continue;
    if (ws.risks.some((r) => r.processIds.includes(p.id))) continue;
    out.push({
      id: `uncovered-${slug(p.id)}`,
      title: `Threats to ${p.name} are not yet identified`,
      category: 'Technology failure',
      description: `A Tier ${tier} process with nothing on the register usually means the register is incomplete rather than the process being safe.`,
      processIds: [p.id],
      dependencies: [],
      basis: `${p.name} is Tier ${tier} and no registered risk names it.`,
      source: 'derived',
    });
  }

  const fresh = out.filter((s) => !alreadyCovered(ws, s));

  // Most consequential first: what a critical process depends on, then
  // breadth of impact.
  return fresh.sort((a, b) => {
    const tierA = Math.min(...a.processIds.map((p) => tierOf(p) ?? 9), 9);
    const tierB = Math.min(...b.processIds.map((p) => tierOf(p) ?? 9), 9);
    if (tierA !== tierB) return tierA - tierB;
    return b.processIds.length - a.processIds.length;
  });
}

/**
 * Identity for deduplication. Titles are near-duplicates far more often than
 * they are byte-identical ("Reinsurer fails to pay" vs "Reinsurance recovery
 * fails"), so the key drops punctuation and the filler words that carry no
 * distinguishing meaning, leaving the nouns the threat is actually about.
 */
const FILLER = new Set([
  'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'for', 'and', 'or', 'is',
  'are', 'be', 'by', 'from', 'with', 'after', 'during', 'while', 'that',
  'its', 'their', 'our', 'up', 'out', 'as', 'into', 'not',
]);

export function suggestionKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w))
    .sort()
    .join(' ');
}

/**
 * True when a candidate repeats something already seen. Title key catches
 * rewordings; the dependency-plus-category test catches the case where Claude
 * describes the same failure of the same thing in entirely different words.
 */
export function isDuplicateSuggestion(
  candidate: Pick<RiskSuggestion, 'title' | 'category' | 'dependencies' | 'processIds'>,
  seen: Pick<RiskSuggestion, 'title' | 'category' | 'dependencies' | 'processIds'>[]
): boolean {
  const key = suggestionKey(candidate.title);
  const deps = candidate.dependencies.map((d) => d.trim().toLowerCase()).filter(Boolean);
  return seen.some((s) => {
    if (suggestionKey(s.title) === key) return true;
    if (deps.length === 0) return false;
    if (s.category !== candidate.category) return false;
    return s.dependencies.some((d) => deps.includes(d.trim().toLowerCase()));
  });
}
