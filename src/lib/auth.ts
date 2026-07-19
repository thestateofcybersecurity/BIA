import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authEnabled, getAuth } from '@/lib/neon-auth';

/**
 * Identity seam. With Neon Auth configured (see src/lib/neon-auth.ts) every
 * data access resolves to the signed-in user's id, redirecting to sign-in
 * when absent. Without it the app runs in single-workspace demo mode. Every
 * layer beneath this scopes all data by the returned id.
 */
export async function getUserId(): Promise<string> {
  if (authEnabled()) {
    const { data: session } = await getAuth().getSession();
    if (!session?.user) redirect('/auth/sign-in');
    return session.user.id;
  }
  // cookies() keeps demo mode dynamic (never statically cached).
  cookies();
  return process.env.BIA_WORKSPACE_ID || 'default';
}
