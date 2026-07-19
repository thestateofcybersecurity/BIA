import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { deriveAll, workflowVsRto } from '@/lib/domain/scoring';
import { PageHeader, Card, TierBadge, StatusPill, EmptyState, btn } from '@/components/ui';
import { formatHours } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function RecoveryPage() {
  const ws = await loadWorkspace();
  const derived = deriveAll(ws);

  const ranked = [...ws.processes].sort(
    (a, b) =>
      (derived.get(b.id)?.priority ?? -1) - (derived.get(a.id)?.priority ?? -1)
  );

  return (
    <>
      <PageHeader
        kicker="Step 05"
        title="Recovery workflows"
        intro="Ordered recovery steps per process, with teams, durations, and dependencies. The total step time is checked against the RTO target: a plan that takes longer than the RTO is a gap, not a plan."
      />
      {ws.processes.length === 0 ? (
        <EmptyState
          title="No processes yet"
          body="Recovery workflows attach to business processes."
        >
          <Link href="/processes/new" className={btn.primary}>
            Add a process
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ranked.map((p) => {
            const wf = ws.workflows.find((w) => w.processId === p.id);
            const obj = ws.objectives.find((o) => o.processId === p.id);
            const total = wf?.steps.reduce((s, x) => s + x.durationHours, 0) ?? 0;
            const check = wf ? workflowVsRto(total, obj?.rtoTargetHours ?? null) : 'unknown';
            return (
              <Link key={p.id} href={`/recovery/${p.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-accent">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold group-hover:text-accent">
                      {p.name}
                    </h3>
                    <TierBadge tier={derived.get(p.id)?.tier ?? null} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {wf && wf.steps.length > 0 ? (
                      <>
                        <span className="tnum font-mono text-ink-soft">
                          {wf.steps.length} steps · {formatHours(total)} total
                        </span>
                        {obj?.rtoTargetHours != null &&
                          (check === 'over' ? (
                            <StatusPill tone="bad">
                              Exceeds RTO {formatHours(obj.rtoTargetHours)}
                            </StatusPill>
                          ) : (
                            <StatusPill tone="ok">
                              Within RTO {formatHours(obj.rtoTargetHours)}
                            </StatusPill>
                          ))}
                      </>
                    ) : (
                      <StatusPill tone="neutral">No workflow yet</StatusPill>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
