import { z } from 'zod';

/**
 * Validates parsed data arriving from the browser.
 *
 * The parser runs client-side, so this payload is whatever the user's browser
 * chose to send — it could be fabricated. Every field is checked here, and the
 * server derives anything it can rather than accepting the client's version.
 */

const TRANSACTION_TYPES = [
  'payment_received', 'charge', 'send_money', 'paybill_payment', 'till_payment',
  'pochi_payment', 'unit_trust_investment', 'bundle_purchase', 'agent_deposit',
  'agent_withdrawal', 'airtime', 'fuliza_loan', 'fuliza_repayment', 'reversal',
  'transfer', 'unknown'
] as const;

/** Money is integer cents. Bounded to reject absurd or malicious values. */
const amountInCents = z
  .number()
  .int('Amounts must be whole cents')
  .min(-1_000_000_000_00)
  .max(1_000_000_000_00);

const transactionSchema = z.object({
  receiptNo: z.string().trim().min(1).max(32),
  completedAt: z.string().datetime(),
  detailsRaw: z.string().max(1000),
  type: z.enum(TRANSACTION_TYPES),
  direction: z.enum(['in', 'out']),
  amount: amountInCents.nonnegative(),
  balanceAfter: amountInCents,
  isRevenue: z.boolean(),
  counterpartyName: z.string().max(200).nullable(),
  counterpartyPhone: z.string().max(32).nullable(),
  chargeForReceipt: z.string().max(32).nullable(),
  reversesReceipt: z.string().max(32).nullable(),
  confidence: z.enum(['high', 'low']),
  sourcePage: z.number().int().min(1).max(200)
});

const issueSchema = z.object({
  type: z.enum(['unparsed_row', 'balance_break', 'unknown_type']),
  page: z.number().int().min(1).max(200).nullable(),
  rawText: z.string().max(1000).nullable(),
  detail: z.string().max(500)
});

export const importStatementSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  meta: z.object({
    periodStart: z.string().max(64),
    periodEnd: z.string().max(64),
    openingBalance: amountInCents,
    closingBalance: amountInCents,
    balanceVerified: z.boolean(),
    parserVersion: z.string().max(32)
  }),
  /** A statement with no transactions is not worth storing. */
  transactions: z.array(transactionSchema).min(1).max(5000),
  issues: z.array(issueSchema).max(1000)
});

export type ImportStatementInput = z.infer<typeof importStatementSchema>;