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
        // Full reload so no server component keeps rendering the old session.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/auth/sign-in';
      }}
    >
      Sign out
    </button>
  );
}
