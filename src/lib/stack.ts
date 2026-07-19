import { StackServerApp } from '@stackframe/stack';

/**
 * Neon Auth (Stack) integration. Enabled when the Neon Auth env vars are
 * present (provisioned by the Neon <-> Vercel integration); otherwise the
 * app runs in single-workspace demo mode.
 */

export function authEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_STACK_PROJECT_ID &&
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY &&
      process.env.STACK_SECRET_SERVER_KEY
  );
}

declare global {
  // eslint-disable-next-line no-var
  var _biaStackApp: StackServerApp<true> | undefined;
}

export function getStackServerApp(): StackServerApp<true> {
  if (!globalThis._biaStackApp) {
    globalThis._biaStackApp = new StackServerApp({
      tokenStore: 'nextjs-cookie',
      urls: {
        afterSignIn: '/',
        afterSignUp: '/',
        afterSignOut: '/',
      },
    });
  }
  return globalThis._biaStackApp;
}
