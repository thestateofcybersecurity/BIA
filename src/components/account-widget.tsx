import Link from 'next/link';
import { connection } from 'next/server';
import { authEnabled, getAuth } from '@/lib/neon-auth';
import { SignOutButton } from '@/components/sign-out-button';
import { OrgSwitcher } from '@/components/org-switcher';
import { listSwitchableOrgs } from '@/lib/org-actions';
import { tenancyEnabled } from '@/lib/data/tenancy';

/** Server component rendered into the sidebar footer. */
export async function AccountWidget() {
  if (!authEnabled()) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        Demo workspace · no sign-in
      </p>
    );
  }

  // Bail out of static prerendering (the /_not-found build pass) before
  // getSession reads cookies, which would throw inside Neon Auth and spam
  // the build log with a cookie validation error.
  await connection();
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

  const orgs = tenancyEnabled() ? await listSwitchableOrgs() : [];

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {orgs.length > 0 && <OrgSwitcher options={orgs} />}
      <div className="min-w-0 border-t border-line/60 pt-2">
        <p className="truncate text-xs text-ink-soft" title={session.user.email ?? undefined}>
          {session.user.name || session.user.email}
        </p>
        <div className="mt-1">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
