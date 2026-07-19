import Link from 'next/link';
import { authEnabled, getAuth } from '@/lib/neon-auth';
import { SignOutButton } from '@/components/sign-out-button';

/** Server component rendered into the sidebar footer. */
export async function AccountWidget() {
  if (!authEnabled()) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        Demo workspace · no sign-in
      </p>
    );
  }

  const { data: session } = await getAuth().getSession();
  if (!session?.user) {
    return (
      <Link
        href="/auth/sign-in"
        className="font-mono text-[10px] uppercase tracking-wider text-accent hover:underline"
      >
        Sign in →
      </Link>
    );
  }

  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-ink-soft" title={session.user.email ?? undefined}>
        {session.user.name || session.user.email}
      </p>
      <div className="mt-1">
        <SignOutButton />
      </div>
    </div>
  );
}
