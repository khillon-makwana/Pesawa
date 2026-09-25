import type { Transaction } from '@/lib/parser/types';
import type { StatementReportMeta } from './statement-report';

/**
 * Describes a set of transactions drawn from several statements as if it were
 * one statement, so the same report can render it.
 *
 * The opening balance is the first row's balance with its own effect undone,
 * the same reasoning the parser uses for a single file. `balanceVerified` means
 * every statement verified on its own — the walk is not re-run across files,
 * because statements can have gaps between them.
 *
 * Expects at least one transaction, oldest first.
 */
export function buildCombinedMeta(
  transactions: Transaction[],
  statements: { balanceVerified: boolean }[]
): StatementReportMeta {
  const first = transactions[0];
  const last = transactions[transactions.length - 1];
  const firstEffect = first.direction === 'in' ? first.amount : -first.amount;

  return {
    periodStart: first.completedAt,
    periodEnd: last.completedAt,
    openingBalance: first.balanceAfter - firstEffect,
    closingBalance: last.balanceAfter,
    balanceVerified: statements.every(statement => statement.balanceVerified)
  };
}
