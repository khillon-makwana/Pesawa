import type { TransactionType, Confidence } from './types';

export interface TransactionClassification {
  type: TransactionType;
  confidence: Confidence;
}

interface ClassificationPattern {
  pattern: RegExp;
  type: TransactionType;
}

/**
 * Details cells wrap across lines in the PDF, so the extracted text can carry
 * newlines and doubled spaces. Collapse them before matching.
 */
function normaliseDetailsForMatching(details: string): string {
  return details.replace(/\s+/g, ' ').trim();
}

/**
 * Patterns confirmed against real M-Pesa statements.
 * Order matters: charges are listed before the transactions they belong to,
 * because "Pay Bill Charge" and "Pay Bill to ..." share a prefix.
 */
const VERIFIED_PATTERNS: ClassificationPattern[] = [
  { pattern: /^Customer Transfer of Funds Charge/i, type: 'charge' },
  { pattern: /^Pay Bill Charge/i, type: 'charge' },

  { pattern: /^Customer Payment to Small Business/i, type: 'pochi_payment' },
  { pattern: /^Unit Trust Invest To/i, type: 'unit_trust_investment' },

  { pattern: /^Funds received from/i, type: 'payment_received' },
  { pattern: /^Customer Transfer to\b/i, type: 'send_money' },
  { pattern: /^Pay Bill (Online )?to\b/i, type: 'paybill_payment' },
  { pattern: /^Merchant Payment to\b/i, type: 'till_payment' },
  { pattern: /^Customer Bundle Purchase\b/i, type: 'bundle_purchase' },
  { pattern: /^Airtime Purchase/i, type: 'airtime' }
];

/**
 * Patterns not yet seen on a real statement. Matched loosely on keywords and
 * always returned with low confidence, so the UI can flag them for review.
 * Move a pattern into VERIFIED_PATTERNS once a real example confirms it.
 */
const PROVISIONAL_PATTERNS: ClassificationPattern[] = [
  { pattern: /fuliza.*repay/i, type: 'fuliza_repayment' },
  { pattern: /fuliza/i, type: 'fuliza_loan' },
  { pattern: /deposit.*agent/i, type: 'agent_deposit' },
  { pattern: /withdraw\w*.*agent/i, type: 'agent_withdrawal' },
  { pattern: /^revers/i, type: 'reversal' }
];

/**
 * Works out what kind of transaction a statement row describes, using only its
 * details text. Returns 'unknown' with low confidence when nothing matches —
 * the parser never guesses.
 */
export function classifyTransactionType(details: string): TransactionClassification {
  const normalised = normaliseDetailsForMatching(details);

  for (const { pattern, type } of VERIFIED_PATTERNS) {
    if (pattern.test(normalised)) {
      return { type, confidence: 'high' };
    }
  }

  for (const { pattern, type } of PROVISIONAL_PATTERNS) {
    if (pattern.test(normalised)) {
      return { type, confidence: 'low' };
    }
  }

  return { type: 'unknown', confidence: 'low' };
}
