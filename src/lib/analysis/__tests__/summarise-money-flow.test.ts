import { describe, it, expect } from 'vitest';
import { summariseMoneyFlow } from '../summarise-money-flow';
import type { Transaction } from '../../parser/types';

function buildTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    receiptNo: 'UH00000001',
    completedAt: '2026-08-27T16:18:02.000Z',
    detailsRaw: '',
    type: 'send_money',
    direction: 'out',
    amount: 40000,
    balanceAfter: 0,
    isRevenue: false,
    counterpartyName: null,
    counterpartyPhone: null,
    chargeForReceipt: null,
    reversesReceipt: null,
    confidence: 'high',
    sourcePage: 1,
    ...overrides
  };
}

describe('summariseMoneyFlow', () => {
  it('totals money in, out, and net', () => {
    const summary = summariseMoneyFlow([
      buildTransaction({ direction: 'in', type: 'payment_received', amount: 1000000 }),
      buildTransaction({ direction: 'out', type: 'send_money', amount: 400000 })
    ]);

    expect(summary.totalInInCents).toBe(1000000);
    expect(summary.totalOutInCents).toBe(400000);
    expect(summary.netInCents).toBe(600000);
  });

  it('excludes agent deposits from revenue', () => {
    // 10,000 received, but 50,000 of it was your own cash deposit
    const summary = summariseMoneyFlow([
      buildTransaction({ direction: 'in', type: 'payment_received', amount: 1000000 }),
      buildTransaction({ direction: 'in', type: 'agent_deposit', amount: 5000000 })
    ]);

    expect(summary.totalInInCents).toBe(6000000);
    expect(summary.revenueInCents).toBe(1000000);
  });

  it('excludes Fuliza loans from revenue', () => {
    const summary = summariseMoneyFlow([
      buildTransaction({ direction: 'in', type: 'fuliza_loan', amount: 100000 })
    ]);

    expect(summary.revenueInCents).toBe(0);
  });

  it('groups spending into recognisable categories', () => {
    const summary = summariseMoneyFlow([
      buildTransaction({ type: 'send_money', amount: 400000 }),
      buildTransaction({ type: 'pochi_payment', amount: 100000 }),
      buildTransaction({ type: 'till_payment', amount: 200000 })
    ]);

    const transfers = summary.spendingByCategory.find(c => c.label === 'Sent to people');
    expect(transfers?.totalInCents).toBe(500000);
    expect(transfers?.transactionCount).toBe(2);
  });

  it('orders categories by size', () => {
    const summary = summariseMoneyFlow([
      buildTransaction({ type: 'airtime', amount: 5000 }),
      buildTransaction({ type: 'send_money', amount: 400000 }),
      buildTransaction({ type: 'till_payment', amount: 100000 })
    ]);

    expect(summary.spendingByCategory.map(c => c.label)).toEqual([
      'Sent to people',
      'Shops and merchants',
      'Airtime and data'
    ]);
  });

  it('omits categories with no transactions', () => {
    const summary = summariseMoneyFlow([
      buildTransaction({ type: 'send_money', amount: 400000 })
    ]);

    expect(summary.spendingByCategory).toHaveLength(1);
  });

  it('counts savings separately from spending', () => {
    const summary = summariseMoneyFlow([
      buildTransaction({ type: 'unit_trust_investment', amount: 500000 })
    ]);

    expect(summary.cashMovementInCents).toBe(500000);
    expect(summary.spendingByCategory[0].label).toBe('Moved to savings');
  });

  it('computes each category share of total spending', () => {
    const summary = summariseMoneyFlow([
      buildTransaction({ type: 'send_money', amount: 750000 }),
      buildTransaction({ type: 'till_payment', amount: 250000 })
    ]);

    expect(summary.spendingByCategory[0].shareOfTotalPercent).toBe(75);
    expect(summary.spendingByCategory[1].shareOfTotalPercent).toBe(25);
  });

  it('handles an empty statement', () => {
    const summary = summariseMoneyFlow([]);

    expect(summary.totalInInCents).toBe(0);
    expect(summary.spendingByCategory).toEqual([]);
  });
  it('separates deposits, loans and reversals from the rest of money in', () => {
    const summary = summariseMoneyFlow([
      buildTransaction({ type: 'payment_received', direction: 'in', amount: 300000 }),
      buildTransaction({ type: 'agent_deposit', direction: 'in', amount: 200000 }),
      buildTransaction({ type: 'fuliza_loan', direction: 'in', amount: 50000 }),
      buildTransaction({ type: 'reversal', direction: 'in', amount: 10000 })
    ]);

    expect(summary.totalInInCents).toBe(560000);
    expect(summary.depositsLoansAndReversalsInCents).toBe(260000);
    // The two always account for all of money in between them.
    expect(summary.depositsLoansAndReversalsInCents + summary.revenueInCents).toBe(
      summary.totalInInCents
    );
  });

  it('counts only unit trust investments as moved to savings', () => {
    const summary = summariseMoneyFlow([
      buildTransaction({
        type: 'unit_trust_investment',
        direction: 'out',
        amount: 100000
      }),
      buildTransaction({ type: 'agent_withdrawal', direction: 'out', amount: 70000 }),
      buildTransaction({ type: 'send_money', direction: 'out', amount: 40000 })
    ]);

    expect(summary.movedToSavingsInCents).toBe(100000);
  });
});
