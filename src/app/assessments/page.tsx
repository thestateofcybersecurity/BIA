import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { deriveAll, isReviewDue } from '@/lib/domain/scoring';
import { MTPD_LABELS } from '@/lib/domain/constants';
import { PageHeader, Card, TierBadge, StatusPill, EmptyState, btn } from '@/components/ui';
import { HelpBox } from '@/components/help';
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

      <HelpBox title="How the assessment derives its results">
        <p>
          The chain is: <strong>ratings → MTPD → tier → priority</strong>. You rate impact; the
          methodology derives everything else, which removes the "everything is critical" problem
          of self-declared ratings.
        </p>
        <ul>
          <li>
            Each process is rated at five horizons (4h, 24h, 3 days, 1 week, 1 month) across five
            categories on an anchored 0-4 scale. Financial impact is entered as a cumulative
            currency estimate and converted through your organization's revenue-scaled bands.
          </li>
          <li>
            <strong>MTPD</strong> is the earliest horizon where any category hits severity 4
            (intolerable). The tier follows mechanically from the MTPD.
          </li>
          <li>
            The <strong>priority score</strong> (0-100) ranks processes for recovery sequencing:
            60% time criticality from the MTPD, 40% impact magnitude. It never assigns tiers.
          </li>
          <li>
            Run these as short workshops with the process owner; the anchor descriptions under
            the rating grid keep different owners calibrated to the same scale.
          </li>
        </ul>
      </HelpBox>

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
            const assessment = ws.assessments.find((a) => a.processId === p.id);
            const started = assessment != null;
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
                        {assessment?.approvedBy ? (
                          <StatusPill tone="ok">Approved</StatusPill>
                        ) : (
                          <StatusPill tone="warn">Awaiting sign-off</StatusPill>
                        )}
                        {assessment && isReviewDue(assessment) && (
                          <StatusPill tone="bad">Review due</StatusPill>
                        )}
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
