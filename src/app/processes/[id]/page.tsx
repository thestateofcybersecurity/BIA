import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadWorkspace } from '@/lib/actions';
import { PageHeader, btn } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { ProcessForm } from '../process-form';

export const dynamic = 'force-dynamic';

export default async function EditProcessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await loadWorkspace();
  const process = ws.processes.find((p) => p.id === id);
  if (!process) notFound();

  return (
    <>
      <PageHeader
        kicker="Step 02"
        title={process.name}
        actions={
          <Link href={`/assessments/${process.id}`} className={btn.secondary}>
            Impact assessment →
          </Link>
        }
      />
      <HelpBox title="Editing safely">
        <ul>
          <li>
            Renaming or re-owning a process leaves its assessment, objectives, and workflows
            attached; they key on the process, not its name.
          </li>
          <li>
            Deleting removes the process <strong>and everything attached to it</strong>
            (assessment, objectives, gaps, workflow) and unlinks it from other processes'
            upstream lists.
          </li>
          <li>
            Keep dependency names consistent with other processes so concentration analysis
            (which supplier or system appears everywhere) stays accurate.
          </li>
        </ul>
      </HelpBox>
      <ProcessForm
        initial={process}
        allProcesses={ws.processes.map((p) => ({ id: p.id, name: p.name }))}
      />
    </>
  );
}
