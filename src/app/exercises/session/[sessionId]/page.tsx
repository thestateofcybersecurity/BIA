import { notFound } from 'next/navigation';
import { loadWorkspace } from '@/lib/actions';
import { aiEnabled } from '@/lib/ai/client';
import { PageHeader, StatusPill } from '@/components/ui';
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
        kicker={`Step 07 · Live session · ${session.mode === 'ai' ? 'Claude-tailored' : 'Template'}`}
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

      {session.report ? (
        <AarView session={session} />
      ) : (
        <SessionRunner session={session} aiEnabled={aiEnabled()} />
      )}
    </>
  );
}
