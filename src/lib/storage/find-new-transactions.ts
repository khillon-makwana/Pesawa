import type { Transaction } from '@/lib/parser/types';

/**
 * Builds the key that decides whether two rows are the same transaction.
 *
 * Receipt number alone is not enough: a charge shares its parent's receipt
 * number, so keying on that would treat every charge as a duplicate of the
 * transaction it belongs to.
 *
 * Type alone is not enough either. Two fee rows against one receipt both
 * classify as `charge` — "Customer Transfer of Funds Charge" and "Pay Bill
 * Charge" are separate patterns with the same type — and the balance walk
 * already allows more than two rows to settle together. Dropping the second
 * one would silently unbalance the statement, so the amount is part of the key
 * as well.
 *
 * Two charges on one receipt for the same amount would still collide. That is
 * both very unlikely and impossible to tell apart from a genuine duplicate, so
 * treating it as one row is the right answer anyway.
 */
export function buildTransactionKey(transaction: Transaction): string {
  return `${transaction.receiptNo}:${transaction.type}:${transaction.amount}`;
}

/**
 * Returns the transactions that are not already saved.
 *
 * Re-uploading a statement that overlaps one already saved is a normal thing to
 * do, so the rows they share are skipped rather than treated as an error.
 */
export function findNewTransactions(
  incoming: Transaction[],
  existingKeys: Set<string>
): Transaction[] {
  const newTransactions: Transaction[] = [];
  const seenInThisBatch = new Set<string>();

  for (const transaction of incoming) {
    const key = buildTransactionKey(transaction);

    // A single statement can list the same row twice if it was parsed twice;
    // guard against that as well as against rows already in storage.
    if (existingKeys.has(key) || seenInThisBatch.has(key)) {
      continue;
    }

    seenInThisBatch.add(key);
    newTransactions.push(transaction);
  }

  return newTransactions;
}
