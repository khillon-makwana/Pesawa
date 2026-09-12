import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { loginSchema } from '@/server/validation/auth-schemas';
import { verifyPassword, burnTimeToPreventUserEnumeration } from '@/server/auth/password';
import { createSession } from '@/server/auth/session';
import { setSessionCookie } from '@/server/auth/session-cookie';
import {
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts
} from '@/server/auth/login-rate-limit';

export const runtime = 'nodejs';

/** The same message whether the email is unknown or the password is wrong. */
const GENERIC_FAILURE = 'Email or password is incorrect';

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_FAILURE }, { status: 400 });
  }

  const { email, password } = parsed.data;

  if (isRateLimited(email)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a few minutes.' },
      { status: 429 }
    );
  }

  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = rows[0];

  if (user === undefined) {
    // Spend the same time as a real verification so response timing does not
    // reveal whether this email is registered.
    await burnTimeToPreventUserEnumeration();
    recordFailedAttempt(email);
    return NextResponse.json({ error: GENERIC_FAILURE }, { status: 401 });
  }

  const passwordMatches = await verifyPassword(user.passwordHash, password);

  if (!passwordMatches) {
    recordFailedAttempt(email);
    return NextResponse.json({ error: GENERIC_FAILURE }, { status: 401 });
  }

  clearFailedAttempts(email);

  const { token, expiresAt } = await createSession(user.id, request.headers.get('user-agent'));
  await setSessionCookie(token, expiresAt);

  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}