import type { RawRow, Transaction, ParseIssue } from './types';
import { parseStatementRow } from './parse-statement-row';
import { orderTransactionsChronologically } from './order-transactions-chronologically';
import { linkChargesToParentTransactions } from './link-charges-to-parent-transactions';
import { verifyBalance } from './verify-balance';

export interface StatementRowsParseResult {
  transactions: Transaction[];
  issues: ParseIssue[];
  isBalanceVerified: boolean;
}

/**
 * Turns raw statement rows into verified transactions.
 *
 * Pipeline:
 *   1. parse each row on its own          (bad rows become issues, not crashes)
 *   2. put rows in true chronological order
 *   3. link each charge to its parent
 *   4. walk the running balance
 *
 * Expects rows in the order they appeared on the statement (newest first).
 * Returns transactions oldest first.
 */
export function parseStatementRows(
  statementOrderRows: RawRow[],
  openingBalanceInCents: number
): StatementRowsParseResult {
  const issues: ParseIssue[] = [];
  const parsedTransactions: Transaction[] = [];

  for (const row of statementOrderRows) {
    const outcome = parseStatementRow(row);

    if (outcome.ok) {
      parsedTransactions.push(outcome.transaction);
    } else {
      issues.push({
        type: 'unparsed_row',
        page: row.page,
        rawText: row.details,
        detail: outcome.reason
      });
    }
  }

  const ordering = orderTransactionsChronologically(parsedTransactions);
  issues.push(...ordering.issues);

  const linking = linkChargesToParentTransactions(ordering.transactions);
  issues.push(...linking.issues);

  const verification = verifyBalance(linking.transactions, openingBalanceInCents);
  issues.push(...verification.issues);

  return {
    transactions: linking.transactions,
    issues,
    isBalanceVerified: verification.isVerified
  };
}