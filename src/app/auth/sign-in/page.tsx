import { redirect } from 'next/navigation';
import { authEnabled, getAuth } from '@/lib/neon-auth';
import { SignInForm } from './sign-in-form';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  if (!authEnabled()) redirect('/');
  const { data: session } = await getAuth().getSession();
  if (session?.user) redirect('/');

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <p className="mb-1 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          Welcome
        </p>
        <h1 className="text-center font-display text-3xl font-semibold tracking-tight">
          Sign in to BIA
        </h1>
        <p className="mt-2 text-center text-sm text-ink-soft">
          Each account gets its own isolated assessment workspace.
        </p>
        <div className="mt-6 rounded-lg border border-line bg-surface p-6 shadow-card">
          <SignInForm />
        </div>
      </div>
    </div>
  );
}
