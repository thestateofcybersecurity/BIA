import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { deriveAll } from '@/lib/domain/scoring';
import { DEPENDENCY_CLASSES } from '@/lib/domain/constants';
import { PageHeader, Card, TierBadge, EmptyState, btn, StatusPill } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ProcessesPage() {
  const ws = await loadWorkspace();
  const derived = deriveAll(ws);

  return (
    <>
      <PageHeader
        kicker="Step 02"
        title="Business processes"
        intro="Catalogue what the organization does and what each process depends on. Dependencies drive tabletop scenarios and recovery planning; tiers appear once impact assessments are complete."
        actions={
          <Link href="/processes/new" className={btn.primary}>
            Add process
          </Link>
        }
      />

      {ws.processes.length === 0 ? (
        <EmptyState
          title="No processes yet"
          body="Start with the handful of processes the business could not survive without: order intake, production, payroll, customer support."
        >
          <Link href="/processes/new" className={btn.primary}>
            Add your first process
          </Link>
        </EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Process', 'Owner', 'Department', 'Dependencies', 'Assessment', 'Tier'].map(
                    (h) => (
                      <th
                        key={h}
                        className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {ws.processes.map((p) => {
                  const d = derived.get(p.id)!;
                  const depCount = DEPENDENCY_CLASSES.reduce(
                    (s, c) => s + p.dependencies[c].length,
                    0
                  );
                  return (
                    <tr key={p.id} className="border-b border-line/60 last:border-0">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/processes/${p.id}`}
                          className="font-medium hover:text-accent"
                        >
                          {p.name}
                        </Link>
                        {p.description && (
                          <p className="mt-0.5 max-w-sm truncate text-xs text-ink-muted">
                            {p.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{p.owner || '·'}</td>
                      <td className="py-3 pr-4 text-ink-soft">{p.department || '·'}</td>
                      <td className="tnum py-3 pr-4 text-ink-soft">{depCount}</td>
                      <td className="py-3 pr-4">
                        {d.assessmentComplete ? (
                          <StatusPill tone="ok">Complete</StatusPill>
                        ) : (
                          <Link href={`/assessments/${p.id}`}>
                            <StatusPill tone="warn">
                              {ws.assessments.some((a) => a.processId === p.id)
                                ? 'In progress'
                                : 'Not started'}
                            </StatusPill>
                          </Link>
                        )}
                      </td>
                      <td className="py-3">
                        <TierBadge tier={d.tier} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
