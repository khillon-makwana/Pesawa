import type { Transaction, TransactionType } from '../parser/types';

export interface MoneyFlowCategory {
  label: string;
  totalInCents: number;
  transactionCount: number;
  shareOfTotalPercent: number;
}

export interface MoneyFlowSummary {
  totalInInCents: number;
  totalOutInCents: number;
  netInCents: number;
  /** Money out, broken down by where it went. Ordered by size. */
  spendingByCategory: MoneyFlowCategory[];
  /** Money genuinely earned, as opposed to deposited or borrowed. */
  revenueInCents: number;
  /** Money that moved without being spent — savings, float, deposits. */
  cashMovementInCents: number;
}

/**
 * Groups transaction types into categories a person would recognise. The
 * parser's types are precise; these are what someone reading a summary wants
 * to see.
 */
const SPENDING_CATEGORIES: { label: string; types: TransactionType[] }[] = [
  { label: 'Sent to people', types: ['send_money', 'pochi_payment'] },
  { label: 'Bills and paybills', types: ['paybill_payment'] },
  { label: 'Shops and merchants', types: ['till_payment'] },
  { label: 'Airtime and data', types: ['airtime', 'bundle_purchase'] },
  { label: 'Moved to savings', types: ['unit_trust_investment'] },
  { label: 'Withdrawn as cash', types: ['agent_withdrawal'] },
  { label: 'M-PESA charges', types: ['charge'] }
];

/**
 * Money that arrives without being earned — it was already yours, or is owed
 * back. Separating this from revenue is the point of the summary: a statement
 * showing 100,000 received tells you nothing if 80,000 was your own deposit.
 */
const NON_REVENUE_INFLOWS: TransactionType[] = [
  'agent_deposit',
  'fuliza_loan',
  'reversal'
];

export function summariseMoneyFlow(transactions: Transaction[]): MoneyFlowSummary {
  const incoming = transactions.filter(transaction => transaction.direction === 'in');
  const outgoing = transactions.filter(transaction => transaction.direction === 'out');

  const totalInInCents = sumAmounts(incoming);
  const totalOutInCents = sumAmounts(outgoing);

  const revenueInCents = sumAmounts(
    incoming.filter(transaction => !NON_REVENUE_INFLOWS.includes(transaction.type))
  );

  const spendingByCategory = SPENDING_CATEGORIES.map(({ label, types }) => {
    const matching = outgoing.filter(transaction => types.includes(transaction.type));
    const totalInCents = sumAmounts(matching);

    return {
      label,
      totalInCents,
      transactionCount: matching.length,
      shareOfTotalPercent:
        totalOutInCents === 0 ? 0 : Math.round((totalInCents / totalOutInCents) * 1000) / 10
    };
  })
    .filter(category => category.transactionCount > 0)
    .sort((a, b) => b.totalInCents - a.totalInCents);

  const cashMovementInCents = sumAmounts(
    transactions.filter(transaction =>
      transaction.type === 'unit_trust_investment' ||
      transaction.type === 'agent_deposit' ||
      transaction.type === 'agent_withdrawal'
    )
  );

  return {
    totalInInCents,
    totalOutInCents,
    netInCents: totalInInCents - totalOutInCents,
    spendingByCategory,
    revenueInCents,
    cashMovementInCents
  };
}

function sumAmounts(transactions: Transaction[]): number {
  return transactions.reduce((total, transaction) => total + transaction.amount, 0);
}