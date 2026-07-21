import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { CATALOG } from '@/lib/domain/scenarios';
import { deriveAll } from '@/lib/domain/scoring';
import { PageHeader, Card, StatusPill } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ExercisesPage() {
  const ws = await loadWorkspace();
  const derived = deriveAll(ws);
  const tier1 = [...derived.values()].filter((d) => d.tier === 1).length;
  const sessions = [...ws.exercises].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader
        kicker="Step 07"
        title="Tabletop exercises"
        intro={`Each scenario is generated from your assessment data: it names your actual critical processes, dependency concentrations, and known recovery gaps. Run one as a live session to record the room's responses and get a Claude-written after-action report. ${
          tier1 > 0
            ? `Your workspace currently has ${tier1} Tier 1 process${tier1 === 1 ? '' : 'es'} to exercise against.`
            : 'Complete impact assessments first to get fully tailored exercises.'
        }`}
      />

      <HelpBox title="Exercises, sessions, and reports">
        <ul>
          <li>
            The six <strong>scenario templates</strong> below are always available and already
            populated with your data. Open one to read it, print a facilitator pack, or start a
            session.
          </li>
          <li>
            A <strong>live session</strong> walks the room through the phases while you record
            the answer to every discussion question plus your own observation notes. Two per year,
            rotating categories, is a sound cadence.
          </li>
          <li>
            With Claude configured, <strong>tailored generation</strong> designs a bespoke
            exercise from your assessment: injects are written to collide with your documented
            recovery gaps, and questions target your weakest maturity domains.
          </li>
          <li>
            Completing a session unlocks the <strong>after-action report</strong>: strengths,
            gaps, prioritized recommendations with owners, and maturity signals to feed back into
            the self-assessment. Exercise → findings → remediation → re-assessment is the loop
            that makes the program improve.
          </li>
        </ul>
      </HelpBox>

      {sessions.length > 0 && (
        <Card title="Sessions" subtitle="Live runs of your exercises" className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Exercise', 'Type', 'Started', 'Status', 'Report'].map((h) => (
                    <th key={h} className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 pr-4">
                      <Link href={`/exercises/session/${s.id}`} className="font-medium hover:text-accent">
                        {s.scenario.title}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill tone={s.mode === 'ai' ? 'warn' : 'neutral'}>
                        {s.mode === 'ai' ? 'Claude-tailored' : 'Template'}
                      </StatusPill>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-ink-soft">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill tone={s.status === 'completed' ? 'ok' : 'neutral'}>
                        {s.status === 'completed' ? 'Completed' : 'In progress'}
                      </StatusPill>
                    </td>
                    <td className="py-2.5">
                      {s.report ? (
                        <Link href={`/exercises/session/${s.id}`} className="text-xs text-accent hover:underline">
                          View report →
                        </Link>
                      ) : (
                        <span className="text-xs text-ink-faint">·</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CATALOG.map((s) => (
          <Link key={s.id} href={`/exercises/${s.id}`} className="group">
            <Card className="h-full transition-colors group-hover:border-accent">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent">
                {s.category}
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold group-hover:text-accent">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.summary}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
