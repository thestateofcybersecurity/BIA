import { notFound } from 'next/navigation';
import { loadWorkspace } from '@/lib/actions';
import { PageHeader } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { WorkflowEditor } from './workflow-editor';
import { ResourceProfileEditor } from './resource-profile';

export const dynamic = 'force-dynamic';

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ processId: string }>;
}) {
  const { processId } = await params;
  const ws = await loadWorkspace();
  const process = ws.processes.find((p) => p.id === processId);
  if (!process) notFound();

  const workflow = ws.workflows.find((w) => w.processId === process.id) ?? null;
  const objectives = ws.objectives.find((o) => o.processId === process.id) ?? null;
  const resourceProfile =
    ws.resourceProfiles.find((r) => r.processId === process.id) ?? null;

  return (
    <>
      <PageHeader
        kicker="Step 05 · Recovery workflow"
        title={process.name}
        intro="Steps run in order. Give each a responsible team, duration, and the dependencies it needs; alternates cover for unavailable staff."
      />
      <HelpBox title="Estimating step durations">
        <ul>
          <li>
            Estimate each step as the time from "go" to "verifiably done", including waiting on
            vendors and approvals; optimistic estimates are how a plan passes on paper and fails
            in an exercise.
          </li>
          <li>
            The running total is compared against the RTO target above; if it exceeds the RTO,
            either shorten the critical path or treat it as a gap on the Objectives &amp; gaps
            page.
          </li>
          <li>
            Reorder with the arrows so the sequence reflects real dependencies: what must finish
            before the next step can start.
          </li>
        </ul>
      </HelpBox>
      <ResourceProfileEditor processId={process.id} initial={resourceProfile} />
      <WorkflowEditor
        processId={process.id}
        initial={workflow}
        rtoTargetHours={objectives?.rtoTargetHours ?? null}
      />
    </>
  );
}
