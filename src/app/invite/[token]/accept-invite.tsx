'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptOrgInvitation } from '@/lib/invite-actions';
import { btn } from '@/components/ui';

export function AcceptInvite({ token, orgName }: { token: string; orgName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <button
          type="button"
          className={btn.primary}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await acceptOrgInvitation(token);
              if (!result.ok) setError(result.message);
              else {
                router.push('/');
                router.refresh();
              }
            })
          }
        >
          {pending ? 'Joining…' : `Join ${orgName}`}
        </button>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
