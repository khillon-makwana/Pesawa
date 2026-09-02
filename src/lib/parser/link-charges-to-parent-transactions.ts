import type { Transaction, ParseIssue } from './types';

export interface ChargeLinkingResult {
  transactions: Transaction[];
  issues: ParseIssue[];
}

/**
 * Fills in `chargeForReceipt` on charge rows.
 *
 * On real statements a charge shares its parent's receipt number and appears
 * directly after it once rows are in chronological order. So the parent is
 * simply the previous row with the same receipt number and a different type.
 *
 * Expects chronologically ordered input.
 */
export function linkChargesToParentTransactions(
  orderedTransactions: Transaction[]
): ChargeLinkingResult {
  const issues: ParseIssue[] = [];

  const transactions = orderedTransactions.map((transaction, index) => {
    if (transaction.type !== 'charge') {
      return transaction;
    }

    const previous = orderedTransactions[index - 1];
    const hasParent =
      previous !== undefined &&
      previous.receiptNo === transaction.receiptNo &&
      previous.type !== 'charge';

    if (!hasParent) {
      issues.push({
        type: 'unparsed_row',
        page: transaction.sourcePage,
        rawText: transaction.detailsRaw,
        detail: `Charge ${transaction.receiptNo} has no parent transaction before it`
      });
      return transaction;
    }

    return { ...transaction, chargeForReceipt: previous.receiptNo };
  });

  return { transactions, issues };
}