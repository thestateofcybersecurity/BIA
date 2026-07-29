import Link from 'next/link';
import { lookupInvitation } from '@/lib/data/tenancy';
import { getAuthContextOptional } from '@/lib/auth';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/domain/authz';
import { btn } from '@/components/ui';
import { AcceptInvite } from './accept-invite';
import { SignInToAccept } from './sign-in-to-accept';

export const dynamic = 'force-dynamic';

/**
 * Public invitation landing page. It renders the organization name and the
 * offered role but nothing from the workspace itself, so a leaked link
 * reveals only that an invitation exists.
 */

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
        Business continuity workspace
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-ink-soft">
        {children}
      </div>
    </div>
  );
}

const FAILURES: Record<string, { title: string; body: string }> = {
  not_found: {
    title: 'This invitation is not valid',
    body: 'Check that you copied the whole address, or ask whoever invited you to send a fresh one.',
  },
  revoked: {
    title: 'This invitation was withdrawn',
    body: 'An administrator revoked it. Ask them for a new invitation if you still need access.',
  },
  expired: {
    title: 'This invitation has expired',
    body: 'Invitations last fourteen days. Ask whoever invited you to send another.',
  },
  accepted: {
    title: 'This invitation has already been used',
    body: 'If it was you, simply sign in. If it was not, tell the administrator who invited you.',
  },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const found = await lookupInvitation(decodeURIComponent(token));

  if (!found.ok) {
    const copy = FAILURES[found.reason] ?? FAILURES.not_found;
    return (
      <Shell title={copy.title}>
        <p>{copy.body}</p>
      </Shell>
    );
  }

  const ctx = await getAuthContextOptional();
  const invitedTo = found.organization.name;
  const roleLabel = ROLE_LABELS[found.invitation.role];

  if (!ctx) {
    return (
      <Shell title={`Join ${invitedTo}`}>
        <p>
          You have been invited to {invitedTo}&apos;s business continuity workspace as{' '}
          <strong className="text-ink">{roleLabel}</strong>.
        </p>
        <p className="text-ink-muted">{ROLE_DESCRIPTIONS[found.invitation.role]}</p>
        <p>
          Sign in with <strong className="text-ink">{found.invitation.email}</strong> to accept.
          The invitation is tied to that address, so signing in with a different one will not work.
          Once signed in, open this link again.
        </p>
        <SignInToAccept token={decodeURIComponent(token)} />
      </Shell>
    );
  }

  const emailMatches =
    ctx.email.trim().toLowerCase() === found.invitation.email.trim().toLowerCase();

  if (!emailMatches) {
    return (
      <Shell title="This invitation is for a different address">
        <p>
          It was issued to <strong className="text-ink">{found.invitation.email}</strong>, but you
          are signed in as <strong className="text-ink">{ctx.email}</strong>.
        </p>
        <p>
          Sign out and sign back in with the invited address, or ask for an invitation to the
          account you actually use.
        </p>
        <div>
          <Link href="/" className={btn.secondary}>
            Back to your workspace
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={`Join ${invitedTo}`}>
      <p>
        You have been invited to {invitedTo}&apos;s business continuity workspace as{' '}
        <strong className="text-ink">{roleLabel}</strong>.
      </p>
      <p className="text-ink-muted">{ROLE_DESCRIPTIONS[found.invitation.role]}</p>
      <AcceptInvite token={decodeURIComponent(token)} orgName={invitedTo} />
    </Shell>
  );
}
