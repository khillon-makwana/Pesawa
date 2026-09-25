'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';

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
    <AuthSplitLayout
      tagline="You only need an account to save statements."
      notes={[
        {
          label: 'Client-side parsing',
          detail: 'Statements are read in your browser. Nothing is uploaded.'
        },
        {
          label: 'Zero trackers',
          detail: 'No cookies beyond your session, no analytics, no ad tags.'
        }
      ]}
    >
      <p className="chip bg-muted text-muted-foreground">Saved statements</p>
      <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-muted-foreground">
        You only need an account to save statements.
      </p>

      <div className="mt-8 space-y-5">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') void handleSubmit();
            }}
            autoComplete="current-password"
            className="mt-2"
          />
        </div>

        {errorMessage !== null && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          size="lg"
          className="w-full"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </div>

      <p className="mt-8 rounded-md bg-muted/60 py-4 text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Create one
        </Link>
      </p>

      <p className="eyebrow mt-8 text-center text-muted-foreground">
        Client-side parsing · No cookies, no trackers
      </p>
    </AuthSplitLayout>
  );
}
