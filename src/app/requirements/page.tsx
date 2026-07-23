import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { rollDownRequirements, type RolledRequirement } from '@/lib/domain/rolldown';
import { PageHeader, Card, TierBadge, EmptyState, btn } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { formatHours } from '@/lib/format';

export const dynamic = 'force-dynamic';

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

  return (
    <>
      <PageHeader
        kicker="Step 06"
        title="IT & supplier requirements"
        intro="The BIA handed down: every application inherits the strictest recovery objectives of the processes that depend on it, and every supplier inherits their highest criticality. Nothing here is entered separately; it is derived live from the process inventory and recovery objectives."
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
