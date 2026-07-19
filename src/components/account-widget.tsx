import Link from 'next/link';
import { authEnabled, getStackServerApp } from '@/lib/stack';

/** Server component rendered into the sidebar footer. */
export async function AccountWidget() {
  if (!authEnabled()) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        Demo workspace · no sign-in
      </p>
    );
  }

  const user = await getStackServerApp().getUser();
  if (!user) {
    return (
      <Link
        href="/handler/sign-in"
        className="font-mono text-[10px] uppercase tracking-wider text-accent hover:underline"
      >
        Sign in →
      </Link>
    );
  }

  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-ink-soft" title={user.primaryEmail ?? undefined}>
        {user.displayName || user.primaryEmail}
      </p>
      <div className="mt-1 flex gap-3 font-mono text-[10px] uppercase tracking-wider">
        <Link href="/handler/account-settings" className="text-ink-muted hover:text-accent">
          Account
        </Link>
        <Link href="/handler/sign-out" className="text-ink-muted hover:text-accent">
          Sign out
        </Link>
      </div>
    </div>
  );
}
