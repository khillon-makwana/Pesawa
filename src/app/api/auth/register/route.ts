import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { registerSchema } from '@/server/validation/auth-schemas';
import { hashPassword } from '@/server/auth/password';
import { createSession, generateUserId } from '@/server/auth/session';
import { setSessionCookie } from '@/server/auth/session-cookie';

/** Argon2 and postgres.js both need Node APIs — this cannot run on the edge. */
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid details' },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'An account with that email already exists' },
      { status: 409 }
    );
  }

  const userId = generateUserId();

  await db.insert(users).values({
    id: userId,
    email,
    passwordHash: await hashPassword(password),
    name: name ?? null
  });

  const { token, expiresAt } = await createSession(
    userId,
    request.headers.get('user-agent')
  );
  await setSessionCookie(token, expiresAt);

  return NextResponse.json({ id: userId, email, name: name ?? null }, { status: 201 });
}