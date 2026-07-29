'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthContext, ACTIVE_ORG_COOKIE, INVITE_COOKIE } from '@/lib/auth';
import { acceptInvitation, recordAudit } from '@/lib/data/tenancy';
import { ROLE_LABELS } from '@/lib/domain/authz';

/**
 * Remember the invitation, then send the visitor to sign in. Creating an
 * account is a round trip that loses the URL, so without this the
 * invitation is orphaned: the new account resolves to a private workspace
 * of its own and the invitation sits pending. The cookie is short-lived and
 * grants nothing by itself, since acceptance still requires the signed-in
 * address to match the invited one.
 */
export async function rememberInviteAndSignIn(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(INVITE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 30,
  });
  redirect('/auth/sign-in');
}

/**
 * Accepting an invitation. Kept apart from the administration actions
 * because this is the one membership change a non-member is allowed to make,
 * and only for themselves: the address on the invitation must match the
 * signed-in account, so forwarding the link grants nothing.
 */
export async function acceptOrgInvitation(
  token: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getAuthContext();
  const result = await acceptInvitation(token, { userId: ctx.userId, email: ctx.email });

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      not_found: 'This invitation is not valid.',
      revoked: 'This invitation was withdrawn.',
      expired: 'This invitation has expired.',
      accepted: 'This invitation has already been used.',
      wrong_email: 'This invitation was issued to a different email address.',
    };
    return { ok: false, message: messages[result.reason] };
  }

  await recordAudit({
    orgId: result.orgId,
    actorUserId: ctx.userId,
    actorEmail: ctx.email,
    action: 'member:manage',
    summary: `${ctx.email} accepted an invitation and joined as ${ROLE_LABELS[result.role]}`,
  });

  // Land them in the organization they just joined rather than whichever one
  // they happened to be looking at.
  const jar = await cookies();
  jar.set(ACTIVE_ORG_COOKIE, result.orgId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}
