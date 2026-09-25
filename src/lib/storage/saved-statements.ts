import type { ParseResult, Transaction } from '@/lib/parser/types';
import type { SavedStatement, StoredTransaction } from './types';
import { keyTransactions, findNewTransactions } from './find-new-transactions';
import {
  readAllStatements,
  readAllTransactions,
  writeStatementWithTransactions,
  writeTransaction,
  deleteStatementRecord,
  deleteTransactionRecord,
  deleteEverything
} from './statement-database';

export interface SaveResult {
  statementId: string;
  savedCount: number;
  duplicateCount: number;
}

export async function listSavedStatements(): Promise<SavedStatement[]> {
  const statements = await readAllStatements();

  // Newest first, which is the order the list is read in.
  return statements.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/**
 * Every saved transaction, oldest first, across all statements.
 *
 * A StoredTransaction is a Transaction plus `key` and `statementIds`, so the
 * rows are returned as they are. Callers see the Transaction fields they asked
 * for; the two extra ones are ignored rather than copied away.
 */
export async function loadAllTransactions(): Promise<Transaction[]> {
  const stored = await readAllTransactions();

  return stored.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

/**
 * The receipt numbers of saved transactions that could be a charge's parent.
 *
 * Charges are left out: a charge carries its parent's receipt number, so
 * including them would let a charge match itself and appear linked when its
 * parent was never saved.
 */
export async function loadParentReceiptNumbers(): Promise<Set<string>> {
  const stored = await readAllTransactions();

  return new Set(
    stored
      .filter(transaction => transaction.type !== 'charge')
      .map(transaction => transaction.receiptNo)
  );
}

/**
 * Saves a parsed statement on this device.
 *
 * Rows already saved are not written again. They do record the new statement's
 * id, so that deleting either statement later keeps the rows the other one
 * still covers.
 */
export async function saveStatement(
  result: ParseResult,
  fileName: string
): Promise<SaveResult> {
  const statementId = crypto.randomUUID();
  const existing = await readAllTransactions();
  const existingByKey = new Map(existing.map(row => [row.key, row]));

  const keyedTransactions = keyTransactions(result.transactions);
  const newTransactions = findNewTransactions(
    result.transactions,
    new Set(existingByKey.keys())
  );

  const statement: SavedStatement = {
    id: statementId,
    fileName,
    periodStart: result.meta.periodStart,
    periodEnd: result.meta.periodEnd,
    savedAt: new Date().toISOString(),
    transactionCount: result.transactions.length,
    openingBalance: result.meta.openingBalance,
    closingBalance: result.meta.closingBalance,
    balanceVerified: result.meta.balanceVerified,
    parserVersion: result.meta.parserVersion,
    issues: result.issues
  };

  const toWrite: StoredTransaction[] = newTransactions.map(({ transaction, key }) => ({
    ...transaction,
    key,
    statementIds: [statementId]
  }));

  await writeStatementWithTransactions(statement, toWrite);

  // Rows this statement shares with one already saved: record that this
  // statement contains them too.
  for (const { key } of keyedTransactions) {
    const alreadySaved = existingByKey.get(key);

    if (alreadySaved !== undefined && !alreadySaved.statementIds.includes(statementId)) {
      await writeTransaction({
        ...alreadySaved,
        statementIds: [...alreadySaved.statementIds, statementId]
      });
    }
  }

  return {
    statementId,
    savedCount: toWrite.length,
    duplicateCount: result.transactions.length - toWrite.length
  };
}

/**
 * Deletes one statement and the rows that belonged only to it.
 *
 * A row shared with another saved statement keeps that other statement's id and
 * stays, so deleting one statement never leaves the other one incomplete.
 */
export async function deleteStatement(statementId: string): Promise<void> {
  const stored = await readAllTransactions();

  for (const transaction of stored) {
    if (!transaction.statementIds.includes(statementId)) {
      continue;
    }

    const remaining = transaction.statementIds.filter(id => id !== statementId);

    if (remaining.length === 0) {
      await deleteTransactionRecord(transaction.key);
    } else {
      await writeTransaction({ ...transaction, statementIds: remaining });
    }
  }

  await deleteStatementRecord(statementId);
}

export async function deleteAllSavedData(): Promise<void> {
  await deleteEverything();
}
