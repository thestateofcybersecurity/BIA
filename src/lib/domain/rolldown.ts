import type { Workspace, Tier } from './types';
import { deriveAll } from './scoring';

/**
 * The BIA-to-DR handoff: each application inherits the strictest recovery
 * requirements of every process that depends on it, and each supplier
 * inherits the highest criticality of the processes it supports. Fully
 * derived from existing data; nothing here is entered separately.
 */

export interface RolledRequirement {
  name: string;
  processes: { id: string; name: string; tier: Tier | null }[];
  /** Strictest (lowest) target across dependent processes. */
  strictestRtoHours: number | null;
  strictestRpoHours: number | null;
  /** Highest criticality (lowest tier number) across dependent processes. */
  topTier: Tier | null;
  maxPriority: number | null;
}

export interface RollDown {
  applications: RolledRequirement[];
  suppliers: RolledRequirement[];
}

function rollFor(
  ws: Workspace,
  pick: (deps: Workspace['processes'][number]['dependencies']) => string[]
): RolledRequirement[] {
  const derived = deriveAll(ws);
  const map = new Map<string, RolledRequirement>();

  for (const p of ws.processes) {
    const d = derived.get(p.id);
    const o = ws.objectives.find((x) => x.processId === p.id);
    for (const raw of pick(p.dependencies)) {
      const name = raw.trim();
      if (!name) continue;
      let row = map.get(name.toLowerCase());
      if (!row) {
        row = {
          name,
          processes: [],
          strictestRtoHours: null,
          strictestRpoHours: null,
          topTier: null,
          maxPriority: null,
        };
        map.set(name.toLowerCase(), row);
      }
      row.processes.push({ id: p.id, name: p.name, tier: d?.tier ?? null });
      if (o?.rtoTargetHours != null) {
        row.strictestRtoHours =
          row.strictestRtoHours == null
            ? o.rtoTargetHours
            : Math.min(row.strictestRtoHours, o.rtoTargetHours);
      }
      if (o?.rpoTargetHours != null) {
        row.strictestRpoHours =
          row.strictestRpoHours == null
            ? o.rpoTargetHours
            : Math.min(row.strictestRpoHours, o.rpoTargetHours);
      }
      if (d?.tier != null) {
        row.topTier = row.topTier == null ? d.tier : (Math.min(row.topTier, d.tier) as Tier);
      }
      if (d?.priority != null) {
        row.maxPriority =
          row.maxPriority == null ? d.priority : Math.max(row.maxPriority, d.priority);
      }
    }
  }

  // Most critical first: by top tier, then by strictest RTO, then priority.
  return [...map.values()].sort((a, b) => {
    const tierDiff = (a.topTier ?? 9) - (b.topTier ?? 9);
    if (tierDiff !== 0) return tierDiff;
    const rtoDiff = (a.strictestRtoHours ?? Infinity) - (b.strictestRtoHours ?? Infinity);
    if (rtoDiff !== 0) return rtoDiff;
    return (b.maxPriority ?? -1) - (a.maxPriority ?? -1);
  });
}

export function rollDownRequirements(ws: Workspace): RollDown {
  return {
    applications: rollFor(ws, (deps) => deps.applications),
    suppliers: rollFor(ws, (deps) => deps.suppliers),
  };
}

// ---------------- Process-to-process roll-down ----------------

export type ChainFindingKind = 'tier' | 'rto' | 'rpo' | 'missing_rto';

export interface ChainFinding {
  kind: ChainFindingKind;
  severity: 'high' | 'medium';
  message: string;
}

export interface ProcessChainRequirement {
  processId: string;
  name: string;
  ownTier: Tier | null;
  ownRtoHours: number | null;
  ownRpoHours: number | null;
  /** Everything downstream that cannot run unless this process is back. */
  consumers: { id: string; name: string; tier: Tier | null; direct: boolean }[];
  /** Strictest requirement inherited from those consumers. */
  requiredTier: Tier | null;
  requiredRtoHours: number | null;
  requiredRpoHours: number | null;
  /** The consumer that sets the RTO requirement, for explaining the number. */
  drivingConsumer: string | null;
  findings: ChainFinding[];
}

/** Direct consumers keyed by the process they depend on. */
function consumerIndex(ws: Workspace): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const known = new Set(ws.processes.map((p) => p.id));
  for (const p of ws.processes) {
    for (const upstreamId of p.upstreamProcessIds) {
      if (!known.has(upstreamId) || upstreamId === p.id) continue;
      const list = index.get(upstreamId);
      if (list) list.push(p.id);
      else index.set(upstreamId, [p.id]);
    }
  }
  return index;
}

/**
 * Circular process dependencies make recovery sequencing impossible: each
 * process in the loop waits on the next. Returned as the ordered ids of each
 * distinct loop.
 */
export function detectDependencyCycles(ws: Workspace): string[][] {
  const known = new Set(ws.processes.map((p) => p.id));
  const upstream = new Map(
    ws.processes.map((p) => [
      p.id,
      p.upstreamProcessIds.filter((id) => known.has(id) && id !== p.id),
    ])
  );
  const cycles: string[][] = [];
  const recorded = new Set<string>();
  const finished = new Set<string>();
  const path: string[] = [];
  const onPath = new Set<string>();

  const visit = (id: string) => {
    if (onPath.has(id)) {
      const cycle = path.slice(path.indexOf(id));
      const key = [...cycle].sort().join('|');
      if (!recorded.has(key)) {
        recorded.add(key);
        cycles.push(cycle);
      }
      return;
    }
    if (finished.has(id)) return;
    path.push(id);
    onPath.add(id);
    for (const next of upstream.get(id) ?? []) visit(next);
    path.pop();
    onPath.delete(id);
    finished.add(id);
  };

  for (const p of ws.processes) visit(p.id);
  return cycles;
}

/**
 * The same inheritance logic as applications and suppliers, applied to the
 * process graph itself: a process must be at least as critical, and recover at
 * least as fast, as everything downstream that depends on it. Consumers are
 * followed transitively, so a shared service inherits from the whole chain it
 * ultimately supports.
 */
export function processChainRequirements(ws: Workspace): ProcessChainRequirement[] {
  const derived = deriveAll(ws);
  const byId = new Map(ws.processes.map((p) => [p.id, p]));
  const objectives = new Map(ws.objectives.map((o) => [o.processId, o]));
  const consumers = consumerIndex(ws);
  const rows: ProcessChainRequirement[] = [];

  for (const p of ws.processes) {
    const direct = new Set(consumers.get(p.id) ?? []);
    if (direct.size === 0) continue;

    // Walk downstream, cycle-safe: a loop must not make this run forever.
    const reached = new Set<string>();
    const queue = [...direct];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (id === p.id || reached.has(id)) continue;
      reached.add(id);
      for (const next of consumers.get(id) ?? []) queue.push(next);
    }

    const own = derived.get(p.id);
    const ownObjectives = objectives.get(p.id);
    let requiredTier: Tier | null = null;
    let requiredRtoHours: number | null = null;
    let requiredRpoHours: number | null = null;
    let drivingConsumer: string | null = null;

    for (const id of reached) {
      const d = derived.get(id);
      const o = objectives.get(id);
      if (d?.tier != null) {
        requiredTier = requiredTier == null ? d.tier : (Math.min(requiredTier, d.tier) as Tier);
      }
      if (o?.rtoTargetHours != null) {
        if (requiredRtoHours == null || o.rtoTargetHours < requiredRtoHours) {
          requiredRtoHours = o.rtoTargetHours;
          drivingConsumer = byId.get(id)?.name ?? null;
        }
      }
      if (o?.rpoTargetHours != null) {
        requiredRpoHours =
          requiredRpoHours == null
            ? o.rpoTargetHours
            : Math.min(requiredRpoHours, o.rpoTargetHours);
      }
    }

    const findings: ChainFinding[] = [];
    const ownTier = own?.tier ?? null;
    const ownRto = ownObjectives?.rtoTargetHours ?? null;
    const ownRpo = ownObjectives?.rpoTargetHours ?? null;

    if (ownTier != null && requiredTier != null && ownTier > requiredTier) {
      findings.push({
        kind: 'tier',
        severity: 'high',
        message: `Rated Tier ${ownTier} but supports a Tier ${requiredTier} process, so it is at least as critical as what depends on it.`,
      });
    }
    if (ownRto != null && requiredRtoHours != null && ownRto > requiredRtoHours) {
      findings.push({
        kind: 'rto',
        severity: 'high',
        message: `RTO target of ${ownRto}h is slower than the ${requiredRtoHours}h needed by ${drivingConsumer ?? 'a dependent process'}, which cannot restart until this one is back.`,
      });
    }
    if (ownRto == null && requiredRtoHours != null) {
      findings.push({
        kind: 'missing_rto',
        severity: 'medium',
        message: `No RTO target set, yet a dependent process needs this back within ${requiredRtoHours}h.`,
      });
    }
    if (ownRpo != null && requiredRpoHours != null && ownRpo > requiredRpoHours) {
      findings.push({
        kind: 'rpo',
        severity: 'high',
        message: `RPO target of ${ownRpo}h allows more data loss than the ${requiredRpoHours}h a dependent process requires.`,
      });
    }

    rows.push({
      processId: p.id,
      name: p.name,
      ownTier,
      ownRtoHours: ownRto,
      ownRpoHours: ownRpo,
      consumers: [...reached].map((id) => ({
        id,
        name: byId.get(id)?.name ?? id,
        tier: derived.get(id)?.tier ?? null,
        direct: direct.has(id),
      })),
      requiredTier,
      requiredRtoHours,
      requiredRpoHours,
      drivingConsumer,
      findings,
    });
  }

  // Conflicts first, then by inherited criticality and tightest requirement.
  return rows.sort((a, b) => {
    const aHigh = a.findings.some((f) => f.severity === 'high') ? 0 : 1;
    const bHigh = b.findings.some((f) => f.severity === 'high') ? 0 : 1;
    if (aHigh !== bHigh) return aHigh - bHigh;
    if (a.findings.length !== b.findings.length) return b.findings.length - a.findings.length;
    const tierDiff = (a.requiredTier ?? 9) - (b.requiredTier ?? 9);
    if (tierDiff !== 0) return tierDiff;
    return (a.requiredRtoHours ?? Infinity) - (b.requiredRtoHours ?? Infinity);
  });
}
