import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { deriveAll, computeGaps } from '@/lib/domain/scoring';
import { scoreMaturity, MATURITY_DOMAINS } from '@/lib/domain/maturity';
import { CATALOG } from '@/lib/domain/scenarios';
import {
  MTPD_LABELS,
  TIER_LABELS,
  DEPENDENCY_CLASSES,
  DEPENDENCY_LABELS,
  HORIZONS,
  HORIZON_LABELS,
} from '@/lib/domain/constants';
import type { Tier } from '@/lib/domain/types';
import { PageHeader, TierBadge, StatusPill, EmptyState, btn } from '@/components/ui';
import { PrintButton } from '@/components/print-button';
import { formatCurrency, formatCompactCurrency, formatHours, formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

function Section({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="print-page mt-10">
      <h2 className="mb-4 border-b border-line pb-2 font-display text-2xl font-semibold">
        <span className="mr-3 font-mono text-sm text-accent">{num}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const th =
  'pb-2 pr-4 text-left font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted';
const td = 'border-b border-line/60 py-2 pr-4 align-top';

export default async function ReportPage() {
  const ws = await loadWorkspace();

  if (!ws.org || ws.processes.length === 0) {
    return (
      <>
        <PageHeader kicker="Step 08" title="Business continuity plan" />
        <EmptyState
          title="Not enough data for a report"
          body="The report is generated entirely from your assessment data: organization profile, processes, impact assessments, recovery objectives, and maturity results. Nothing is boilerplate."
        >
          <Link href="/organization" className={btn.primary}>
            Start with the organization profile
          </Link>
        </EmptyState>
      </>
    );
  }

  const org = ws.org;
  const currency = org.currency;
  const derived = deriveAll(ws);
  const maturity = scoreMaturity(ws.maturity);
  const today = new Date().toISOString();

  const ranked = ws.processes
    .map((p) => ({ p, d: derived.get(p.id)! }))
    .sort((a, b) => (b.d.priority ?? -1) - (a.d.priority ?? -1));

  const tierCount = (t: Tier) => ranked.filter(({ d }) => d.tier === t).length;
  const cost24 = ranked.reduce((s, { d }) => s + (d.cost24h ?? 0), 0);
  const cost1w = ranked.reduce((s, { p }) => {
    const a = ws.assessments.find((x) => x.processId === p.id);
    return s + (a?.financialLoss.w1 ?? 0);
  }, 0);

  const gaps = ws.objectives
    .flatMap((o) => computeGaps(o, derived.get(o.processId)?.mtpd ?? null))
    .sort((a, b) => b.gapHours - a.gapHours);

  const nameOf = (id: string) => ws.processes.find((p) => p.id === id)?.name ?? id;
  const remFor = (processId: string, kind: 'rto' | 'rpo') =>
    ws.remediations.find((r) => r.processId === processId && r.kind === kind);

  return (
    <>
      <div className="no-print">
        <PageHeader
          kicker="Step 08"
          title="Business continuity plan"
          intro="Generated entirely from this workspace's data. Use your browser's print dialog to save as PDF; page breaks are handled."
          actions={<PrintButton label="Print / save PDF" />}
        />
      </div>

      <article className="rounded-lg border border-line bg-surface p-8 shadow-card print:border-0 print:p-0 print:shadow-none">
        {/* Cover */}
        <div className="border-b-2 border-ink pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
            Business continuity plan
          </p>
          <h1 className="mt-2 font-display text-5xl font-semibold tracking-tight">
            {org.name}
          </h1>
          <p className="mt-4 text-sm text-ink-soft">
            {org.industry} · {org.employees.toLocaleString()} employees ·{' '}
            {formatCompactCurrency(org.annualRevenue, currency)} annual revenue
          </p>
          <p className="mt-1 font-mono text-xs text-ink-muted">
            Generated {formatDate(today)} · Methodology: ISO 22317 / ISO 22301 / NIST SP 800-34
          </p>
        </div>

        <Section num="01" title="Executive summary">
          <div className="grid gap-4 sm:grid-cols-4">
            {([1, 2, 3, 4] as Tier[]).map((t) => (
              <div key={t} className="rounded-md border border-line bg-paper/60 p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  {TIER_LABELS[t]}
                </p>
                <p className="tnum mt-1 font-display text-3xl font-semibold">{tierCount(t)}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            {ws.processes.length} business processes were assessed using time-phased impact
            analysis. A 24 hour disruption across all assessed processes represents an
            estimated {formatCurrency(cost24, currency)} in cumulative losses, rising to{' '}
            {formatCurrency(cost1w, currency)} at one week. {gaps.length} recovery gap
            {gaps.length === 1 ? '' : 's'} {gaps.length === 1 ? 'is' : 'are'} currently on
            the register{gaps.length > 0 ? ', detailed in section 06' : ''}. Overall program
            maturity is{' '}
            {maturity.overall != null ? `${maturity.overall.toFixed(1)} of 5` : 'not yet assessed'}
            .
          </p>
        </Section>

        <Section num="02" title="Scope & organization">
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Organization', org.name],
                ['Industry', org.industry || 'Not specified'],
                ['Regulatory context', org.regulatoryContext || 'Not specified'],
                ['Annual revenue', formatCurrency(org.annualRevenue, currency)],
                ['Employees', org.employees.toLocaleString()],
                ['Risk appetite', org.riskAppetite],
                ['Processes in scope', String(ws.processes.length)],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className={`${td} w-52 font-mono text-[11px] uppercase tracking-wider text-ink-muted`}>
                    {k}
                  </td>
                  <td className={td}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section num="03" title="Methodology">
          <p className="text-sm leading-relaxed text-ink-soft">
            Each process was assessed for the impact of full disruption at five horizons
            ({HORIZONS.map((h) => HORIZON_LABELS[h]).join(', ')}) across five categories:
            financial, operational, customers and reputation, legal and regulatory, and
            health and safety, on an anchored 0 to 4 severity scale. Financial severity is
            derived from loss estimates against bands scaled to annual revenue and risk
            appetite. The Maximum Tolerable Period of Disruption (MTPD) is the earliest
            horizon at which any category reaches severity 4; criticality tiers follow from
            MTPD (Tier 1 within 24 hours, Tier 2 within 3 days, Tier 3 within 1 month,
            Tier 4 beyond). Recovery time objectives are validated to sit below MTPD, and
            shortfalls between achievable and target recovery produce the gap register.
          </p>
        </Section>

        <Section num="04" title="Process inventory & dependencies">
          {ranked.map(({ p }) => (
            <div key={p.id} className="mb-5 rounded-md border border-line bg-paper/40 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                <p className="font-mono text-xs text-ink-muted">
                  {p.owner || 'No owner'} · {p.department || 'No department'}
                </p>
              </div>
              {p.description && (
                <p className="mt-1 text-sm text-ink-soft">{p.description}</p>
              )}
              <div className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                {DEPENDENCY_CLASSES.filter((c) => p.dependencies[c].length > 0).map((c) => (
                  <p key={c}>
                    <span className="font-mono uppercase tracking-wider text-ink-muted">
                      {DEPENDENCY_LABELS[c]}:
                    </span>{' '}
                    <span className="text-ink-soft">{p.dependencies[c].join(', ')}</span>
                  </p>
                ))}
                {p.upstreamProcessIds.length > 0 && (
                  <p>
                    <span className="font-mono uppercase tracking-wider text-ink-muted">
                      Upstream processes:
                    </span>{' '}
                    <span className="text-ink-soft">
                      {p.upstreamProcessIds.map(nameOf).join(', ')}
                    </span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </Section>

        <Section num="05" title="BIA results">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Process', 'MTPD', 'Tier', 'Priority', '24h cost', '1 week cost'].map((h) => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ p, d }) => {
                const a = ws.assessments.find((x) => x.processId === p.id);
                return (
                  <tr key={p.id}>
                    <td className={td}>
                      {p.name}
                      {d.mtpdOverridden && (
                        <span className="ml-2 font-mono text-[10px] uppercase text-warn">
                          MTPD overridden
                        </span>
                      )}
                    </td>
                    <td className={`${td} font-mono text-xs`}>
                      {d.mtpd ? MTPD_LABELS[d.mtpd] : 'Incomplete'}
                    </td>
                    <td className={td}><TierBadge tier={d.tier} /></td>
                    <td className={`${td} tnum font-mono text-xs`}>{d.priority ?? '·'}</td>
                    <td className={`${td} tnum font-mono text-xs`}>
                      {d.cost24h != null ? formatCurrency(d.cost24h, currency) : '·'}
                    </td>
                    <td className={`${td} tnum font-mono text-xs`}>
                      {a?.financialLoss.w1 != null
                        ? formatCurrency(a.financialLoss.w1, currency)
                        : '·'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {ranked.some(({ d }) => d.mtpdOverridden) && (
            <div className="mt-3 text-xs text-ink-muted">
              {ranked
                .filter(({ d }) => d.mtpdOverridden)
                .map(({ p }) => {
                  const a = ws.assessments.find((x) => x.processId === p.id);
                  return (
                    <p key={p.id}>
                      <span className="font-medium">{p.name}</span> MTPD override
                      justification: {a?.mtpdOverride?.justification}
                    </p>
                  );
                })}
            </div>
          )}
        </Section>

        <Section num="06" title="Recovery objectives & gap register">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Process', 'RTO target', 'RTO achievable', 'RPO target', 'RPO achievable', 'MBCO'].map((h) => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ws.objectives.map((o) => (
                <tr key={o.id}>
                  <td className={td}>{nameOf(o.processId)}</td>
                  <td className={`${td} tnum font-mono text-xs`}>{o.rtoTargetHours != null ? formatHours(o.rtoTargetHours) : '·'}</td>
                  <td className={`${td} tnum font-mono text-xs`}>{o.rtoAchievableHours != null ? formatHours(o.rtoAchievableHours) : '·'}</td>
                  <td className={`${td} tnum font-mono text-xs`}>{o.rpoTargetHours != null ? formatHours(o.rpoTargetHours) : '·'}</td>
                  <td className={`${td} tnum font-mono text-xs`}>{o.rpoAchievableHours != null ? formatHours(o.rpoAchievableHours) : '·'}</td>
                  <td className={`${td} tnum font-mono text-xs`}>{o.mbcoPercent != null ? `${o.mbcoPercent}%` : '·'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {gaps.length > 0 && (
            <>
              <h3 className="mt-6 mb-2 font-display text-lg font-semibold">Gap register</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Process', 'Gap', 'Shortfall', 'Owner', 'Remediation', 'Status'].map((h) => (
                      <th key={h} className={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((g) => {
                    const rem = remFor(g.processId, g.kind);
                    return (
                      <tr key={`${g.processId}-${g.kind}`}>
                        <td className={td}>{nameOf(g.processId)}</td>
                        <td className={`${td} font-mono text-xs uppercase`}>{g.kind}</td>
                        <td className={td}>
                          <StatusPill tone={g.severity === 'high' ? 'bad' : g.severity === 'medium' ? 'warn' : 'neutral'}>
                            +{formatHours(g.gapHours)}
                          </StatusPill>
                        </td>
                        <td className={td}>{rem?.owner || 'Unassigned'}</td>
                        <td className={`${td} max-w-xs text-xs`}>{rem?.action || 'Not defined'}</td>
                        <td className={`${td} font-mono text-xs uppercase`}>{rem?.status.replace('_', ' ') ?? 'open'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </Section>

        <Section num="07" title="Recovery workflows">
          {ws.workflows.length === 0 ? (
            <p className="text-sm text-ink-muted">No recovery workflows documented yet.</p>
          ) : (
            ws.workflows.map((wf) => {
              const total = wf.steps.reduce((s, x) => s + x.durationHours, 0);
              const obj = ws.objectives.find((o) => o.processId === wf.processId);
              return (
                <div key={wf.id} className="mb-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold">{nameOf(wf.processId)}</h3>
                    <p className="font-mono text-xs text-ink-muted">
                      {wf.steps.length} steps · {formatHours(total)} sequential
                      {obj?.rtoTargetHours != null && ` · RTO target ${formatHours(obj.rtoTargetHours)}`}
                      {obj?.rtoTargetHours != null && total > obj.rtoTargetHours && (
                        <span className="ml-1 text-bad">· exceeds RTO</span>
                      )}
                    </p>
                  </div>
                  <ol className="mt-2 flex flex-col gap-2">
                    {wf.steps.map((s, i) => (
                      <li key={s.id} className="flex gap-3 rounded-md border border-line/60 bg-paper/40 p-3 text-sm">
                        <span className="tnum font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
                        <div>
                          <p>{s.description}</p>
                          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                            {s.team || 'Unassigned'} · {formatHours(s.durationHours)}
                            {s.alternateStaff.length > 0 && ` · alternates: ${s.alternateStaff.join(', ')}`}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })
          )}
        </Section>

        <Section num="08" title="Exercise program">
          <p className="mb-3 text-sm leading-relaxed text-ink-soft">
            The following tabletop scenarios are available, generated from this plan&apos;s data.
            Recommended cadence: two exercises per year minimum, rotating categories, with
            results feeding the maturity assessment and the gap register.
          </p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {CATALOG.map((s) => (
              <li key={s.id} className="rounded-md border border-line/60 bg-paper/40 p-3">
                <p className="font-medium">{s.title}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{s.summary}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section num="09" title="Maturity & roadmap">
          {maturity.overall == null ? (
            <p className="text-sm text-ink-muted">Maturity assessment not yet completed.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-ink-soft">
                Overall maturity{' '}
                <span className="tnum font-mono font-medium text-ink">
                  {maturity.overall.toFixed(1)} / 5
                </span>{' '}
                across {MATURITY_DOMAINS.length} ISO 22301 domains ({maturity.answered} of{' '}
                {maturity.total} questions answered).
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Domain</th>
                    <th className={th}>Clause</th>
                    <th className={th}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {maturity.domains.map((d) => {
                    const meta = MATURITY_DOMAINS.find((m) => m.id === d.domainId)!;
                    return (
                      <tr key={d.domainId}>
                        <td className={td}>{d.name}</td>
                        <td className={`${td} font-mono text-xs text-ink-muted`}>{meta.clause}</td>
                        <td className={`${td} tnum font-mono text-xs`}>
                          {d.score != null ? `${d.score.toFixed(1)} / 5` : 'Not assessed'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {maturity.roadmap.length > 0 && (
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                  Improvement priority (weakest first):{' '}
                  {maturity.roadmap.map((d) => d.name).join(', ')}.
                </p>
              )}
            </>
          )}
        </Section>
      </article>
    </>
  );
}
