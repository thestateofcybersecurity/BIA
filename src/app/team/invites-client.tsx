'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { inviteMember, revokeOrgInvitation, type InvitationView } from '@/lib/org-actions';
import { ORG_ROLES, ROLE_LABELS, ROLE_RANK, type OrgRole } from '@/lib/domain/authz';
import { Card, btn, StatusPill } from '@/components/ui';
import { formatDate } from '@/lib/format';

const STATUS_TONE: Record<InvitationView['status'], 'ok' | 'warn' | 'neutral' | 'bad'> = {
  pending: 'warn',
  accepted: 'ok',
  revoked: 'neutral',
  expired: 'neutral',
};

export function InvitesClient({
  invitations,
  myRole,
  canManage,
}: {
  invitations: InvitationView[];
  myRole: OrgRole;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('viewer');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const grantable = ORG_ROLES.filter((r) => ROLE_RANK[r] <= ROLE_RANK[myRole]);
  const visible = invitations.filter((i) => i.status !== 'accepted');

  return (
    <Card
      title="Invitations"
      subtitle="For people outside your joining domains, such as an external auditor or a client contact"
    >
      {message && (
        <p className={`mb-3 text-sm ${message.ok ? 'text-ok' : 'text-bad'}`}>{message.text}</p>
      )}

      {canManage && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex min-w-[220px] flex-1 flex-col gap-1">
            <label htmlFor="invite-email">Email address</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="auditor@example.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as OrgRole)}
            >
              {grantable.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={btn.secondary}
            disabled={pending || email.trim() === ''}
            onClick={() =>
              start(async () => {
                const result = await inviteMember(email, role);
                if (result.ok) {
                  setMessage({ text: `Invitation sent to ${email.trim()}.`, ok: true });
                  setLink(result.link ?? null);
                  setEmail('');
                  router.refresh();
                } else {
                  setMessage({ text: result.message, ok: false });
                  setLink(null);
                }
              })
            }
          >
            {pending ? 'Sending…' : 'Send invitation'}
          </button>
        </div>
      )}

      {link && (
        <div className="mb-4 flex items-center gap-2">
          <input readOnly value={link} className="min-w-0 flex-1 !py-1 font-mono text-[10px]" />
          <button
            type="button"
            className={btn.small}
            onClick={() => {
              navigator.clipboard?.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-ink-muted">No outstanding invitations.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {['Invited', 'Role', 'Status', 'Expires', ''].map((h, i) => (
                  <th
                    key={i}
                    className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr key={i.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 pr-4">{i.email}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{ROLE_LABELS[i.role]}</td>
                  <td className="py-2.5 pr-4">
                    <StatusPill tone={STATUS_TONE[i.status]}>{i.status}</StatusPill>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-ink-muted">
                    {formatDate(i.expiresAt)}
                  </td>
                  <td className="py-2.5">
                    {canManage && i.status === 'pending' && (
                      <button
                        type="button"
                        className="text-xs text-ink-faint hover:text-bad"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await revokeOrgInvitation(i.id);
                            setMessage({ text: 'Invitation revoked.', ok: true });
                            router.refresh();
                          })
                        }
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        An invitation is tied to the address it was sent to, so forwarding it grants nothing: the
        recipient has to sign in with that address to accept. Invitations expire after fourteen
        days and can be revoked before they are used.
      </p>
    </Card>
  );
}
