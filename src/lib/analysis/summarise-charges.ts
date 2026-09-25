import type { Transaction } from '../parser/types';

export interface ChargesSummary {
  totalChargesInCents: number;
  chargeCount: number;
  /** Charges as a share of money received, or null when nothing came in. */
  shareOfMoneyInPercent: number | null;
  /** Charges as a share of money spent, excluding the charges themselves. */
  shareOfSpendingPercent: number | null;
  largestChargeInCents: number;
  averageChargeInCents: number;
}

/**
 * Adds up what M-Pesa fees cost over the statement period.
 *
 * Charges are compared against both money in and money out because the more
 * meaningful denominator depends on the account: a business cares what fees
 * cost as a share of takings, an individual as a share of spending.
 *
 * Charges are excluded from the spending denominator — comparing fees to a
 * total that includes those same fees would understate them.
 */
export function summariseCharges(transactions: Transaction[]): ChargesSummary {
  const charges = transactions.filter(transaction => transaction.type === 'charge');

  const totalChargesInCents = charges.reduce((total, charge) => total + charge.amount, 0);

  const moneyInInCents = transactions
    .filter(transaction => transaction.direction === 'in')
    .reduce((total, transaction) => total + transaction.amount, 0);

  const spendingExcludingChargesInCents = transactions
    .filter(
      transaction => transaction.direction === 'out' && transaction.type !== 'charge'
    )
    .reduce((total, transaction) => total + transaction.amount, 0);

  return {
    totalChargesInCents,
    chargeCount: charges.length,
    shareOfMoneyInPercent: toPercentOrNull(totalChargesInCents, moneyInInCents),
    shareOfSpendingPercent: toPercentOrNull(
      totalChargesInCents,
      spendingExcludingChargesInCents
    ),
    largestChargeInCents: charges.reduce(
      (largest, charge) => Math.max(largest, charge.amount),
      0
    ),
    averageChargeInCents:
      charges.length === 0 ? 0 : Math.round(totalChargesInCents / charges.length)
  };
}

function toPercentOrNull(part: number, whole: number): number | null {
  if (whole === 0) {
    return null;
  }
  return Math.round((part / whole) * 1000) / 10; // one decimal place
}
