import { loadWorkspace } from '@/lib/actions';
import { PageHeader } from '@/components/ui';
import { ProcessForm } from '../process-form';

export const dynamic = 'force-dynamic';

export default async function NewProcessPage() {
  const ws = await loadWorkspace();
  return (
    <>
      <PageHeader kicker="Step 02" title="New process" />
      <ProcessForm
        initial={null}
        allProcesses={ws.processes.map((p) => ({ id: p.id, name: p.name }))}
      />
    </>
  );
}
