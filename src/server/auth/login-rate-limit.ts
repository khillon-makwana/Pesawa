/**
 * Tracks failed login attempts so an attacker cannot try thousands of passwords
 * against one account.
 *
 * Stored in memory, which means it resets when the server restarts and is not
 * shared across instances. That is a real limitation — on Vercel each instance
 * has its own map, so the effective limit is higher than it looks. Adequate for
 * now; a production version would use Redis or a database table.
 */
interface AttemptRecord {
  failureCount: number;
  firstFailureAt: number;
}

const MAX_FAILURES = 5;
const WINDOW_MS = 1000 * 60 * 15;

const attemptsByKey = new Map<string, AttemptRecord>();

export function isRateLimited(key: string): boolean {
  const record = attemptsByKey.get(key);
  if (record === undefined) {
    return false;
  }

  if (Date.now() - record.firstFailureAt > WINDOW_MS) {
    attemptsByKey.delete(key);
    return false;
  }

  return record.failureCount >= MAX_FAILURES;
}

export function recordFailedAttempt(key: string): void {
  const record = attemptsByKey.get(key);

  if (record === undefined || Date.now() - record.firstFailureAt > WINDOW_MS) {
    attemptsByKey.set(key, { failureCount: 1, firstFailureAt: Date.now() });
    return;
  }

  record.failureCount += 1;
}

export function clearFailedAttempts(key: string): void {
  attemptsByKey.delete(key);
}