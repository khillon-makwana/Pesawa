import type { Transaction, ParseIssue } from './types';

export interface OrderingResult {
  transactions: Transaction[];
  issues: ParseIssue[];
}

/** How a transaction moves the balance: +amount for money in, −amount for out. */
function balanceDelta(transaction: Transaction): number {
  return transaction.direction === 'in' ? transaction.amount : -transaction.amount;
}

/**
 * True when each row's balance follows from the one before it — or when rows
 * share a printed balance, in which case they settled together and only the
 * group total can be checked.
 */
function isBalanceChainValid(group: Transaction[]): boolean {
  const allShareOneBalance = group.every(tx => tx.balanceAfter === group[0].balanceAfter);
  if (allShareOneBalance) {
    return true;
  }

  for (let i = 1; i < group.length; i += 1) {
    const expected = group[i - 1].balanceAfter + balanceDelta(group[i]);
    if (expected !== group[i].balanceAfter) {
      return false;
    }
  }
  return true;
}

/** Every ordering of a small array. Only ever called with 2 or 3 items. */
function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];

  return items.flatMap((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    return permutations(rest).map(permutation => [item, ...permutation]);
  });
}

/** Collect runs of adjacent rows sharing a receipt number. */
function groupAdjacentByReceiptNumber(transactions: Transaction[]): Transaction[][] {
  const groups: Transaction[][] = [];

  for (const transaction of transactions) {
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup[0].receiptNo === transaction.receiptNo) {
      currentGroup.push(transaction);
    } else {
      groups.push([transaction]);
    }
  }

  return groups;
}

/** Groups larger than this are left alone — permuting them is not worth it. */
const MAX_GROUP_SIZE_TO_REORDER = 3;

/**
 * Puts transactions into true chronological order.
 *
 * Statements print newest-first, so the list is reversed. Rows sharing a
 * receipt number and timestamp (a transaction and its charge) are printed in
 * an order that varies, so within each such group the ordering is chosen by
 * whichever arrangement makes the running balance add up.
 *
 * Expects rows in the order they appeared on the statement.
 */
export function orderTransactionsChronologically(
  statementOrderTransactions: Transaction[]
): OrderingResult {
  const issues: ParseIssue[] = [];
  const oldestFirst = [...statementOrderTransactions].reverse();
  const ordered: Transaction[] = [];

  for (const group of groupAdjacentByReceiptNumber(oldestFirst)) {
    if (group.length === 1) {
      ordered.push(group[0]);
      continue;
    }

    if (group.length > MAX_GROUP_SIZE_TO_REORDER) {
      issues.push({
        type: 'balance_break',
        page: group[0].sourcePage,
        rawText: null,
        detail: `Receipt ${group[0].receiptNo} has ${group.length} rows; left in statement order`
      });
      ordered.push(...group);
      continue;
    }

    const validOrderings = permutations(group).filter(isBalanceChainValid);

    if (validOrderings.length === 1) {
      ordered.push(...validOrderings[0]);
      continue;
    }

    if (validOrderings.length === 0) {
      issues.push({
        type: 'balance_break',
        page: group[0].sourcePage,
        rawText: null,
        detail: `No ordering of receipt ${group[0].receiptNo} produces a consistent balance`
      });
        } else {
      // Rows that settled together share one printed balance, so every
      // ordering is arithmetically valid. The statement genuinely does not say
      // which came first, and it does not matter — keep the printed order.
      const allShareOneBalance = group.every(tx => tx.balanceAfter === group[0].balanceAfter);

      if (!allShareOneBalance) {
        issues.push({
          type: 'balance_break',
          page: group[0].sourcePage,
          rawText: null,
          detail: `Receipt ${group[0].receiptNo} has ${validOrderings.length} possible orderings`
        });
      }
    }

    ordered.push(...group);
  }

  return { transactions: ordered, issues };
}