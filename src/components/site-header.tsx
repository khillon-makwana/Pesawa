'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SiteHeaderProps {
  userEmail: string | null;
}

export function SiteHeader({ userEmail }: SiteHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 32px',
        borderBottom: '1px solid #ddd',
        fontFamily: 'system-ui',
        fontSize: 14
      }}
    >
      <Link href="/" style={{ fontWeight: 600, textDecoration: 'none', color: 'inherit' }}>
        Pesawa
      </Link>

      {userEmail === null ? (
        <nav style={{ display: 'flex', gap: 16 }}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create account</Link>
        </nav>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/statements">Statements</Link>
          <span style={{ color: '#555' }}>{userEmail}</span>
          <button onClick={handleSignOut}>Sign out</button>
        </div>
      )}
    </header>
  );
}