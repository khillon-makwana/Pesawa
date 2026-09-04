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
 * Safaricom applies a transaction and its charge together, then prints the
 * balance after both on BOTH rows. Adjacent rows sharing a receipt number and
 * an identical balance are therefore one settlement event, and only the
 * group's combined effect can be verified against that shared figure.
 */
function groupIntoSettlementEvents(transactions: Transaction[]): Transaction[][] {
  const events: Transaction[][] = [];

  for (const transaction of transactions) {
    const currentEvent = events[events.length - 1];
    const belongsToCurrent =
      currentEvent !== undefined &&
      currentEvent[0].receiptNo === transaction.receiptNo &&
      currentEvent[0].balanceAfter === transaction.balanceAfter;

    if (belongsToCurrent) {
      currentEvent.push(transaction);
    } else {
      events.push([transaction]);
    }
  }

  return events;
}

/**
 * Walks the running balance across the whole statement.
 *
 * Each settlement event's printed balance must equal the previous balance plus
 * the combined effect of every row in that event. A break means a row was
 * dropped, misread, or misclassified as in/out — the strongest correctness
 * check available, because Safaricom supplies the answer.
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

  for (const event of groupIntoSettlementEvents(orderedTransactions)) {
    const combinedDelta = event.reduce((total, tx) => total + balanceDelta(tx), 0);
    const printedBalance = event[0].balanceAfter;
    const expectedBalance = runningBalance + combinedDelta;

    if (expectedBalance !== printedBalance) {
      const discrepancy = printedBalance - expectedBalance;
      const rowCount = event.length > 1 ? ` (${event.length} rows settled together)` : '';

      issues.push({
        type: 'balance_break',
        page: event[0].sourcePage,
        rawText: event[0].detailsRaw,
        detail:
          `Balance break at receipt ${event[0].receiptNo}${rowCount}: ` +
          `expected ${formatCentsForMessage(expectedBalance)}, ` +
          `statement shows ${formatCentsForMessage(printedBalance)} ` +
          `(off by ${formatCentsForMessage(discrepancy)})`
      });
    }

    // Resync to the statement's figure so one bad event produces one issue
    // rather than cascading through everything after it.
    runningBalance = printedBalance;
  }

  return { isVerified: issues.length === 0, issues };
}