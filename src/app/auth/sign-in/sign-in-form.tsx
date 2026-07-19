'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { btn } from '@/components/ui';

export function SignInForm() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result =
        mode === 'sign-in'
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ name: name || email, email, password });
      if (result.error) {
        setError(result.error.message ?? 'Authentication failed.');
        setPending(false);
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('Could not reach the authentication service.');
      setPending(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      {mode === 'sign-up' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="auth-name">Name</label>
          <input
            id="auth-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
        />
      </div>

      {error && (
        <p className="rounded bg-bad/10 px-3 py-2 text-xs text-bad">{error}</p>
      )}

      <button type="submit" className={btn.primary} disabled={pending}>
        {pending ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
      </button>

      <button
        type="button"
        className="text-center text-xs text-accent hover:underline"
        onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
          setError(null);
        }}
      >
        {mode === 'sign-in'
          ? 'No account yet? Create one'
          : 'Already have an account? Sign in'}
      </button>
    </form>
  );
}
