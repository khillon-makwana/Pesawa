'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { INPUT, LABEL, PRIMARY_BUTTON } from '@/components/ui/form-styles';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const body = await response.json();
        setErrorMessage(body.error ?? 'Something went wrong');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setErrorMessage('Could not reach the server');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You only need an account to save statements.
      </p>

      <div className="mt-6 space-y-4 rounded-lg border bg-card p-6">
        <div>
          <label htmlFor="email" className={LABEL}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="password" className={LABEL}>
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') void handleSubmit();
            }}
            autoComplete="current-password"
            className={INPUT}
          />
        </div>

        {errorMessage !== null && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full ${PRIMARY_BUTTON}`}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/register" className="underline">
          Create one
        </Link>
      </p>
    </div>
  );
}