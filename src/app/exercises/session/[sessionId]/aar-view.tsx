import type { ExerciseSession } from '@/lib/domain/types';
import { MATURITY_DOMAINS } from '@/lib/domain/maturity';
import { Card, StatusPill } from '@/components/ui';
import { formatDate } from '@/lib/format';

const PRIORITY_TONE = { high: 'bad', medium: 'warn', low: 'neutral' } as const;

export function AarView({ session }: { session: ExerciseSession }) {
  const report = session.report!;
  const domainName = (id: string) =>
    MATURITY_DOMAINS.find((d) => d.id === id)?.name ?? id;

  return (
    <article className="flex flex-col gap-6">
      <Card title="Executive summary" className="print-page">
        <p className="text-sm leading-relaxed text-ink-soft">{report.executiveSummary}</p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          Generated {formatDate(report.generatedAt)} · exercise run {formatDate(session.createdAt)}
        </p>
      </Card>

      <Card title="Timeline" className="print-page">
        <ol className="flex flex-col gap-2">
          {report.timeline.map((t, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="font-medium">{t.phase}</p>
                <p className="text-ink-soft">{t.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Strengths" className="print-page">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-soft">
            {report.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Card>
        <Card title="Gaps observed" className="print-page">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-soft">
            {report.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Recommendations" subtitle="Prioritized, with rationale and suggested owners" className="print-page">
        <div className="flex flex-col gap-3">
          {report.recommendations.map((r, i) => (
            <div key={i} className="rounded-md border border-line bg-paper/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={PRIORITY_TONE[r.priority]}>{r.priority}</StatusPill>
                <p className="text-sm font-medium">{r.item}</p>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{r.rationale}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                Suggested owner: {r.suggestedOwner}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Follow-ups" className="print-page">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              {['Action', 'Suggested owner', 'Due'].map((h) => (
                <th key={h} className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.followUps.map((f, i) => (
              <tr key={i} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-4">{f.item}</td>
                <td className="py-2 pr-4 text-ink-soft">{f.suggestedOwner}</td>
                <td className="py-2 font-mono text-xs text-ink-soft">{f.suggestedDue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {report.maturitySignals.length > 0 && (
        <Card
          title="Maturity signals"
          subtitle="What this exercise revealed, mapped to your maturity domains; use these as evidence when you next update the self-assessment"
          className="print-page"
        >
          <ul className="flex flex-col gap-2">
            {report.maturitySignals.map((m, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0 rounded-full bg-s0 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                  {domainName(m.domainId)}
                </span>
                <span className="text-ink-soft">{m.observation}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </article>
  );
}
