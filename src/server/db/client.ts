import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

/**
 * postgres.js opens a connection pool. In development Next.js reloads modules
 * on every change, which would leak a new pool each time — so the client is
 * cached on globalThis there.
 */
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const pgClient = globalForDb.pgClient ?? postgres(connectionString);

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgClient = pgClient;
}

export const db = drizzle(pgClient, { schema });