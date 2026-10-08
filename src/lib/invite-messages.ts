/**
 * Copy shared by the invitation page and the accept action. Lives outside
 * the 'use server' module because that file may only export async functions.
 */

/** Shown wherever an unverified account tries to act on an invitation. */
export const VERIFY_FIRST_MESSAGE =
  'Verify your email address first. Open the verification email sent when you created the account, then come back to this invitation.';
