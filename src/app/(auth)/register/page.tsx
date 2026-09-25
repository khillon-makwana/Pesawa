'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || undefined })
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
      tagline="Only needed if you want to save statements. Everything else works without one."
      notes={[
        {
          label: 'Data sovereignty',
          detail: 'The statement and its password never leave this device.'
        },
        {
          label: 'Zero trackers',
          detail: 'No cookies beyond your session, no analytics, no ad tags.'
        }
      ]}
    >
      <p className="chip bg-muted text-muted-foreground">New account</p>
      <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight">
        Create an account
      </h1>
      <p className="mt-2 text-muted-foreground">
        Only needed if you want to save statements. Everything else works without one.
      </p>

      <div className="mt-8 space-y-5">
        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="name">Name</Label>
            <span className="eyebrow text-muted-foreground">Optional</span>
          </div>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={event => setName(event.target.value)}
            autoComplete="name"
            placeholder="e.g. Wanjiku Kimani"
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="email">Email address</Label>
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
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => setShowPassword(current => !current)}
              className="eyebrow cursor-pointer text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={event => setPassword(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') void handleSubmit();
            }}
            autoComplete="new-password"
            className="mt-2"
          />
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            At least 10 characters. Length matters more than symbols.
          </p>
        </div>

        <p className="flex gap-3 rounded-md bg-muted/60 p-4 text-sm text-muted-foreground">
          <LockGlyph />
          <span>
            Saving a statement stores its parsed transactions on our server so you can
            open them again. The PDF itself and its password are never sent anywhere.
          </span>
        </p>

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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>

      <p className="eyebrow mt-8 text-center text-muted-foreground">
        Client-side parsing · No cookies, no trackers
      </p>
    </AuthSplitLayout>
  );
}

function LockGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="mt-0.5 size-4 shrink-0 text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}
