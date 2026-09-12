import { randomUUID } from 'crypto';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { statements, transactions, parseIssues } from '../db/schema';
import type { ImportStatementInput } from '../validation/statement-schemas';

export interface ImportResult {
  statementId: string;
  importedCount: number;
  duplicateCount: number;
}

/**
 * Stores a parsed statement for a user.
 *
 * Transactions already present for this user — matched on receipt number and
 * type, the same key as the unique index — are skipped rather than failing the
 * import. Re-uploading an overlapping statement is a normal thing for someone
 * to do, not an error.
 *
 * Everything is written in one database transaction: a partial statement in
 * the database would corrupt the balance walk and every total derived from it.
 */
export async function importStatement(
  userId: string,
  input: ImportStatementInput
): Promise<ImportResult> {
  return db.transaction(async tx => {
    const incomingKeys = input.transactions.map(
      transaction => `${transaction.receiptNo}:${transaction.type}`
    );

    const existing = await tx
      .select({ receiptNo: transactions.receiptNo, type: transactions.type })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(
            transactions.receiptNo,
            input.transactions.map(transaction => transaction.receiptNo)
          )
        )
      );

    const existingKeys = new Set(existing.map(row => `${row.receiptNo}:${row.type}`));

    const toInsert = input.transactions.filter(
      (transaction, index) => !existingKeys.has(incomingKeys[index])
    );

    const statementId = randomUUID();

    await tx.insert(statements).values({
      id: statementId,
      userId,
      fileName: input.fileName,
      periodStart: input.meta.periodStart,
      periodEnd: input.meta.periodEnd,
      openingBalance: input.meta.openingBalance,
      closingBalance: input.meta.closingBalance,
      balanceVerified: input.meta.balanceVerified,
      rowCount: input.transactions.length,
      parserVersion: input.meta.parserVersion
    });

    if (toInsert.length > 0) {
      await tx.insert(transactions).values(
        toInsert.map(transaction => ({
          id: randomUUID(),
          userId,
          statementId,
          receiptNo: transaction.receiptNo,
          completedAt: new Date(transaction.completedAt),
          detailsRaw: transaction.detailsRaw,
          type: transaction.type,
          direction: transaction.direction,
          amount: transaction.amount,
          balanceAfter: transaction.balanceAfter,
          isRevenue: transaction.isRevenue,
          counterpartyName: transaction.counterpartyName,
          counterpartyPhone: transaction.counterpartyPhone,
          chargeForReceipt: transaction.chargeForReceipt,
          reversesReceipt: transaction.reversesReceipt,
          confidence: transaction.confidence,
          sourcePage: transaction.sourcePage
        }))
      );
    }

    if (input.issues.length > 0) {
      await tx.insert(parseIssues).values(
        input.issues.map(issue => ({
          id: randomUUID(),
          statementId,
          type: issue.type,
          page: issue.page,
          rawText: issue.rawText,
          detail: issue.detail
        }))
      );
    }

    return {
      statementId,
      importedCount: toInsert.length,
      duplicateCount: input.transactions.length - toInsert.length
    };
  });
}