import { notFound } from 'next/navigation';
import { loadWorkspace } from '@/lib/actions';
import { PageHeader } from '@/components/ui';
import { WorkflowEditor } from './workflow-editor';

export const dynamic = 'force-dynamic';

export default async function WorkflowPage({
  params,
}: {
  params: { processId: string };
}) {
  const ws = await loadWorkspace();
  const process = ws.processes.find((p) => p.id === params.processId);
  if (!process) notFound();

  const workflow = ws.workflows.find((w) => w.processId === process.id) ?? null;
  const objectives = ws.objectives.find((o) => o.processId === process.id) ?? null;

  return (
    <>
      <PageHeader
        kicker="Step 05 · Recovery workflow"
        title={process.name}
        intro="Steps run in order. Give each a responsible team, duration, and the dependencies it needs; alternates cover for unavailable staff."
      />
      <WorkflowEditor
        processId={process.id}
        initial={workflow}
        rtoTargetHours={objectives?.rtoTargetHours ?? null}
      />
    </>
  );
}
