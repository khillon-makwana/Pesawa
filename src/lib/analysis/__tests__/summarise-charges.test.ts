import { describe, it, expect } from 'vitest';
import { summariseCharges } from '../summarise-charges';
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

describe('summariseCharges', () => {
  it('totals and counts charges', () => {
    const summary = summariseCharges([
      buildTransaction({ type: 'charge', amount: 700 }),
      buildTransaction({ type: 'charge', amount: 1300 }),
      buildTransaction({ type: 'send_money', amount: 40000 })
    ]);

    expect(summary.totalChargesInCents).toBe(2000);
    expect(summary.chargeCount).toBe(2);
    expect(summary.largestChargeInCents).toBe(1300);
    expect(summary.averageChargeInCents).toBe(1000);
  });

  it('compares charges to money received', () => {
    const summary = summariseCharges([
      buildTransaction({ type: 'payment_received', direction: 'in', amount: 1000000 }),
      buildTransaction({ type: 'charge', amount: 10000 })
    ]);

    expect(summary.shareOfMoneyInPercent).toBe(1); // 100 of 10,000
  });

  it('excludes charges from the spending denominator', () => {
    // spent 1,000 and paid 100 in fees -> 10%, not 9.1%
    const summary = summariseCharges([
      buildTransaction({ type: 'send_money', direction: 'out', amount: 100000 }),
      buildTransaction({ type: 'charge', direction: 'out', amount: 10000 })
    ]);

    expect(summary.shareOfSpendingPercent).toBe(10);
  });

  it('returns null rather than zero when there is no money in', () => {
    const summary = summariseCharges([buildTransaction({ type: 'charge', amount: 700 })]);

    expect(summary.shareOfMoneyInPercent).toBeNull();
  });

  it('handles a statement with no charges', () => {
    // Money did come in, so the share is a real zero rather than "unknown".
    const summary = summariseCharges([
      buildTransaction({ type: 'payment_received', direction: 'in', amount: 40000 }),
      buildTransaction({ type: 'send_money', amount: 40000 })
    ]);

    expect(summary).toMatchObject({
      totalChargesInCents: 0,
      chargeCount: 0,
      largestChargeInCents: 0,
      averageChargeInCents: 0,
      shareOfMoneyInPercent: 0
    });
  });

  it('handles an empty statement', () => {
    const summary = summariseCharges([]);

    expect(summary.chargeCount).toBe(0);
    expect(summary.shareOfMoneyInPercent).toBeNull();
  });
});
