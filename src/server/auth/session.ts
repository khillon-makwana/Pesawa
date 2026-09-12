import { randomBytes, createHash, randomUUID } from 'crypto';
import { eq, lt } from 'drizzle-orm';
import { db } from '../db/client';
import { sessions, users } from '../db/schema';

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
/** Renew a session when it has less than this left, so active users stay in. */
const SESSION_RENEWAL_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 15;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * The token goes to the browser; its hash goes in the database. Compromising
 * the database therefore does not let anyone forge a session.
 */
function generateSessionToken(): { token: string; id: string } {
  const token = randomBytes(32).toString('base64url');
  const id = createHash('sha256').update(token).digest('hex');
  return { token, id };
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Starts a new session, replacing any existing ones for this user.
 *
 * Replacing rather than adding is a session fixation guard: if an attacker
 * somehow planted a session before login, it stops working the moment the real
 * user signs in. The cost is that logging in on a new device signs you out
 * elsewhere, which is acceptable for this app.
 */
export async function createSession(
  userId: string,
  userAgent: string | null
): Promise<{ token: string; expiresAt: Date }> {
  await db.delete(sessions).where(eq(sessions.userId, userId));

  const { token, id } = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({ id, userId, expiresAt, userAgent });

  return { token, expiresAt };
}

/**
 * Looks up the user behind a session token, or null if it is unknown or
 * expired. Expired sessions are deleted on sight rather than left to
 * accumulate.
 */
export async function findUserBySessionToken(
  token: string
): Promise<AuthenticatedUser | null> {
  const sessionId = hashSessionToken(token);

  const rows = await db
    .select({
      sessionExpiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      name: users.name
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = rows[0];
  if (row === undefined) {
    return null;
  }

  if (row.sessionExpiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  const remainingMs = row.sessionExpiresAt.getTime() - Date.now();
  if (remainingMs < SESSION_RENEWAL_THRESHOLD_MS) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_DURATION_MS) })
      .where(eq(sessions.id, sessionId));
  }

  return { id: row.userId, email: row.email, name: row.name };
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
}

/** Housekeeping — safe to call periodically, not required for correctness. */
export async function deleteExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export function generateUserId(): string {
  return randomUUID();
}