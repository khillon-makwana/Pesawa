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

    // A charge usually follows its parent, but Safaricom sometimes deducts a
    // paybill fee before the payment itself, putting the parent after. Check
    // the rows on both sides.
    const neighbours = [
      orderedTransactions[index - 1],
      orderedTransactions[index + 1]
    ];

    const parent = neighbours.find(
      neighbour =>
        neighbour !== undefined &&
        neighbour.receiptNo === transaction.receiptNo &&
        neighbour.type !== 'charge'
    );

    if (parent === undefined) {
      issues.push({
        type: 'unparsed_row',
        page: transaction.sourcePage,
        rawText: transaction.detailsRaw,
        detail: `Charge ${transaction.receiptNo}: linked transaction not found in this statement`
      });
      return transaction;
    }

    return { ...transaction, chargeForReceipt: parent.receiptNo };
  });

  return { transactions, issues };
}

/**
 * Fills in `chargeForReceipt` on charge rows.
 *
 * A charge shares its parent's receipt number and sits adjacent to it once
 * rows are chronologically ordered — usually after, but before it for some
 * paybill fees, so both sides are checked.
 *
 * A charge at the very start of a statement has its parent in the previous
 * month's file and cannot be linked here. Planned: accept an optional
 * `findParentInPreviousStatements` callback so the import service can resolve
 * these against already-stored transactions. The callback keeps this file free
 * of database imports, which is what makes it testable without one.
 *
 * Expects chronologically ordered input.
 */