import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { deriveAll } from '@/lib/domain/scoring';
import { DEPENDENCY_CLASSES } from '@/lib/domain/constants';
import { PageHeader, EmptyState, btn } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { ProcessTable } from './process-table';

export const dynamic = 'force-dynamic';

export default async function ProcessesPage() {
  const ws = await loadWorkspace();
  const derived = deriveAll(ws);

  return (
    <>
      <PageHeader
        kicker="Step 02"
        title="Business processes"
        intro="Catalogue what the organization does and what each process depends on. Dependencies drive tabletop scenarios and recovery planning; tiers appear once impact assessments are complete."
        actions={
          <>
            <Link href="/processes/import" className={btn.secondary}>
              Import CSV
            </Link>
            <Link href="/processes/new" className={btn.primary}>
              Add process
            </Link>
          </>
        }
      />

      <HelpBox title="Building a good process inventory">
        <ul>
          <li>
            Catalogue <strong>business processes, not systems</strong>: &quot;Claims processing&quot;, not
            &quot;the claims server&quot;. Most organizations land on 8 to 20 processes; going finer than
            that makes the assessment workshops drag without sharpening the results.
          </li>
          <li>
            <strong>Dependencies are the connective tissue</strong> of the whole methodology: they
            power the concentration analysis in tabletop exercises (&quot;which supplier appears in the
            most processes?&quot;) and pre-fill recovery planning. Name them consistently; &quot;Fiserv&quot; and
            &quot;Fiserv payment gateway&quot; count as two different suppliers.
          </li>
          <li>
            <strong>Upstream links</strong> record that a process cannot run without another one,
            so a disruption in one place propagates realistically in exercises.
          </li>
          <li>
            Tiers appear in the last column once each process has a completed impact assessment;
            they are derived from MTPD, never assigned by hand.
          </li>
        </ul>
      </HelpBox>

      {ws.processes.length === 0 ? (
        <EmptyState
          title="No processes yet"
          body="Start with the handful of processes the business could not survive without: order intake, production, payroll, customer support."
        >
          <Link href="/processes/new" className={btn.primary}>
            Add your first process
          </Link>
        </EmptyState>
      ) : (
        <ProcessTable
          rows={ws.processes.map((p) => {
            const d = derived.get(p.id)!;
            return {
              id: p.id,
              name: p.name,
              description: p.description,
              owner: p.owner,
              department: p.department,
              dependencyCount: DEPENDENCY_CLASSES.reduce(
                (sum, c) => sum + p.dependencies[c].length,
                0
              ),
              tier: d.tier,
              priority: d.priority,
              assessment: d.assessmentComplete
                ? ('complete' as const)
                : ws.assessments.some((a) => a.processId === p.id)
                  ? ('in_progress' as const)
                  : ('not_started' as const),
            };
          })}
        />
      )}
    </>
  );
}
