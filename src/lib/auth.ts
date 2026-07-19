import { cookies } from 'next/headers';
import { authEnabled, getStackServerApp } from '@/lib/stack';

/**
 * Identity seam. With Neon Auth configured (see src/lib/stack.ts) every
 * request resolves to the signed-in user's id, redirecting to sign-in when
 * absent. Without it the app runs in single-workspace demo mode. Every
 * layer beneath this scopes all data by the returned id.
 */
export async function getUserId(): Promise<string> {
  if (authEnabled()) {
    const user = await getStackServerApp().getUser({ or: 'redirect' });
    return user.id;
  }
  // cookies() keeps demo mode dynamic (never statically cached).
  cookies();
  return process.env.BIA_WORKSPACE_ID || 'default';
}
