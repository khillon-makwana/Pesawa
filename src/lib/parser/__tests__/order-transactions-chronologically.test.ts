import { describe, it, expect } from 'vitest';
import { orderTransactionsChronologically } from '../order-transactions-chronologically';
import type { Transaction } from '../types';

function buildTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    receiptNo: 'UH00000001',
    completedAt: '2026-08-27T16:18:02.000Z',
    detailsRaw: '',
    type: 'send_money',
    direction: 'out',
    amount: 30000,
    balanceAfter: 812400,
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

describe('orderTransactionsChronologically', () => {
  it('reverses a statement of single rows', () => {
    const newestFirst = [
      buildTransaction({ receiptNo: 'C', balanceAfter: 100000 }),
      buildTransaction({ receiptNo: 'B', balanceAfter: 200000 }),
      buildTransaction({ receiptNo: 'A', balanceAfter: 300000 })
    ];

    const { transactions } = orderTransactionsChronologically(newestFirst);

    expect(transactions.map(t => t.receiptNo)).toEqual(['A', 'B', 'C']);
  });

  it('corrects a bundle printed charge-first', () => {
    // statement order (newest first): charge above its parent
    const newestFirst = [
      buildTransaction({
        receiptNo: 'SAMPLE0A03',
        type: 'charge',
        amount: 700,
        balanceAfter: 811700
      }),
      buildTransaction({
        receiptNo: 'SAMPLE0A03',
        type: 'send_money',
        amount: 30000,
        balanceAfter: 812400
      })
    ];

    const { transactions, issues } = orderTransactionsChronologically(newestFirst);

    expect(issues).toHaveLength(0);
    expect(transactions.map(t => t.type)).toEqual(['send_money', 'charge']);
    expect(transactions.map(t => t.balanceAfter)).toEqual([812400, 811700]);
  });

  it('leaves a bundle printed parent-first alone', () => {
    const newestFirst = [
      buildTransaction({
        receiptNo: 'SAMPLE0A02',
        type: 'send_money',
        amount: 42000,
        balanceAfter: 281100
      }),
      buildTransaction({
        receiptNo: 'SAMPLE0A02',
        type: 'charge',
        amount: 700,
        balanceAfter: 280400
      })
    ];

    const { transactions, issues } = orderTransactionsChronologically(newestFirst);

    expect(issues).toHaveLength(0);
    expect(transactions.map(t => t.type)).toEqual(['send_money', 'charge']);
  });

  it('reports a bundle whose balances do not add up', () => {
    const newestFirst = [
      buildTransaction({
        receiptNo: 'BAD',
        type: 'charge',
        amount: 700,
        balanceAfter: 999999
      }),
      buildTransaction({
        receiptNo: 'BAD',
        type: 'send_money',
        amount: 30000,
        balanceAfter: 812400
      })
    ];

    const { transactions, issues } = orderTransactionsChronologically(newestFirst);

    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('balance_break');
    expect(issues[0].detail).toContain('BAD');
    expect(transactions).toHaveLength(2); // nothing dropped
  });

  it('does not merge same-receipt rows that are not adjacent', () => {
    const newestFirst = [
      buildTransaction({ receiptNo: 'X', balanceAfter: 100000 }),
      buildTransaction({ receiptNo: 'Y', balanceAfter: 200000 }),
      buildTransaction({ receiptNo: 'X', balanceAfter: 300000 })
    ];

    const { transactions } = orderTransactionsChronologically(newestFirst);

    expect(transactions.map(t => t.receiptNo)).toEqual(['X', 'Y', 'X']);
  });

  it('handles an empty statement', () => {
    expect(orderTransactionsChronologically([]).transactions).toEqual([]);
  });
});
