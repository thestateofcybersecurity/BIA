import { loadWorkspace } from '@/lib/actions';
import { PageHeader } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { ProcessForm } from '../process-form';

export const dynamic = 'force-dynamic';

export default async function NewProcessPage() {
  const ws = await loadWorkspace();
  return (
    <>
      <PageHeader kicker="Step 02" title="New process" />
      <HelpBox title="Filling this in well">
        <ul>
          <li>
            Name the <strong>business activity</strong>, not the system that supports it; systems
            belong under Applications in the dependencies.
          </li>
          <li>
            The owner should be the person you would drag into an impact assessment workshop, and
            who can answer "how long can this be down?".
          </li>
          <li>
            Dependency spelling matters: the app counts how often each item appears across
            processes to find concentrations, so reuse exact names (press Enter after each item).
          </li>
          <li>
            Peak periods sharpen tabletop exercises; "renewal season" turns a generic outage into
            a worst-moment outage.
          </li>
        </ul>
      </HelpBox>
      <ProcessForm
        initial={null}
        allProcesses={ws.processes.map((p) => ({ id: p.id, name: p.name }))}
      />
    </>
  );
}
