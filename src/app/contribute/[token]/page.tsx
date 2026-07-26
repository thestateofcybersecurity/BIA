import { getStore } from '@/lib/data/store';
import { verifyContributionToken } from '@/lib/contribution/token';
import { DEPENDENCY_CLASSES, DEPENDENCY_LABELS } from '@/lib/domain/constants';
import { ContributeForm } from './contribute-form';

export const dynamic = 'force-dynamic';

/**
 * Public, token-scoped page. It deliberately renders only the single process
 * the link was issued for: no navigation into the workspace, no other
 * process, no gap register, no financial profile beyond the severity bands
 * needed to answer the questions.
 */

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
        Business impact assessment
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-4 text-sm leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

export default async function ContributePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const verified = verifyContributionToken(decodeURIComponent(token));

  if (!verified.ok) {
    return (
      <Shell title="This link is not valid">
        <p>
          {verified.reason === 'expired'
            ? 'This link has expired. Ask the continuity coordinator who sent it to issue a new one.'
            : 'This link could not be verified. Check that you copied the whole address, or ask the continuity coordinator who sent it to issue a new one.'}
        </p>
      </Shell>
    );
  }

  const { userId, processId, requestId } = verified.claims;
  const ws = await getStore().load(userId);
  const request = ws.collectionRequests.find((r) => r.id === requestId);
  const process = ws.processes.find((p) => p.id === processId);

  if (!request || !process || request.processId !== processId) {
    return (
      <Shell title="This request no longer exists">
        <p>
          The process this link refers to may have been removed. Ask the continuity coordinator
          who sent it to confirm.
        </p>
      </Shell>
    );
  }

  if (request.status === 'revoked') {
    return (
      <Shell title="This link has been withdrawn">
        <p>
          The continuity coordinator withdrew or replaced this request. If you still need to
          submit an assessment, ask them for a fresh link.
        </p>
      </Shell>
    );
  }

  const assessment = ws.assessments.find((a) => a.processId === processId) ?? null;
  const dependencies = DEPENDENCY_CLASSES.filter(
    (c) => process.dependencies[c].length > 0
  ).map((c) => ({ label: DEPENDENCY_LABELS[c], items: process.dependencies[c] }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="border-b-2 border-ink pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
          {ws.org?.name ?? 'Business continuity'} · impact assessment
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          {process.name}
        </h1>
        {process.description && (
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">{process.description}</p>
        )}
        <p className="mt-3 font-mono text-[11px] text-ink-muted">
          Requested of {request.ownerName || request.email}
          {request.status === 'submitted' ? ' · already submitted, edits still accepted' : ''}
        </p>
      </header>

      <div className="mt-6 rounded-md border border-line bg-paper/60 p-5">
        <h2 className="font-display text-lg font-semibold">What you are being asked</h2>
        <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-ink-soft">
          <p>
            One question, five times over: how bad would it be if this process stopped
            completely for 4 hours, then 24 hours, 3 days, 1 week, and 1 month? Estimate the
            cumulative financial loss at each point, then rate the operational, customer, legal,
            and safety impact using the described levels.
          </p>
          <p>
            Answer for a full stop with no workaround available unless the workaround is genuinely
            rehearsed. Impact never shrinks as an outage continues, so each rating carries forward
            automatically; you can only raise it at later points.
          </p>
          <p>
            Your answers derive how quickly the organization commits to recovering this process,
            so an honest estimate matters more than a precise one. Submitting a complete
            assessment records your sign-off as the process owner.
          </p>
        </div>
        {dependencies.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              Recorded dependencies for this process
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-xs text-ink-soft">
              {dependencies.map((d) => (
                <li key={d.label}>
                  <span className="text-ink-muted">{d.label}:</span> {d.items.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6">
        <ContributeForm
          token={decodeURIComponent(token)}
          process={process}
          initial={assessment}
          org={ws.org}
        />
      </div>

      <footer className="mt-10 border-t border-line pt-4">
        <p className="font-mono text-[10px] text-ink-faint">
          This link is personal to you and covers only this process. It expires 30 days after it
          was issued.
        </p>
      </footer>
    </div>
  );
}
