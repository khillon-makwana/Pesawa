import type { ParseResult } from './types';
import { decryptAndExtractTextItems } from './decrypt-and-extract-text-items';
import { groupTextItemsIntoRows } from './group-text-items-into-rows';
import { parseStatementRows } from './parse-statement-rows';
import { parseAmountToCents } from './parse-amount-to-cents';
import type { RawRow } from './types';

export const PARSER_VERSION = '0.1.0';

export type StatementParseOutcome =
  | { ok: true; result: ParseResult }
  | {
      ok: false;
      reason: 'wrong_password' | 'password_required' | 'invalid_pdf' | 'no_transactions';
      detail: string;
    };

/**
 * Parses an M-Pesa statement PDF into verified transactions.
 *
 * The opening balance is derived from the oldest row: its balance minus its
 * own effect. Safaricom prints an opening balance in the summary section, and
 * cross-checking against it is a later improvement.
 *
 * `hasParentInEarlierStatements` is optional. Pass it to link charges whose
 * parent transaction sits in a statement read earlier. It must be synchronous,
 * so a caller reading from storage should load what it needs first and then
 * answer from memory.
 */
export async function parseStatementPdf(
  fileBytes: ArrayBuffer,
  password?: string,
  hasParentInEarlierStatements?: (receiptNo: string) => boolean
): Promise<StatementParseOutcome> {
  const extraction = await decryptAndExtractTextItems(fileBytes, password);

  if (!extraction.ok) {
    return { ok: false, reason: extraction.reason, detail: extraction.detail };
  }

  const rows = groupTextItemsIntoRows(extraction.items);

  if (rows.length === 0) {
    return {
      ok: false,
      reason: 'no_transactions',
      detail: 'No transaction rows were found. This may not be an M-Pesa statement.'
    };
  }

  // Rows are newest-first, so the last one is the oldest.
  const oldestRow = rows[rows.length - 1];
  const openingBalanceInCents = deriveOpeningBalanceInCents(oldestRow);

  const parsed = parseStatementRows(
    rows,
    openingBalanceInCents,
    hasParentInEarlierStatements
  );
  const transactions = parsed.transactions;

  return {
    ok: true,
    result: {
      meta: {
        periodStart: transactions[0]?.completedAt ?? '',
        periodEnd: transactions[transactions.length - 1]?.completedAt ?? '',
        openingBalance: openingBalanceInCents,
        closingBalance:
          transactions[transactions.length - 1]?.balanceAfter ?? openingBalanceInCents,
        accountLabel: null,
        balanceVerified: parsed.isBalanceVerified,
        parserVersion: PARSER_VERSION
      },
      transactions,
      issues: parsed.issues
    }
  };
}

/**
 * Works out the balance before the first transaction, by taking the oldest
 * row's balance and undoing that row's own effect.
 *
 *   oldest row: money in 10,000, balance after 15,640
 *   opening   = 15,640 − 10,000 = 5,640
 *
 * Returns 0 if the row's figures cannot be read — the balance walk will then
 * report a break on the first row, which is the correct signal that the
 * statement could not be verified.
 */
function deriveOpeningBalanceInCents(oldestRow: RawRow): number {
  const balanceAfter = parseAmountToCents(oldestRow.balance);
  const paidIn = parseAmountToCents(oldestRow.paidIn);
  const withdrawn = parseAmountToCents(oldestRow.withdrawn);

  if (balanceAfter === null) {
    return 0;
  }

  if (paidIn !== null) {
    return balanceAfter - paidIn;
  }

  if (withdrawn !== null) {
    return balanceAfter + withdrawn;
  }

  return balanceAfter;
}
