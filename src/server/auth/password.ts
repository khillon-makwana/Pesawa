import { hash, verify } from '@node-rs/argon2';

/**
 * OWASP-recommended Argon2id parameters. Tuned so hashing takes long enough to
 * make brute force expensive, without making login feel slow.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1
};

export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, ARGON2_OPTIONS);
}

export async function verifyPassword(
  storedHash: string,
  submittedPassword: string
): Promise<boolean> {
  try {
    return await verify(storedHash, submittedPassword, ARGON2_OPTIONS);
  } catch {
    // A malformed hash should fail closed, not throw into the route handler.
    return false;
  }
}

/**
 * Hashing a throwaway password so a login attempt for a non-existent user takes
 * the same time as one for a real user. Without this, response timing tells an
 * attacker which email addresses are registered.
 */
export async function burnTimeToPreventUserEnumeration(): Promise<void> {
  await hash('this-user-does-not-exist', ARGON2_OPTIONS);
}