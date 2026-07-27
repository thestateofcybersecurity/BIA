'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { switchOrganization, type OrgOption } from '@/lib/org-actions';
import { ROLE_LABELS } from '@/lib/domain/authz';

/**
 * Active organization picker. Only rendered when someone belongs to more
 * than one, which is the consultant case: one login across several client
 * workspaces. The switch is a server action so the cookie is set httpOnly
 * and membership is verified before it takes effect.
 */
export function OrgSwitcher({ options }: { options: OrgOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const active = options.find((o) => o.active) ?? options[0];

  if (options.length <= 1) {
    return active ? (
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-ink-soft" title={active.name}>
          {active.name}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          {ROLE_LABELS[active.role]}
        </p>
      </div>
    ) : null;
  }

  return (
    <div className="min-w-0">
      <label
        htmlFor="org-switcher"
        className="block font-mono text-[10px] uppercase tracking-wider text-ink-faint"
      >
        Organization
      </label>
      <select
        id="org-switcher"
        className="mt-1 w-full !py-1 text-xs"
        value={active?.id ?? ''}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          setError(null);
          start(async () => {
            const result = await switchOrganization(next);
            if (!result.ok) setError(result.message);
            else router.refresh();
          });
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        {pending ? 'Switching…' : ROLE_LABELS[active.role]}
      </p>
      {error && <p className="mt-1 text-[10px] text-bad">{error}</p>}
    </div>
  );
}
