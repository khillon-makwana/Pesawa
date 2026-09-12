import { NextResponse } from 'next/server';
import { deleteSession } from '@/server/auth/session';
import { readSessionCookie, clearSessionCookie } from '@/server/auth/session-cookie';

export const runtime = 'nodejs';

export async function POST() {
  const token = await readSessionCookie();

  if (token !== null) {
    // Deleting the row matters as much as clearing the cookie — otherwise the
    // session stays valid for anyone who captured the token.
    await deleteSession(token);
  }

  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}