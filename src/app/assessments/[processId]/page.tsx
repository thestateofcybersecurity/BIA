import { notFound } from 'next/navigation';
import { loadWorkspace } from '@/lib/actions';
import { PageHeader } from '@/components/ui';
import { AssessmentForm } from './assessment-form';

export const dynamic = 'force-dynamic';

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ processId: string }>;
}) {
  const { processId } = await params;
  const ws = await loadWorkspace();
  const process = ws.processes.find((p) => p.id === processId);
  if (!process) notFound();

  const assessment = ws.assessments.find((a) => a.processId === process.id) ?? null;

  return (
    <>
      <PageHeader
        kicker="Step 03 · Impact assessment"
        title={process.name}
        intro="For each horizon, imagine the process has been fully down for that long. Enter cumulative financial loss and pick the described condition that best matches each category. Ratings never decrease over time."
      />
      <AssessmentForm process={process} initial={assessment} org={ws.org} />
    </>
  );
}
