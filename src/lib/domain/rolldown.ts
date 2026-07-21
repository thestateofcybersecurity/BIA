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
