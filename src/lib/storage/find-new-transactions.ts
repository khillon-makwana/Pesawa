import type { Transaction } from '@/lib/parser/types';

export interface KeyedTransaction {
  transaction: Transaction;
  key: string;
}

/**
 * Gives every row in a statement the key that decides whether it is already
 * saved. Keys are `receiptNo:type:amount:occurrence`.
 *
 * Receipt number alone is not enough: a charge shares its parent's receipt
 * number, so keying on that would treat every charge as a duplicate of the
 * transaction it belongs to.
 *
 * Type is not enough either. Two fee rows against one receipt both classify as
 * `charge` — "Customer Transfer of Funds Charge" and "Pay Bill Charge" are
 * separate patterns with the same type — and the balance walk already allows
 * more than two rows to settle together.
 *
 * Amount is still not enough, because those two charges can be for the same
 * tariff. So rows that match on all three are numbered in the order they appear:
 * the first gets `:1`, the second `:2`. Two identical charges are therefore two
 * rows rather than one, and no real money goes missing from the balance walk.
 *
 * Numbering by position is what makes re-importing safe. A statement always
 * lists its rows in the same order, so reading it twice produces the same keys
 * and the second read adds nothing.
 */
export function keyTransactions(transactions: Transaction[]): KeyedTransaction[] {
  const occurrencesSoFar = new Map<string, number>();

  return transactions.map(transaction => {
    const withoutOccurrence = `${transaction.receiptNo}:${transaction.type}:${transaction.amount}`;
    const occurrence = (occurrencesSoFar.get(withoutOccurrence) ?? 0) + 1;

    occurrencesSoFar.set(withoutOccurrence, occurrence);

    return { transaction, key: `${withoutOccurrence}:${occurrence}` };
  });
}

export interface SplitBySaved {
  /** Rows not in storage yet. */
  newRows: KeyedTransaction[];
  /** Rows an earlier statement already saved. */
  alreadySaved: KeyedTransaction[];
}

/**
 * Sorts a statement's rows into those already saved and those not.
 *
 * Re-uploading a statement that overlaps one already saved is a normal thing to
 * do, so the rows they share are reported rather than treated as an error — the
 * caller records that this statement contains them too.
 */
export function splitBySaved(
  incoming: Transaction[],
  existingKeys: Set<string>
): SplitBySaved {
  const newRows: KeyedTransaction[] = [];
  const alreadySaved: KeyedTransaction[] = [];

  for (const row of keyTransactions(incoming)) {
    if (existingKeys.has(row.key)) {
      alreadySaved.push(row);
    } else {
      newRows.push(row);
    }
  }

  return { newRows, alreadySaved };
}

/** The rows that are not already saved. */
export function findNewTransactions(
  incoming: Transaction[],
  existingKeys: Set<string>
): KeyedTransaction[] {
  return splitBySaved(incoming, existingKeys).newRows;
}
