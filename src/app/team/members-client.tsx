'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateMemberRole, removeOrgMember, type MemberView } from '@/lib/org-actions';
import {
  ORG_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_RANK,
  type OrgRole,
} from '@/lib/domain/authz';
import { Card, btn, StatusPill } from '@/components/ui';
import { formatDate } from '@/lib/format';

const TONE: Record<OrgRole, 'ok' | 'warn' | 'neutral' | 'bad'> = {
  owner: 'bad',
  admin: 'warn',
  coordinator: 'ok',
  contributor: 'neutral',
  viewer: 'neutral',
};

export function MembersClient({
  members,
  myRole,
  canManage,
}: {
  members: MemberView[];
  myRole: OrgRole;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  // An administrator cannot hand out a role above their own.
  const grantable = ORG_ROLES.filter((r) => ROLE_RANK[r] <= ROLE_RANK[myRole]);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const result = await fn();
      setMessage(
        result.ok
          ? { text: 'Saved.', ok: true }
          : { text: result.message ?? 'That did not work.', ok: false }
      );
      if (result.ok) router.refresh();
    });

  const awaitingAccess = members.filter((m) => m.role === 'viewer' && !m.isSelf);

  return (
    <div className="flex flex-col gap-6">
      {canManage && awaitingAccess.length > 0 && (
        <Card
          title="Waiting on access"
          subtitle={`${awaitingAccess.length} member${awaitingAccess.length === 1 ? '' : 's'} joined from your domain and hold the lowest role`}
        >
          <p className="text-sm leading-relaxed text-ink-soft">
            New joiners can read the analysis but not the risk register, the activation plan with
            its contact details, or the report export. Give them a role deliberately rather than by
            default.
          </p>
        </Card>
      )}

      <Card
        title="Members"
        subtitle={`${members.length} ${members.length === 1 ? 'person' : 'people'} in this organization`}
      >
        {message && (
          <p className={`mb-3 text-sm ${message.ok ? 'text-ok' : 'text-bad'}`}>{message.text}</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {['Person', 'Role', 'Joined', canManage ? '' : null]
                  .filter((h) => h !== null)
                  .map((h, i) => (
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
              {members.map((m) => (
                <tr key={m.userId} className="border-b border-line/60 align-top last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-medium">
                      {m.name || m.email || m.userId}
                      {m.isSelf && <span className="ml-2 text-xs text-ink-muted">(you)</span>}
                    </p>
                    {m.name && m.email && (
                      <p className="text-xs text-ink-muted">{m.email}</p>
                    )}
                    {m.scopedProcessIds.length > 0 && (
                      <p className="text-xs text-ink-muted">
                        Scoped to {m.scopedProcessIds.length} process
                        {m.scopedProcessIds.length === 1 ? '' : 'es'}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {canManage && !m.isSelf ? (
                      <select
                        aria-label={`Role for ${m.email || m.userId}`}
                        className="!py-1 text-xs"
                        value={m.role}
                        disabled={pending || (m.role === 'owner' && myRole !== 'owner')}
                        onChange={(e) =>
                          run(() => updateMemberRole(m.userId, e.target.value as OrgRole))
                        }
                      >
                        {grantable.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                        {!grantable.includes(m.role) && (
                          <option value={m.role}>{ROLE_LABELS[m.role]}</option>
                        )}
                      </select>
                    ) : (
                      <StatusPill tone={TONE[m.role]}>{ROLE_LABELS[m.role]}</StatusPill>
                    )}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-ink-muted">
                    {formatDate(m.joinedAt)}
                  </td>
                  {canManage && (
                    <td className="py-3">
                      {!m.isSelf &&
                        (confirming === m.userId ? (
                          <span className="flex items-center gap-2">
                            <button
                              type="button"
                              className={btn.small}
                              disabled={pending}
                              onClick={() => {
                                setConfirming(null);
                                run(() => removeOrgMember(m.userId));
                              }}
                            >
                              Confirm removal
                            </button>
                            <button
                              type="button"
                              className="text-xs text-ink-faint hover:text-ink"
                              onClick={() => setConfirming(null)}
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="text-xs text-ink-faint hover:text-bad"
                            onClick={() => setConfirming(m.userId)}
                          >
                            Remove
                          </button>
                        ))}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="What each role can do" subtitle="Roles are ranked; each includes the ones below">
        <ul className="flex flex-col gap-3">
          {ORG_ROLES.map((r) => (
            <li key={r} className="flex items-start gap-3 text-sm">
              <span className="w-40 shrink-0">
                <StatusPill tone={TONE[r]}>{ROLE_LABELS[r]}</StatusPill>
              </span>
              <span className="text-ink-soft">{ROLE_DESCRIPTIONS[r]}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
