'use client';

import { createAuthClient } from '@neondatabase/auth/next';

/** Talks to our same-origin /api/auth proxy (see src/app/api/auth). */
export const authClient = createAuthClient();
