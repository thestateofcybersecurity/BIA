import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { deriveAll } from '@/lib/domain/scoring';
import { deriveRisks, riskMatrix, riskConcentration, processRiskLoad } from '@/lib/domain/risk';
import { suggestRisks } from '@/lib/domain/risk-suggestions';
import { aiEnabled } from '@/lib/ai/client';
import { DEPENDENCY_CLASSES } from '@/lib/domain/constants';
import { PageHeader, Card, StatusPill, EmptyState, btn } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { RiskClient } from './risk-client';

export const dynamic = 'force-dynamic';
// The Claude suggestion action runs on this route and, once the register has
// content to reason around, has taken minutes rather than seconds.
export const maxDuration = 300;

export default async function RisksPage() {
  const ws = await loadWorkspace();
  const derived = deriveAll(ws);
  const rows = deriveRisks(ws);
  const matrix = riskMatrix(rows);
  const concentration = riskConcentration(ws);
  const load = processRiskLoad(rows);
  // Candidates the inventory already implies, minus anything registered and
  // anything already ruled on. Stored AI suggestions survive the reload that
  // regenerating the derived ones does not.
  const decided = new Set(
    (ws.riskSuggestions ?? []).filter((s) => s.status !== 'open').map((s) => s.id)
  );
  const suggestions = [
    ...suggestRisks(ws)
      .filter((s) => !decided.has(s.id))
      .slice(0, 12),
    ...(ws.riskSuggestions ?? [])
      .filter((s) => s.status === 'open')
      .map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        description: s.description,
        processIds: s.processIds,
        dependencies: s.dependencies,
        basis: s.basis,
        source: 'ai' as const,
      })),
  ];

  // Every dependency named anywhere in the inventory, so risks reuse the
  // same spellings the roll-down matches on.
  const dependencyOptions = [
    ...new Set(
      ws.processes.flatMap((p) => DEPENDENCY_CLASSES.flatMap((c) => p.dependencies[c]))
    ),
  ]
    .map((d) => d.trim())
    .filter(Boolean)
    .sort();

  const uncovered = ws.processes.filter(
    (p) =>
      derived.get(p.id)?.tier === 1 &&
      !ws.risks.some((r) => r.processIds.includes(p.id))
  );

  return (
    <>
      <PageHeader
        kicker="Step 04"
        title="Risk register"
        intro="The other half of ISO 22301 clause 8.2. The impact assessment says how bad a disruption would be; this says what could cause one and how likely it is. Impact is never re-entered here: each threat inherits it from the assessments of the processes it would disrupt."
      />

      <HelpBox title="How risks are rated">
        <ul>
          <li>
            <strong>You supply likelihood; the app supplies impact.</strong> Likelihood uses an
            anchored 0-4 scale tied to expected frequency, so &quot;possible&quot; means the same thing to
            every assessor. Impact comes from the criticality tier of the most critical process
            the threat disrupts (Tier 1 gives impact 4, down to Tier 4 giving 1), because tier
            derives from MTPD and MTPD is precisely how fast the disruption becomes intolerable.
            A threat that takes out a Tier 1 process cannot be quietly rated minor, and re-tiering
            a process re-rates every threat against it without touching the register.
          </li>
          <li>
            <strong>Score = likelihood × impact</strong>, 0 to 16, banded Low (0-3), Medium (4-7),
            High (8-11), Critical (12+). Nothing is annualised: the BIA deliberately measures a
            single occurrence, and multiplying by a made-up frequency would launder a guess into a
            number.
          </li>
          <li>
            <strong>Treatment is the ISO 31000 four:</strong> avoid, reduce, transfer, accept.
            Transfer is worth calling out; insurance moves the financial consequence, it does not
            keep the process running, so a transferred risk still needs the recovery capability
            the gap register tracks.
          </li>
          <li>
            Link the dependencies a threat attacks using the same names as the process inventory.
            A dependency appearing under several risks turns separate threats into one correlated
            event, which is exactly what single-risk thinking misses.
          </li>
        </ul>
      </HelpBox>

      {ws.processes.length === 0 ? (
        <EmptyState
          title="Assess processes first"
          body="Risks inherit their impact from process assessments, so the register needs an inventory to attach to."
        >
          <Link href="/processes/new" className={btn.primary}>
            Add a process
          </Link>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          <RiskClient
            rows={rows.map((r) => ({
              risk: r.risk,
              impact: r.impact,
              score: r.score,
              band: r.band,
              topTier: r.topTier,
              exposure24h: r.exposure24h,
              affected: r.affected,
              unassessedCount: r.unassessedCount,
            }))}
            processes={ws.processes.map((p) => ({
              id: p.id,
              name: p.name,
              tier: derived.get(p.id)?.tier ?? null,
            }))}
            dependencyOptions={dependencyOptions}
            matrix={matrix}
            currency={ws.org?.currency ?? 'USD'}
            suggestions={suggestions}
            aiAvailable={aiEnabled()}
          />

          {(uncovered.length > 0 || concentration.length > 0 || load.length > 0) && (
            <div className="grid gap-6 lg:grid-cols-2">
              {uncovered.length > 0 && (
                <Card
                  title="Coverage gaps"
                  subtitle="Tier 1 processes with no registered threat"
                >
                  <ul className="flex flex-col gap-2 text-sm">
                    {uncovered.map((p) => (
                      <li key={p.id} className="flex items-center gap-2">
                        <StatusPill tone="warn">Uncovered</StatusPill>
                        <Link href="/risks" className="text-ink-soft">
                          {p.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-ink-muted">
                    A critical process with no identified threat usually means the register is
                    incomplete rather than the process being safe.
                  </p>
                </Card>
              )}

              {concentration.length > 0 && (
                <Card
                  title="Correlated exposure"
                  subtitle="Dependencies named by more than one risk"
                >
                  <ul className="flex flex-col gap-2 text-sm">
                    {concentration.map((c) => (
                      <li key={c.name}>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-ink-muted"> · {c.risks.length} risks</span>
                        <p className="text-xs text-ink-muted">{c.risks.join('; ')}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-ink-muted">
                    These are not independent events. Treating one threat here reduces several
                    lines of the register at once.
                  </p>
                </Card>
              )}

              {load.length > 0 && (
                <Card
                  title="Where the risk lands"
                  subtitle="Processes carrying high or critical risk"
                >
                  <ul className="flex flex-col gap-2 text-sm">
                    {load.map((l) => (
                      <li key={l.processId} className="flex items-center justify-between gap-3">
                        <Link
                          href={`/processes/${l.processId}`}
                          className="hover:text-accent"
                        >
                          {l.name}
                        </Link>
                        <span className="tnum font-mono text-xs text-ink-muted">
                          {l.count} risk{l.count === 1 ? '' : 's'} · top {l.topScore}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-ink-muted">
                    Cross-check against the gap register: a process carrying high risk and an open
                    recovery gap is where an incident actually hurts.
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
