import { describe, it, expect } from 'vitest';
import { linkChargesToParentTransactions } from '../link-charges-to-parent-transactions';
import type { Transaction } from '../types';

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

describe('linkChargesToParentTransactions', () => {
  it('links a charge that follows its parent', () => {
    const { transactions, issues } = linkChargesToParentTransactions([
      buildTransaction({ receiptNo: 'SAMPLE0A03', type: 'send_money' }),
      buildTransaction({ receiptNo: 'SAMPLE0A03', type: 'charge', amount: 700 })
    ]);

    expect(issues).toHaveLength(0);
    expect(transactions[1].chargeForReceipt).toBe('SAMPLE0A03');
  });

  it('links a charge that precedes its parent', () => {
    // Safaricom deducts some paybill fees before the payment itself
    const { transactions, issues } = linkChargesToParentTransactions([
      buildTransaction({ receiptNo: 'SAMPLE0A05', type: 'charge', amount: 500 }),
      buildTransaction({ receiptNo: 'SAMPLE0A05', type: 'paybill_payment' })
    ]);

    expect(issues).toHaveLength(0);
    expect(transactions[0].chargeForReceipt).toBe('SAMPLE0A05');
  });

  it('leaves non-charge transactions untouched', () => {
    const { transactions } = linkChargesToParentTransactions([
      buildTransaction({ receiptNo: 'A', type: 'send_money' }),
      buildTransaction({ receiptNo: 'B', type: 'payment_received' })
    ]);

    expect(transactions[0].chargeForReceipt).toBeNull();
    expect(transactions[1].chargeForReceipt).toBeNull();
  });

  it('reports a charge whose parent is not adjacent', () => {
    const { transactions, issues } = linkChargesToParentTransactions([
      buildTransaction({ receiptNo: 'A', type: 'send_money' }),
      buildTransaction({ receiptNo: 'ORPHAN', type: 'charge', amount: 700 }),
      buildTransaction({ receiptNo: 'B', type: 'send_money' })
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain('ORPHAN');
    expect(transactions[1].chargeForReceipt).toBeNull();
  });

  it('reports a charge at the very start of a statement', () => {
    // its parent is in the previous month's statement
    const { issues } = linkChargesToParentTransactions([
      buildTransaction({ receiptNo: 'SAMPLE0A04', type: 'charge', amount: 700 }),
      buildTransaction({ receiptNo: 'SOMETHING-ELSE', type: 'send_money' })
    ]);

    expect(issues).toHaveLength(1);
    expect(issues[0].detail).toContain('SAMPLE0A04');
  });

  it('does not link two adjacent charges to each other', () => {
    const { issues } = linkChargesToParentTransactions([
      buildTransaction({ receiptNo: 'X', type: 'charge', amount: 700 }),
      buildTransaction({ receiptNo: 'X', type: 'charge', amount: 500 })
    ]);

    expect(issues).toHaveLength(2);
  });

  it('handles an empty statement', () => {
    expect(linkChargesToParentTransactions([]).transactions).toEqual([]);
  });

  describe('when the parent is in an earlier statement', () => {
    it('links the charge if the caller knows the parent', () => {
      const { transactions, issues } = linkChargesToParentTransactions(
        [buildTransaction({ receiptNo: 'SAMPLE0A04', type: 'charge', amount: 700 })],
        receiptNo => receiptNo === 'SAMPLE0A04'
      );

      expect(issues).toHaveLength(0);
      expect(transactions[0].chargeForReceipt).toBe('SAMPLE0A04');
    });

    it('still reports the charge if the caller does not know the parent', () => {
      const { transactions, issues } = linkChargesToParentTransactions(
        [buildTransaction({ receiptNo: 'SAMPLE0A04', type: 'charge', amount: 700 })],
        () => false
      );

      expect(issues).toHaveLength(1);
      expect(transactions[0].chargeForReceipt).toBeNull();
    });

    it('prefers a parent in this statement over asking the caller', () => {
      const askedAbout: string[] = [];

      const { transactions } = linkChargesToParentTransactions(
        [
          buildTransaction({ receiptNo: 'SAMPLE0A03', type: 'send_money' }),
          buildTransaction({ receiptNo: 'SAMPLE0A03', type: 'charge', amount: 700 })
        ],
        receiptNo => {
          askedAbout.push(receiptNo);
          return true;
        }
      );

      expect(askedAbout).toEqual([]);
      expect(transactions[1].chargeForReceipt).toBe('SAMPLE0A03');
    });
  });
});
