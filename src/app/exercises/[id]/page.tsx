import { notFound } from 'next/navigation';
import { loadWorkspace } from '@/lib/actions';
import { generateScenario } from '@/lib/domain/scenarios';
import { MATURITY_DOMAINS } from '@/lib/domain/maturity';
import { aiEnabled } from '@/lib/ai/client';
import { PageHeader, Card } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { PrintButton } from '@/components/print-button';
import { ExerciseLauncher } from './launcher';

export const dynamic = 'force-dynamic';
// Claude generation can take a couple of minutes at high effort.
export const maxDuration = 300;

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await loadWorkspace();
  const scenario = generateScenario(ws, id);
  if (!scenario) notFound();

  const domainName = (id: string) =>
    MATURITY_DOMAINS.find((d) => d.id === id)?.name ?? id;

  return (
    <>
      <PageHeader
        kicker={`Step 07 · ${scenario.category} · ${scenario.duration}`}
        title={scenario.title}
        intro={scenario.objective}
        actions={<PrintButton label="Print exercise pack" />}
      />

      <HelpBox title="Facilitating this exercise">
        <ul>
          <li>
            Read each phase's <strong>narrative</strong> aloud, let discussion run, then drop the{' '}
            <strong>injects</strong> when the room gets comfortable; their job is to break the
            plan people are converging on.
          </li>
          <li>
            The <strong>discussion questions</strong> are the record: in a live session each one
            gets the room's actual answer written down, and an unanswered question is itself a
            finding.
          </li>
          <li>
            Keep the <strong>expected actions</strong> to yourself until the debrief; they
            describe what a good response includes, not a script participants should see.
          </li>
          <li>
            Aim for the stated duration with a hard stop; a tabletop that overruns loses the
            executives whose decisions it exists to test.
          </li>
        </ul>
      </HelpBox>

      <div className="no-print">
        <ExerciseLauncher scenarioId={id} aiEnabled={aiEnabled()} />
      </div>

      {scenario.contextNotes.length > 0 && (
        <Card
          title="Exercise context"
          subtitle="Drawn from this workspace's live assessment data"
          className="mb-6 print-page"
        >
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-soft">
            {scenario.contextNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Evaluates maturity domains: {scenario.evaluates.map(domainName).join(' · ')}
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-6">
        {scenario.phases.map((phase) => (
          <Card key={phase.title} className="print-page">
            <h2 className="font-display text-xl font-semibold">{phase.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{phase.narrative}</p>

            {phase.injects.length > 0 && (
              <div className="mt-4 rounded-md border border-accent/30 bg-accent-soft/50 p-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-accent">
                  Facilitator injects
                </p>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-soft">
                  {phase.injects.map((inj, i) => (
                    <li key={i}>{inj}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
                  Discussion questions
                </p>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-soft">
                  {phase.discussion.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
                  Expected actions
                </p>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-soft">
                  {phase.expectedActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
