import { notFound } from 'next/navigation';
import { loadWorkspace } from '@/lib/actions';
import { PageHeader } from '@/components/ui';
import { HelpBox } from '@/components/help';
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
      <HelpBox title="Rating tips">
        <ul>
          <li>
            <strong>Think cumulatively:</strong> the 1 week cell means "the process has been fully
            down for a week", so its financial figure includes everything already lost at 24 hours
            and 3 days. The form auto-adjusts neighboring cells to keep values non-decreasing.
          </li>
          <li>
            <strong>Rate by the anchors, not the number.</strong> Click a category name to see its
            level descriptions; pick the described condition that matches, and reserve 4 for
            genuinely intolerable ("threatens viability, safety, or license to operate"), because
            severity 4 is what sets the MTPD.
          </li>
          <li>
            The <strong>derived panel updates live</strong>, so the room can immediately see how a
            rating moves the MTPD and tier; disagreement about a cell usually means disagreement
            about the anchor, which is the useful conversation.
          </li>
          <li>
            Use the <strong>MTPD override</strong> only when the derived value is demonstrably
            wrong, and record why; overrides are flagged in the BC plan report with their
            justification.
          </li>
        </ul>
      </HelpBox>
      <AssessmentForm process={process} initial={assessment} org={ws.org} />
    </>
  );
}
