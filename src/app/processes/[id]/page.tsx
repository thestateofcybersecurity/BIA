import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadWorkspace } from '@/lib/actions';
import { PageHeader, btn } from '@/components/ui';
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
      <ProcessForm
        initial={process}
        allProcesses={ws.processes.map((p) => ({ id: p.id, name: p.name }))}
      />
    </>
  );
}
