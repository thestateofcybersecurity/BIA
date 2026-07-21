import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { deriveAll } from '@/lib/domain/scoring';
import { PageHeader, EmptyState, btn } from '@/components/ui';
import { HelpBox } from '@/components/help';
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
      <HelpBox title="RTO, RPO, MBCO, and how gaps are rated">
        <ul>
          <li>
            <strong>RTO</strong> (Recovery Time Objective) is how fast the process must be
            restored; it must sit below the MTPD, ideally with a 20% buffer, and the form
            validates this. <strong>RPO</strong> (Recovery Point Objective) is the tolerable data
            loss window. <strong>MBCO</strong> is the minimum acceptable service level while
            recovering.
          </li>
          <li>
            For each, record the <strong>target</strong> (what the business needs) and the{' '}
            <strong>achievable</strong> (what current capability honestly delivers). Any shortfall
            appears in the gap register automatically.
          </li>
          <li>
            <strong>Gap severity:</strong> an RTO gap is high when achievable recovery lands
            beyond the MTPD (restored after the disruption became intolerable), medium inside the
            buffer zone. RPO gaps rate on shortfall size: high at 3x the target or more.
          </li>
          <li>
            Give every gap an owner and a remediation action; "risk accepted" is a legitimate
            status, but it should be a decision, not a default. Closing a gap means improving the
            achievable value, then re-entering it here.
          </li>
        </ul>
      </HelpBox>
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
