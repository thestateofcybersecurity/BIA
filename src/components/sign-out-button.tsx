'use client';

import { authClient } from '@/lib/auth-client';

export function SignOutButton() {
  return (
    <button
      className="font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:text-accent"
      onClick={async () => {
        try {
          await authClient.signOut();
        } catch (e) {
          console.error(e);
        }
        window.location.href = '/auth/sign-in';
      }}
    >
      Sign out
    </button>
  );
}
