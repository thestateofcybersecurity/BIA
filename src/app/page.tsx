import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { deriveAll, computeGaps } from '@/lib/domain/scoring';
import { scoreMaturity } from '@/lib/domain/maturity';
import {
  HORIZONS,
  HORIZON_LABELS,
  MTPD_LABELS,
  RATED_CATEGORIES,
} from '@/lib/domain/constants';
import type { Severity } from '@/lib/domain/types';
import {
  PageHeader,
  Card,
  StatTile,
  TierBadge,
  SeverityCell,
  StatusPill,
  EmptyState,
  btn,
} from '@/components/ui';
import { LoadSampleButton } from '@/components/workspace-buttons';
import { HelpBox } from '@/components/help';
import { CostBarChart } from '@/components/charts';
import { formatCompactCurrency, formatHours } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const ws = await loadWorkspace();
  const derived = deriveAll(ws);
  const currency = ws.org?.currency ?? 'USD';

  if (!ws.org && ws.processes.length === 0) {
    return (
      <>
        <PageHeader
          kicker="Overview"
          title="Business Impact Assessment"
          intro="A standards-based BIA: time-phased impact ratings drive MTPD, criticality tiers, recovery objectives, and a fully data-driven continuity plan."
        />
        <EmptyState
          title="Start your assessment"
          body="Set up your organization profile first; it calibrates the financial impact bands to your size. Or load the Lakeside Mutual sample workspace to explore the full methodology with realistic data."
        >
          <Link href="/organization" className={btn.primary}>
            Set up organization
          </Link>
          <LoadSampleButton variant="secondary" />
        </EmptyState>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['01', 'Profile & inventory', 'Describe the organization, then catalogue processes and their dependencies.'],
            ['02', 'Assess impact over time', 'Rate disruption impact at five horizons; MTPD, tiers, and priorities are derived, never declared.'],
            ['03', 'Close the gaps', 'Set recovery objectives, find RTO/RPO gaps, exercise with tabletops, and generate the BC plan.'],
          ].map(([num, title, body]) => (
            <div key={num} className="rounded-lg border border-line bg-surface/60 p-5">
              <p className="font-mono text-xs text-accent">{num}</p>
              <h3 className="mt-2 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  const allDerived = [...derived.values()];
  const assessed = allDerived.filter((d) => d.assessmentComplete);
  const tier1 = allDerived.filter((d) => d.tier === 1).length;
  const tier2 = allDerived.filter((d) => d.tier === 2).length;
  // Same rule as the BC plan report: every process with a 24h loss estimate.
  const cost24 = allDerived.reduce((s, d) => s + (d.cost24h ?? 0), 0);

  const allGaps = ws.objectives.flatMap((o) =>
    computeGaps(o, derived.get(o.processId)?.mtpd ?? null)
  );
  const openGaps = allGaps.filter((g) => {
    const rem = ws.remediations.find(
      (r) => r.processId === g.processId && r.kind === g.kind
    );
    return !rem || rem.status === 'open' || rem.status === 'in_progress';
  });

  const maturity = scoreMaturity(ws.maturity);

  const ranked = ws.processes
    .map((p) => ({ p, d: derived.get(p.id)! }))
    .sort((a, b) => (b.d.priority ?? -1) - (a.d.priority ?? -1));

  const costData = ranked
    .filter(({ d }) => (d.cost24h ?? 0) > 0)
    .slice(0, 6)
    .map(({ p, d }) => ({ name: p.name, cost: d.cost24h! }));

  const maxSeverityAt = (processId: string, h: (typeof HORIZONS)[number]): Severity | null => {
    const a = ws.assessments.find((x) => x.processId === processId);
    if (!a) return null;
    let max: Severity | null = derived.get(processId)?.financialSeverity[h] ?? null;
    for (const cat of RATED_CATEGORIES) {
      const v = a.ratings[cat][h];
      if (v != null && (max == null || v > max)) max = v;
    }
    return max;
  };

  const nameOf = (id: string) => ws.processes.find((p) => p.id === id)?.name ?? id;

  return (
    <>
      <PageHeader
        kicker="Overview"
        title={ws.org?.name ?? 'Dashboard'}
        intro={
          ws.org
            ? `${ws.org.industry} · ${formatCompactCurrency(ws.org.annualRevenue, currency)} revenue · ${ws.org.employees.toLocaleString()} employees · ${ws.org.riskAppetite} risk appetite`
            : undefined
        }
      />

      <HelpBox title="Reading this dashboard">
        <p>
          Every number here is <strong>derived live</strong> from your assessments; nothing is
          entered on this page.
        </p>
        <ul>
          <li>
            <strong>Heatmap cells</strong> show the worst severity (0 negligible to 4 severe)
            across all five impact categories at each time horizon. Reading a row left to right
            shows how the damage of an outage grows over time.
          </li>
          <li>
            <strong>MTPD</strong> (Maximum Tolerable Period of Disruption) is the first horizon
            where any category reaches severity 4. The criticality tier follows from it: Tier 1
            Critical within 24 hours, Tier 2 Essential within 3 days, Tier 3 Important within a
            month, Tier 4 Deferrable beyond.
          </li>
          <li>
            <strong>24h downtime exposure</strong> sums the entered 24-hour loss estimates across
            processes. It is a portfolio-wide worst case (everything down at once), useful for
            sizing the problem, not a prediction.
          </li>
          <li>
            <strong>Open recovery gaps</strong> counts processes whose achievable recovery falls
            short of its target and has no resolved or accepted remediation yet.
          </li>
        </ul>
      </HelpBox>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile
          label="Processes"
          value={String(ws.processes.length)}
          detail={`${assessed.length} fully assessed`}
        />
        <StatTile
          label="Tier 1 · Critical"
          value={String(tier1)}
          detail={`${tier2} Tier 2 Essential`}
          tone={tier1 > 0 ? 'bad' : undefined}
        />
        <StatTile
          label="24h downtime exposure"
          value={formatCompactCurrency(cost24, currency)}
          detail="Sum of entered 24h loss estimates"
          tone="accent"
        />
        <StatTile
          label="Open recovery gaps"
          value={String(openGaps.length)}
          detail={`${allGaps.length} total identified`}
          tone={openGaps.length > 0 ? 'bad' : undefined}
        />
        <StatTile
          label="Maturity"
          value={maturity.overall != null ? `${maturity.overall.toFixed(1)}/5` : '·'}
          detail={`${maturity.answered}/${maturity.total} questions answered`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card
          title="Impact heatmap"
          subtitle="Worst severity across all categories, per process and horizon. MTPD marks where disruption becomes intolerable."
          className="lg:col-span-3"
        >
          {ranked.length === 0 ? (
            <p className="text-sm text-ink-muted">Add processes to see the heatmap.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate" style={{ borderSpacing: '2px' }}>
                <thead>
                  <tr>
                    <th className="pr-3 text-left font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted">
                      Process
                    </th>
                    {HORIZONS.map((h) => (
                      <th
                        key={h}
                        className="px-1 text-center font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted"
                      >
                        {HORIZON_LABELS[h]}
                      </th>
                    ))}
                    <th className="pl-3 text-left font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted">
                      MTPD / Tier
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map(({ p, d }) => (
                    <tr key={p.id}>
                      <td className="max-w-[180px] truncate pr-3 text-sm">
                        <Link href={`/assessments/${p.id}`} className="hover:text-accent">
                          {p.name}
                        </Link>
                      </td>
                      {HORIZONS.map((h) => (
                        <td key={h} className="px-1 text-center">
                          <SeverityCell
                            value={maxSeverityAt(p.id, h)}
                            title={`${p.name} · ${HORIZON_LABELS[h]}`}
                          />
                        </td>
                      ))}
                      <td className="whitespace-nowrap pl-3 text-xs text-ink-soft">
                        {d.mtpd ? (
                          <span className="mr-2 font-mono">{MTPD_LABELS[d.mtpd]}</span>
                        ) : null}
                        <TierBadge tier={d.tier} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 font-mono text-[10px] text-ink-faint">
                0 negligible · 1 minor · 2 moderate · 3 major · 4 severe (intolerable)
              </p>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Cost of downtime" subtitle="Cumulative loss at the 24 hour horizon">
            {costData.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Complete impact assessments to chart downtime cost.
              </p>
            ) : (
              <CostBarChart data={costData} currency={currency} />
            )}
          </Card>

          <Card title="Recovery gaps" subtitle="Achievable capability short of target">
            {allGaps.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No gaps identified. Set targets and achievable values under Objectives &amp; gaps.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {allGaps
                  .sort((a, b) => b.gapHours - a.gapHours)
                  .slice(0, 5)
                  .map((g) => (
                    <li
                      key={`${g.processId}-${g.kind}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-line bg-paper/60 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{nameOf(g.processId)}</p>
                        <p className="font-mono text-[10px] uppercase text-ink-muted">
                          {g.kind} · target {formatHours(g.targetHours)} · achievable{' '}
                          {formatHours(g.achievableHours)}
                        </p>
                      </div>
                      <StatusPill tone={g.severity === 'high' ? 'bad' : g.severity === 'medium' ? 'warn' : 'neutral'}>
                        +{formatHours(g.gapHours)}
                      </StatusPill>
                    </li>
                  ))}
              </ul>
            )}
            <Link href="/gaps" className="mt-3 inline-block text-xs text-accent hover:underline">
              Open the gap register →
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
