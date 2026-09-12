import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/client';
import { statements, transactions, parseIssues } from '../db/schema';

/**
 * Every query here takes userId and filters on it. That scoping is what keeps
 * one user's data invisible to another — omitting it even once is the bug that
 * matters most in this file.
 */

export async function listStatementsForUser(userId: string) {
  return db
    .select()
    .from(statements)
    .where(eq(statements.userId, userId))
    .orderBy(desc(statements.importedAt));
}

export async function findStatementForUser(userId: string, statementId: string) {
  const rows = await db
    .select()
    .from(statements)
    .where(and(eq(statements.userId, userId), eq(statements.id, statementId)))
    .limit(1);

  return rows[0] ?? null;
}

export async function listTransactionsForStatement(userId: string, statementId: string) {
  return db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), eq(transactions.statementId, statementId))
    )
    .orderBy(transactions.completedAt);
}

export async function listIssuesForStatement(userId: string, statementId: string) {
  const statement = await findStatementForUser(userId, statementId);
  if (statement === null) {
    return [];
  }

  return db.select().from(parseIssues).where(eq(parseIssues.statementId, statementId));
}

export async function listAllTransactionsForUser(userId: string) {
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(transactions.completedAt);
}

export async function deleteStatementForUser(userId: string, statementId: string) {
  await db
    .delete(statements)
    .where(and(eq(statements.userId, userId), eq(statements.id, statementId)));
}