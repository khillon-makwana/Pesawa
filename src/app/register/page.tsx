'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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

      // refresh() re-runs server components so the layout picks up the session
      router.push('/');
      router.refresh();
    } catch {
      setErrorMessage('Could not reach the server');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ padding: 32, fontFamily: 'system-ui', maxWidth: 400 }}>
      <h1>Create an account</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          Name (optional)
          <input
            type="text"
            value={name}
            onChange={event => setName(event.target.value)}
            style={{ display: 'block', width: '100%' }}
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            style={{ display: 'block', width: '100%' }}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="new-password"
            style={{ display: 'block', width: '100%' }}
          />
          <span style={{ fontSize: 13, color: '#555' }}>At least 10 characters.</span>
        </label>

        {errorMessage !== null && <p style={{ color: '#b00' }}>{errorMessage}</p>}

        <button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </div>

      <p style={{ fontSize: 14, marginTop: 24 }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}