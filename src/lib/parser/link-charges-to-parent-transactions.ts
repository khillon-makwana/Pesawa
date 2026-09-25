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
 * A charge in the first rows of a statement may have its parent in the previous
 * month's file. `hasParentInEarlierStatements` lets the caller answer that from
 * wherever it keeps old statements. It is a plain function taking a receipt
 * number, which is what keeps this file free of any storage import — and so
 * testable without one.
 *
 * Expects chronologically ordered input.
 */
export function linkChargesToParentTransactions(
  orderedTransactions: Transaction[],
  hasParentInEarlierStatements?: (receiptNo: string) => boolean
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
      // Not in this statement, so ask the caller about earlier ones. A charge
      // carries its parent's receipt number, so knowing the parent exists is
      // enough to link it — there is nothing else to look up.
      if (hasParentInEarlierStatements?.(transaction.receiptNo) === true) {
        return { ...transaction, chargeForReceipt: transaction.receiptNo };
      }

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