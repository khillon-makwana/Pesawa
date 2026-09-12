import { findUserBySessionToken, type AuthenticatedUser } from './session';
import { readSessionCookie } from './session-cookie';

/** Returns the signed-in user, or null. Use when a page works either way. */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const token = await readSessionCookie();
  if (token === null) {
    return null;
  }
  return findUserBySessionToken(token);
}

/**
 * Returns the signed-in user or throws. Every protected route handler starts
 * with this, and every query it makes must then be scoped to `user.id` —
 * forgetting that scope is the most common bug in hand-rolled auth.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (user === null) {
    throw new UnauthorizedError();
  }
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Not signed in');
    this.name = 'UnauthorizedError';
  }
}