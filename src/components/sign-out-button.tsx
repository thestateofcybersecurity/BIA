'use client';

import { authClient } from '@/lib/auth-client';

export function SignOutButton() {
  return (
    <button
      className="font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-accent"
      onClick={async () => {
        await authClient.signOut();
        window.location.href = '/auth/sign-in';
      }}
    >
      Sign out
    </button>
  );
}
