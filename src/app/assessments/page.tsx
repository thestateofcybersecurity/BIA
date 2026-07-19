import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { deriveAll } from '@/lib/domain/scoring';
import { MTPD_LABELS } from '@/lib/domain/constants';
import { PageHeader, Card, TierBadge, StatusPill, EmptyState, btn } from '@/components/ui';
import { formatCompactCurrency } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AssessmentsPage() {
  const ws = await loadWorkspace();
  const derived = deriveAll(ws);
  const currency = ws.org?.currency ?? 'USD';

  return (
    <>
      <PageHeader
        kicker="Step 03"
        title="Impact assessments"
        intro="Rate the impact of full disruption at five time horizons. The methodology derives MTPD (the point where disruption becomes intolerable), the criticality tier, and a priority ranking; none of them are self-declared."
      />

      {!ws.org && (
        <div className="mb-6 rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-ink-soft">
          Financial severity needs the organization profile (annual revenue and risk appetite).{' '}
          <Link href="/organization" className="text-accent underline">
            Set it up first
          </Link>
          .
        </div>
      )}

      {ws.processes.length === 0 ? (
        <EmptyState
          title="Nothing to assess yet"
          body="Add business processes first; each one gets its own time-phased impact assessment."
        >
          <Link href="/processes/new" className={btn.primary}>
            Add a process
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ws.processes.map((p) => {
            const d = derived.get(p.id)!;
            const started = ws.assessments.some((a) => a.processId === p.id);
            return (
              <Link key={p.id} href={`/assessments/${p.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-accent">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold group-hover:text-accent">
                        {p.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {p.owner || 'No owner'} · {p.department || 'No department'}
                      </p>
                    </div>
                    <TierBadge tier={d.tier} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    {d.assessmentComplete ? (
                      <>
                        <StatusPill tone="ok">Assessed</StatusPill>
                        {d.mtpd && (
                          <span className="font-mono">MTPD {MTPD_LABELS[d.mtpd]}</span>
                        )}
                        {d.cost24h != null && d.cost24h > 0 && (
                          <span className="tnum">
                            {formatCompactCurrency(d.cost24h, currency)} / 24h
                          </span>
                        )}
                        {d.priority != null && (
                          <span className="tnum font-mono">priority {d.priority}</span>
                        )}
                      </>
                    ) : (
                      <StatusPill tone={started ? 'warn' : 'neutral'}>
                        {started ? 'In progress' : 'Not started'}
                      </StatusPill>
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
