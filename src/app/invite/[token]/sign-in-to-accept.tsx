'use client';

import { useTransition } from 'react';
import { rememberInviteAndSignIn } from '@/lib/invite-actions';
import { btn } from '@/components/ui';

/**
 * Carries the invitation across the sign-up round trip. Signing in loses the
 * current URL, so the token is stashed server-side first and consumed on the
 * first authenticated request.
 */
export function SignInToAccept({ token }: { token: string }) {
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        type="button"
        className={btn.primary}
        disabled={pending}
        onClick={() => start(async () => { await rememberInviteAndSignIn(token); })}
      >
        {pending ? 'One moment…' : 'Sign in or create an account to accept'}
      </button>
    </div>
  );
}
