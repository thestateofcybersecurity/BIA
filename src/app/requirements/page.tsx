import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import {
  rollDownRequirements,
  processChainRequirements,
  detectDependencyCycles,
  type RolledRequirement,
  type ProcessChainRequirement,
} from '@/lib/domain/rolldown';
import { PageHeader, Card, TierBadge, StatusPill, EmptyState, btn } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { formatHours } from '@/lib/format';

export const dynamic = 'force-dynamic';

function ChainTable({ rows }: { rows: ProcessChainRequirement[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No process depends on another yet. Link upstream processes on each process to see
        requirements flow through the chain.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {['Process', 'Own tier / RTO', 'Required by chain', 'Supports', 'Status'].map((h) => (
              <th
                key={h}
                className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const worst = r.findings.some((f) => f.severity === 'high')
              ? 'bad'
              : r.findings.length > 0
                ? 'warn'
                : 'ok';
            return (
              <tr key={r.processId} className="border-b border-line/60 align-top last:border-0">
                <td className="py-2.5 pr-4">
                  <Link href={`/processes/${r.processId}`} className="font-medium hover:text-accent">
                    {r.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-4">
                  <span className="flex items-center gap-2">
                    <TierBadge tier={r.ownTier} />
                    <span className="tnum font-mono text-xs text-ink-soft">
                      {r.ownRtoHours != null ? formatHours(r.ownRtoHours) : 'no RTO'}
                    </span>
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <span className="flex items-center gap-2">
                    <TierBadge tier={r.requiredTier} />
                    <span className="tnum font-mono text-xs text-ink-soft">
                      {r.requiredRtoHours != null ? `≤ ${formatHours(r.requiredRtoHours)}` : '·'}
                    </span>
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-xs text-ink-soft">
                  {r.consumers
                    .map((c) => (c.direct ? c.name : `${c.name} (indirect)`))
                    .join(', ')}
                </td>
                <td className="py-2.5">
                  {r.findings.length === 0 ? (
                    <StatusPill tone="ok">Consistent</StatusPill>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <StatusPill tone={worst}>
                        {r.findings.length} conflict{r.findings.length === 1 ? '' : 's'}
                      </StatusPill>
                      <ul className="flex flex-col gap-1 text-xs text-ink-soft">
                        {r.findings.map((f) => (
                          <li key={f.kind}>{f.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RequirementTable({ rows, kind }: { rows: RolledRequirement[]; kind: string }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No {kind} dependencies recorded yet; add them on each process.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {['Name', 'Criticality', 'Required RTO', 'Required RPO', 'Supports'].map((h) => (
              <th key={h} className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-line/60 align-top last:border-0">
              <td className="py-2.5 pr-4 font-medium">{r.name}</td>
              <td className="py-2.5 pr-4">
                <TierBadge tier={r.topTier} />
              </td>
              <td className="tnum py-2.5 pr-4 font-mono text-xs">
                {r.strictestRtoHours != null ? `≤ ${formatHours(r.strictestRtoHours)}` : '·'}
              </td>
              <td className="tnum py-2.5 pr-4 font-mono text-xs">
                {r.strictestRpoHours != null ? `≤ ${formatHours(r.strictestRpoHours)}` : '·'}
              </td>
              <td className="py-2.5 text-xs text-ink-soft">
                {r.processes.map((p) => p.name).join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RequirementsPage() {
  const ws = await loadWorkspace();
  const rollDown = rollDownRequirements(ws);
  const chain = processChainRequirements(ws);
  const cycles = detectDependencyCycles(ws);
  const nameOf = (id: string) => ws.processes.find((p) => p.id === id)?.name ?? id;
  const conflicts = chain.reduce((n, r) => n + r.findings.length, 0);

  return (
    <>
      <PageHeader
        kicker="Step 06"
        title="Inherited requirements"
        intro="The BIA handed down: applications, suppliers, and upstream processes each inherit the strictest recovery objectives of everything that depends on them. Nothing here is entered separately; it is derived live from the process inventory and recovery objectives."
      />

      <HelpBox title="Using this hand-off">
        <ul>
          <li>
            <strong>For IT and disaster recovery:</strong> the applications table is the recovery
            requirements sheet. An application supporting a Tier 1 process must itself be
            recoverable within that process&apos;s RTO, and its backups must meet the strictest RPO
            shown, or the process targets are fiction.
          </li>
          <li>
            <strong>For third-party risk:</strong> the suppliers table shows inherited
            criticality and concentration; a supplier appearing under many processes is a single
            point of failure whose continuity arrangements deserve contractual attention.
          </li>
          <li>
            Requirements tighten automatically as assessments and objectives change; a blank RTO
            means no dependent process has a target yet.
          </li>
          <li>
            <strong>For the process chain:</strong> a process must be at least as critical, and
            recover at least as fast, as everything downstream that cannot run without it. A
            support process rated Tier 3 while feeding a Tier 1 process is a broken plan, not a
            judgement call, and it is flagged here.
          </li>
          <li>
            Spelling matters: dependencies are matched by name (case-insensitive), so &quot;Fiserv&quot;
            and &quot;Fiserv gateway&quot; roll up separately.
          </li>
        </ul>
      </HelpBox>

      {ws.processes.length === 0 ? (
        <EmptyState
          title="Nothing to roll down yet"
          body="Add processes with application and supplier dependencies, then set recovery objectives; the requirements derive themselves."
        >
          <Link href="/processes" className={btn.primary}>
            Go to processes
          </Link>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {cycles.length > 0 && (
            <Card
              title="Circular process dependencies"
              subtitle="Recovery cannot be sequenced while these loops exist"
            >
              <ul className="flex flex-col gap-2 text-sm">
                {cycles.map((cycle) => (
                  <li key={cycle.join('|')} className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="bad">Loop</StatusPill>
                    <span className="text-ink-soft">
                      {cycle.map(nameOf).join(' → ')} → {nameOf(cycle[0])}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-muted">
                Each process in a loop waits on the next, so none can be restored first. Break the
                loop by removing an upstream link or by splitting out the part that genuinely runs
                independently.
              </p>
            </Card>
          )}

          <Card
            title="Process chain requirements"
            subtitle={
              conflicts > 0
                ? `${conflicts} conflict${conflicts === 1 ? '' : 's'} between what a process promises and what depends on it`
                : 'Upstream processes inherit from everything downstream of them'
            }
          >
            <ChainTable rows={chain} />
          </Card>

          <Card
            title="Application recovery requirements"
            subtitle="Inherited from the strictest dependent process"
          >
            <RequirementTable rows={rollDown.applications} kind="application" />
          </Card>
          <Card
            title="Supplier criticality"
            subtitle="Inherited criticality and the processes each supplier supports"
          >
            <RequirementTable rows={rollDown.suppliers} kind="supplier" />
          </Card>
        </div>
      )}
    </>
  );
}
