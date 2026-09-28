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

/** Something the parser could not handle cleanly. */
export interface ParseIssue {
  type: 'unparsed_row' | 'balance_break' | 'unknown_type';
  page: number | null;
  rawText: string | null;
  detail: string;
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
