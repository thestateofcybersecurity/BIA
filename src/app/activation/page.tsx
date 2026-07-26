import { loadWorkspace } from '@/lib/actions';
import { deriveAll } from '@/lib/domain/scoring';
import { PageHeader, Card, TierBadge, StatusPill } from '@/components/ui';
import { HelpBox } from '@/components/help';
import { PlanForm } from './plan-form';

export const dynamic = 'force-dynamic';

export default async function ActivationPage() {
  const ws = await loadWorkspace();
  const derived = deriveAll(ws);

  // The contact directory the plan actually needs: owners of the processes
  // that have to be recovered first.
  const owners = ws.processes
    .map((p) => ({ p, tier: derived.get(p.id)?.tier ?? null }))
    .filter(({ p }) => p.owner.trim().length > 0)
    .sort((a, b) => (a.tier ?? 9) - (b.tier ?? 9) || a.p.name.localeCompare(b.p.name));

  const plan = ws.plan;
  const missing = [
    plan?.declarationAuthority ? null : 'declaration authority',
    plan && plan.triggers.length > 0 ? null : 'activation criteria',
    plan && plan.team.length > 0 ? null : 'response team roster',
    plan && plan.communications.length > 0 ? null : 'communications plan',
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader
        kicker="Step 08"
        title="Activation & communications"
        intro="The operational half of the plan. Everything before this step says how bad a disruption would be; this step says who declares one, who runs the response, and who gets told what. Without it the analysis cannot be executed at 2am."
      />

      <HelpBox title="What belongs here">
        <ul>
          <li>
            <strong>Activation criteria are observable, not subjective.</strong> &quot;Any Tier 1
            process down beyond 1 hour with no restoration estimate&quot; can be checked by an
            on-call engineer at 3am; &quot;a serious incident&quot; cannot. Your MTPD values are the
            natural source: the tolerance you documented is the threshold.
          </li>
          <li>
            <strong>Every role needs a deputy.</strong> A roster with one name per role fails the
            moment that person is on a plane, which is exactly the kind of coincidence real
            incidents involve.
          </li>
          <li>
            <strong>Communication timing should match obligations, not intentions.</strong> If a
            regulator expects notification within 72 hours of becoming aware, that clock belongs
            here alongside the owner who runs it.
          </li>
          <li>
            This section and the process owner directory below are printed into the BC plan report,
            so the generated document is usable during an incident rather than only in an audit.
          </li>
        </ul>
      </HelpBox>

      {missing.length > 0 && (
        <div className="mb-6">
          <Card title="Plan readiness" subtitle="Sections still to complete">
            <div className="flex flex-wrap items-center gap-2">
              {missing.map((m) => (
                <StatusPill key={m} tone="warn">
                  {m}
                </StatusPill>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <PlanForm initial={ws.plan} processes={ws.processes} />

        <Card
          title="Process owner directory"
          subtitle="Derived from the process inventory, most critical first"
        >
          {owners.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No process owners recorded yet. Add an owner on each process and the directory builds
              itself.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    {['Process', 'Tier', 'Owner', 'Email', 'Phone'].map((h) => (
                      <th
                        key={h}
                        className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {owners.map(({ p, tier }) => (
                    <tr key={p.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{p.name}</td>
                      <td className="py-2.5 pr-4">
                        <TierBadge tier={tier} />
                      </td>
                      <td className="py-2.5 pr-4">{p.owner}</td>
                      <td className="py-2.5 pr-4 text-xs text-ink-soft">
                        {p.ownerEmail || <span className="text-ink-faint">not recorded</span>}
                      </td>
                      <td className="py-2.5 text-xs text-ink-soft">
                        {p.ownerPhone || <span className="text-ink-faint">not recorded</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
