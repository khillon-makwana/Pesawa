import type { Transaction, ParseIssue } from './types';

export interface BalanceVerificationResult {
  isVerified: boolean;
  issues: ParseIssue[];
}

function balanceDelta(transaction: Transaction): number {
  return transaction.direction === 'in' ? transaction.amount : -transaction.amount;
}

function formatCentsForMessage(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Walks the running balance across the whole statement.
 *
 * Every row prints the balance after it was applied, so each row's balance
 * must equal the previous row's balance plus that row's effect. A break means
 * a row was dropped, misread, or misclassified as in/out — this is the
 * strongest correctness check available, because Safaricom supplies the answer.
 *
 * Expects chronologically ordered transactions. `openingBalanceInCents` is the
 * balance before the first one.
 */
export function verifyBalance(
  orderedTransactions: Transaction[],
  openingBalanceInCents: number
): BalanceVerificationResult {
  const issues: ParseIssue[] = [];
  let runningBalance = openingBalanceInCents;

  for (const transaction of orderedTransactions) {
    const expectedBalance = runningBalance + balanceDelta(transaction);

    if (expectedBalance !== transaction.balanceAfter) {
      const discrepancy = transaction.balanceAfter - expectedBalance;

      issues.push({
        type: 'balance_break',
        page: transaction.sourcePage,
        rawText: transaction.detailsRaw,
        detail:
          `Balance break at receipt ${transaction.receiptNo}: ` +
          `expected ${formatCentsForMessage(expectedBalance)}, ` +
          `statement shows ${formatCentsForMessage(transaction.balanceAfter)} ` +
          `(off by ${formatCentsForMessage(discrepancy)})`
      });
    }

    // Continue from what the statement says, not from what we calculated, so
    // one bad row produces one issue rather than cascading through the rest.
    runningBalance = transaction.balanceAfter;
  }

  return { isVerified: issues.length === 0, issues };
}