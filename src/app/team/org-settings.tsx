'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  renameOrg,
  addOrgDomain,
  verifyOrgDomain,
  removeOrgDomain,
  type DomainView,
} from '@/lib/org-actions';
import { Card, btn, StatusPill } from '@/components/ui';
import { formatDate } from '@/lib/format';

/**
 * Organization identity: its name, and the domains whose people join it
 * automatically. Only owners see this; everyone else reads the summary above.
 */
export function OrgSettings({
  orgName,
  domains,
}: {
  orgName: string;
  domains: DomainView[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(orgName);
  const [newDomain, setNewDomain] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, okText = 'Saved.') =>
    start(async () => {
      const result = await fn();
      setMessage(
        result.ok ? { text: okText, ok: true } : { text: result.message ?? 'That did not work.', ok: false }
      );
      if (result.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <Card title="Organization name" subtitle="Shown across the app and on the BC plan report">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[240px] flex-1 flex-col gap-1">
            <label htmlFor="org-name">Name</label>
            <input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Insurance"
            />
          </div>
          <button
            type="button"
            className={btn.primary}
            disabled={pending || name.trim() === orgName}
            onClick={() => run(() => renameOrg(name))}
          >
            {pending ? 'Saving…' : 'Rename'}
          </button>
        </div>
      </Card>

      <Card
        title="Domains"
        subtitle="People with a verified email at an active domain join this organization automatically, at the lowest role"
      >
        {message && (
          <p className={`mb-3 text-sm ${message.ok ? 'text-ok' : 'text-bad'}`}>{message.text}</p>
        )}

        {domains.length === 0 ? (
          <p className="mb-4 text-sm text-ink-muted">
            No domains yet. Until one is added and verified, this workspace is private to the
            people already in it.
          </p>
        ) : (
          <div className="mb-4 flex flex-col gap-4">
            {domains.map((d) => (
              <div key={d.domain} className="rounded-md border border-line bg-paper/60 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">{d.domain}</span>
                  {d.status === 'active' ? (
                    <StatusPill tone="ok">
                      {d.verifiedAt ? `Verified ${formatDate(d.verifiedAt)}` : 'Active'}
                    </StatusPill>
                  ) : (
                    <StatusPill tone="warn">Awaiting DNS verification</StatusPill>
                  )}
                  <span className="ml-auto flex items-center gap-2">
                    {d.status === 'pending' && (
                      <button
                        type="button"
                        className={btn.small}
                        disabled={pending}
                        onClick={() =>
                          run(() => verifyOrgDomain(d.domain), 'Verified. This domain now admits members.')
                        }
                      >
                        {pending ? 'Checking…' : 'Check DNS now'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-xs text-ink-faint hover:text-bad"
                      disabled={pending}
                      onClick={() => run(() => removeOrgDomain(d.domain), 'Domain removed.')}
                    >
                      Remove
                    </button>
                  </span>
                </div>

                {d.status === 'pending' && d.recordHost && d.recordValue && (
                  <div className="mt-3 border-t border-line pt-3">
                    <p className="text-sm leading-relaxed text-ink-soft">
                      Publish this TXT record in your DNS, then check again. Until it resolves,
                      nobody joins through this domain, so a claim on its own grants nothing.
                    </p>
                    <div className="mt-2 flex flex-col gap-2">
                      {[
                        ['Type', 'TXT'],
                        ['Name / host', d.recordHost],
                        ['Value', d.recordValue],
                      ].map(([label, value]) => (
                        <div key={label} className="flex flex-wrap items-center gap-2">
                          <span className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                            {label}
                          </span>
                          <code className="min-w-0 flex-1 break-all rounded bg-s0 px-2 py-1 font-mono text-xs">
                            {value}
                          </code>
                          <button
                            type="button"
                            className={btn.small}
                            onClick={() => {
                              navigator.clipboard?.writeText(value);
                              setCopied(`${d.domain}:${label}`);
                            }}
                          >
                            {copied === `${d.domain}:${label}` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-ink-muted">
                      DNS changes usually publish within a few minutes, though some providers take
                      longer. The record can be deleted once verification succeeds.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <div className="flex min-w-[240px] flex-1 flex-col gap-1">
            <label htmlFor="new-domain">Add a domain</label>
            <input
              id="new-domain"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="acme.com"
            />
          </div>
          <button
            type="button"
            className={btn.secondary}
            disabled={pending || newDomain.trim() === ''}
            onClick={() =>
              run(async () => {
                const result = await addOrgDomain(newDomain);
                if (result.ok) setNewDomain('');
                return result;
              }, 'Added. Publish the TXT record below, then check DNS.')
            }
          >
            Add domain
          </button>
        </div>
      </Card>
    </div>
  );
}
