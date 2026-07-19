import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { deriveAll } from '@/lib/domain/scoring';
import { PageHeader, EmptyState, btn } from '@/components/ui';
import { GapsClient } from './gaps-client';

export const dynamic = 'force-dynamic';

export default async function GapsPage() {
  const ws = await loadWorkspace();
  const derived = deriveAll(ws);

  return (
    <>
      <PageHeader
        kicker="Step 04"
        title="Recovery objectives & gaps"
        intro="Set what the business needs (target RTO, RPO, minimum service level) and what current capability can deliver. Every shortfall lands in the gap register with an owner and remediation status; the register is what drives investment decisions."
      />
      {ws.processes.length === 0 ? (
        <EmptyState
          title="No processes yet"
          body="Recovery objectives attach to business processes. Add processes and complete their impact assessments first, so RTO targets can be validated against MTPD."
        >
          <Link href="/processes/new" className={btn.primary}>
            Add a process
          </Link>
        </EmptyState>
      ) : (
        <GapsClient
          processes={ws.processes.map((p) => ({
            id: p.id,
            name: p.name,
            mtpd: derived.get(p.id)?.mtpd ?? null,
            tier: derived.get(p.id)?.tier ?? null,
          }))}
          objectives={ws.objectives}
          remediations={ws.remediations}
        />
      )}
    </>
  );
}
