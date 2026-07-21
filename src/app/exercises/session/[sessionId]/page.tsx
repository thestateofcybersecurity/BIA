import { notFound } from 'next/navigation';
import { loadWorkspace } from '@/lib/actions';
import { aiEnabled } from '@/lib/ai/client';
import { PageHeader, StatusPill } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { PrintButton } from '@/components/print-button';
import { SessionRunner } from './session-runner';
import { AarView } from './aar-view';

export const dynamic = 'force-dynamic';
// After-action report generation can take a couple of minutes.
export const maxDuration = 300;

export default async function ExerciseSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const ws = await loadWorkspace();
  const session = ws.exercises.find((e) => e.id === sessionId);
  if (!session) notFound();

  return (
    <>
      <PageHeader
        kicker={`Step 08 · Live session · ${session.mode === 'ai' ? 'Claude-tailored' : 'Template'}`}
        title={session.scenario.title}
        intro={session.scenario.objective}
        actions={
          session.report ? <PrintButton label="Print after-action report" /> : undefined
        }
      />

      {session.status === 'completed' && (
        <div className="no-print mb-4">
          <StatusPill tone="ok">Exercise completed</StatusPill>
        </div>
      )}

      {!session.report && (
        <HelpBox title="Running the session">
          <ul>
            <li>
              Work phase by phase: read the narrative, drop injects, and{' '}
              <strong>record the room's answer to every discussion question</strong> before
              advancing. Progress saves whenever you move between phases or hit Save.
            </li>
            <li>
              Use the <strong>notes panel</strong> for what you observe rather than what is said:
              who hesitated, what took too long, which document nobody could find. Notes carry
              real weight in the after-action report.
            </li>
            <li>
              After the last phase, <strong>Complete exercise</strong> locks the responses and
              unlocks report generation. The report judges the answers against your own BIA data,
              and unanswered questions are treated as findings, so blank boxes are honest but not
              free.
            </li>
          </ul>
        </HelpBox>
      )}

      {session.report ? (
        <AarView session={session} />
      ) : (
        <SessionRunner session={session} aiEnabled={aiEnabled()} />
      )}
    </>
  );
}
