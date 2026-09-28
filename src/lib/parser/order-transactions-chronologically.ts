import type { Transaction, ParseIssue, IssueCode } from './types';

export interface OrderingResult {
  transactions: Transaction[];
  issues: ParseIssue[];
}

/**
 * Groups larger than this are left in statement order.
 *
 * `possibleOrderings` writes out every arrangement by hand, so raising this
 * limit means adding the arrangements for the new size there too.
 */
const MAX_GROUP_SIZE_TO_REORDER = 3;

/** How a transaction moves the balance: +amount for money in, −amount for out. */
function balanceDelta(transaction: Transaction): number {
  return transaction.direction === 'in' ? transaction.amount : -transaction.amount;
}

/**
 * True when every row in the group prints the same balance, which is what
 * Safaricom does when they settled together.
 */
function settledTogether(group: Transaction[]): boolean {
  return group.every(transaction => transaction.balanceAfter === group[0].balanceAfter);
}

/**
 * True when each row's balance follows from the one before it — or when the
 * rows settled together, in which case only the group total can be checked.
 */
function isBalanceChainValid(group: Transaction[]): boolean {
  if (settledTogether(group)) {
    return true;
  }

  for (let index = 1; index < group.length; index += 1) {
    const expected = group[index - 1].balanceAfter + balanceDelta(group[index]);
    if (expected !== group[index].balanceAfter) {
      return false;
    }
  }

  return true;
}

/**
 * Every order the rows of a group could have been printed in.
 *
 * Written out rather than generated, because a group is only ever two or three
 * rows and the arrangements are easier to read than the recursion that would
 * produce them. The guard below keeps the two facts in step.
 */
function possibleOrderings(group: Transaction[]): Transaction[][] {
  const [first, second, third] = group;

  if (group.length === 2) {
    return [
      [first, second],
      [second, first]
    ];
  }

  if (group.length === 3) {
    return [
      [first, second, third],
      [first, third, second],
      [second, first, third],
      [second, third, first],
      [third, first, second],
      [third, second, first]
    ];
  }

  throw new Error(
    `possibleOrderings handles groups of 2 or 3, got ${group.length}. ` +
      `Add the arrangements for that size if MAX_GROUP_SIZE_TO_REORDER changed.`
  );
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

function balanceBreak(group: Transaction[], code: IssueCode, detail: string): ParseIssue {
  return {
    type: 'balance_break',
    page: group[0].sourcePage,
    rawText: null,
    detail,
    code,
    receiptNo: group[0].receiptNo,
    rowCount: group.length
  };
}

/**
 * Picks the order for one group of rows sharing a receipt number, and reports
 * anything that could not be settled. Returns the rows in the chosen order.
 */
function orderOneGroup(group: Transaction[], issues: ParseIssue[]): Transaction[] {
  if (group.length === 1) {
    return group;
  }

  if (group.length > MAX_GROUP_SIZE_TO_REORDER) {
    issues.push(
      balanceBreak(
        group,
        'group_too_large',
        `Receipt ${group[0].receiptNo} has ${group.length} rows; left in statement order`
      )
    );
    return group;
  }

  const validOrderings = possibleOrderings(group).filter(isBalanceChainValid);

  if (validOrderings.length === 1) {
    return validOrderings[0];
  }

  if (validOrderings.length === 0) {
    issues.push(
      balanceBreak(
        group,
        'no_consistent_order',
        `No ordering of receipt ${group[0].receiptNo} produces a consistent balance`
      )
    );
    return group;
  }

  // More than one ordering works. Rows that settled together share a printed
  // balance, so every ordering is arithmetically valid — the statement does not
  // say which came first, and it does not matter. Anything else is ambiguous
  // enough to report.
  if (!settledTogether(group)) {
    issues.push(
      balanceBreak(
        group,
        'ambiguous_order',
        `Receipt ${group[0].receiptNo} has ${validOrderings.length} possible orderings`
      )
    );
  }

  return group;
}

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
    ordered.push(...orderOneGroup(group, issues));
  }

  return { transactions: ordered, issues };
}
