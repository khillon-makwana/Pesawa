import type { RawRow, Transaction, Confidence, IssueCode } from './types';
import { classifyTransactionType } from './classify-transaction-type';
import { extractCounterparty } from './extract-counterparty';
import { parseAmountToCents } from './parse-amount-to-cents';

/** M-Pesa statements print times in East Africa Time. */
const STATEMENT_TIMEZONE_OFFSET = '+03:00';

/** Types that represent money genuinely earned, as opposed to moved or borrowed. */
const REVENUE_TYPES = new Set(['payment_received']);

export type RowParseOutcome =
  { ok: true; transaction: Transaction } | { ok: false; code: IssueCode; reason: string };

/**
 * "2026-06-05 16:30:45" -> "2026-06-05T16:30:45.000Z" (adjusted for EAT).
 * The offset is applied explicitly so results don't depend on the machine's
 * local timezone.
 */
function parseCompletionTimeToIso(completionTime: string): string | null {
  const normalised = completionTime.trim().replace(' ', 'T');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalised)) {
    return null;
  }
  const date = new Date(`${normalised}${STATEMENT_TIMEZONE_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** A row is only as trustworthy as its least trustworthy part. */
function combineConfidence(...levels: Confidence[]): Confidence {
  return levels.includes('low') ? 'low' : 'high';
}

/**
 * Turns one raw statement row into a Transaction.
 *
 * Returns a failure outcome rather than throwing: one bad row should not
 * abort a statement of two thousand good ones. The caller records the reason
 * as a ParseIssue.
 *
 * Charge rows are not linked to their parents here — that needs the whole set,
 * and happens in a later pass.
 */
export function parseStatementRow(row: RawRow): RowParseOutcome {
  if (row.status.trim().toLowerCase() !== 'completed') {
    return {
      ok: false,
      code: 'row_skipped_status',
      reason: `Skipped row with status "${row.status}"`
    };
  }

  const completedAt = parseCompletionTimeToIso(row.completionTime);
  if (completedAt === null) {
    return {
      ok: false,
      code: 'row_unreadable_time',
      reason: `Unreadable completion time "${row.completionTime}"`
    };
  }

  const paidIn = parseAmountToCents(row.paidIn);
  const withdrawn = parseAmountToCents(row.withdrawn);

  if (paidIn === null && withdrawn === null) {
    return {
      ok: false,
      code: 'row_missing_amount',
      reason: 'Row has neither a paid-in nor a withdrawn amount'
    };
  }
  if (paidIn !== null && withdrawn !== null) {
    return {
      ok: false,
      code: 'row_both_amounts',
      reason: 'Row has both a paid-in and a withdrawn amount'
    };
  }

  const balanceAfter = parseAmountToCents(row.balance);
  if (balanceAfter === null) {
    return {
      ok: false,
      code: 'row_unreadable_balance',
      reason: `Unreadable balance "${row.balance}"`
    };
  }

  const direction = paidIn !== null ? 'in' : 'out';
  const amount = paidIn ?? withdrawn!;

  const classification = classifyTransactionType(row.details);
  const counterparty = extractCounterparty(row.details, classification.type);

  return {
    ok: true,
    transaction: {
      receiptNo: row.receiptNo.trim(),
      completedAt,
      detailsRaw: row.details,
      type: classification.type,
      direction,
      amount,
      balanceAfter,
      isRevenue: REVENUE_TYPES.has(classification.type) && direction === 'in',
      counterpartyName: counterparty.name,
      counterpartyPhone: counterparty.phone,
      chargeForReceipt: null,
      reversesReceipt: null,
      confidence: combineConfidence(classification.confidence, counterparty.confidence),
      sourcePage: row.page
    }
  };
}
