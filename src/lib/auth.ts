import { cookies } from 'next/headers';

/**
 * Identity seam. Without an identity provider configured the app runs in
 * single-workspace demo mode. To go multi-user, wire an auth library here
 * (for example @auth0/nextjs-auth0) and return the session subject; every
 * other layer already scopes all data by this id. See README.
 */
export async function getUserId(): Promise<string> {
  // Placeholder for a real session lookup; cookies() keeps this dynamic.
  cookies();
  return process.env.BIA_WORKSPACE_ID || 'default';
}
