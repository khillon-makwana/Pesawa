/**
 * Every transaction type we recognise on an M-Pesa statement.
 *
 * A runtime list rather than a bare union, so that code validating data from
 * outside the app — a restored backup, say — can check against the same names
 * the parser produces instead of keeping its own copy that drifts.
 */
export const TRANSACTION_TYPES = [
  'payment_received',
  'charge',
  'send_money',
  'paybill_payment',
  'till_payment',
  'bundle_purchase',
  'agent_deposit',
  'agent_withdrawal',
  'airtime',
  'fuliza_loan',
  'fuliza_repayment',
  'reversal',
  'transfer',
  'pochi_payment',
  'unit_trust_investment',
  'unknown'
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type Direction = 'in' | 'out';

export type Confidence = 'high' | 'low';

/** A single parsed line from a statement. */
export interface Transaction {
  receiptNo: string;
  completedAt: string; // ISO 8601
  detailsRaw: string; // untouched source text
  type: TransactionType;
  direction: Direction;
  amount: number; // CENTS, always positive
  balanceAfter: number; // CENTS
  isRevenue: boolean;
  counterpartyName: string | null;
  counterpartyPhone: string | null;
  chargeForReceipt: string | null;
  reversesReceipt: string | null;
  confidence: Confidence;
  sourcePage: number;
}

/**
 * Exactly which problem an issue is. `type` is too coarse to explain an issue
 * to someone — a skipped Failed row and an unreadable balance are both
 * 'unparsed_row' — so the code says which case it is, and the screen turns
 * that into plain words.
 */
export const ISSUE_CODES = [
  'balance_mismatch',
  'charge_without_payment',
  'row_skipped_status',
  'row_unreadable_time',
  'row_unreadable_balance',
  'row_missing_amount',
  'row_both_amounts',
  'no_consistent_order',
  'ambiguous_order',
  'group_too_large'
] as const;

export type IssueCode = (typeof ISSUE_CODES)[number];

/** Something the parser could not handle cleanly. */
export interface ParseIssue {
  type: 'unparsed_row' | 'balance_break' | 'unknown_type';
  page: number | null;
  rawText: string | null;
  /** The technical description. Kept for the CSV export and bug reports. */
  detail: string;

  /*
   * The facts behind the issue, so it can be explained without re-reading
   * `detail`. Every field is optional because issues saved before these
   * existed have none of them, and each code only fills the ones it needs.
   */
  code?: IssueCode;
  receiptNo?: string;
  status?: string;
  rowCount?: number;
  amountInCents?: number;
  expectedBalanceInCents?: number;
  printedBalanceInCents?: number;
}

export interface StatementMeta {
  periodStart: string;
  periodEnd: string;
  openingBalance: number; // CENTS
  closingBalance: number; // CENTS
  accountLabel: string | null;
  balanceVerified: boolean;
  parserVersion: string;
}

/** What parseStatement() returns. */
export interface ParseResult {
  meta: StatementMeta;
  transactions: Transaction[];
  issues: ParseIssue[];
}

/**
 * One row exactly as it appears in the statement table, before any
 * interpretation. All fields are strings because that is what a PDF gives us.
 * This is the seam between PDF extraction and parsing logic.
 */
export interface RawRow {
  receiptNo: string;
  completionTime: string; // "2024-01-15 14:32:07"
  details: string;
  status: string; // "Completed" | "Failed"
  paidIn: string; // "1,500.00" or ""
  withdrawn: string; // "-500.00" or ""
  balance: string; // "12,340.50"
  page: number;
}

/**
 * A fragment of text from the PDF with its position on the page.
 * Coordinates are PDF user-space units, origin bottom-left.
 */
export interface PositionedTextItem {
  text: string;
  x: number; // left edge
  right: number; // right edge — amounts are right-aligned, so this identifies them
  y: number; // baseline
  page: number;
}
