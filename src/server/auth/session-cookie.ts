import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'pesawa_session';

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    /** JavaScript cannot read it, so an XSS bug cannot steal the session. */
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    /** Blocks the cookie on cross-site POSTs — basic CSRF protection. */
    sameSite: 'lax',
    path: '/',
    expires: expiresAt
  });
}

export async function readSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}