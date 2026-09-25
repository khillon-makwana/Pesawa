import { describe, it, expect } from 'vitest';
import type { Transaction } from '@/lib/parser/types';
import { buildTransactionKey, findNewTransactions } from '../find-new-transactions';

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    receiptNo: 'UH00000001',
    completedAt: '2026-08-27T16:18:02.000Z',
    detailsRaw: '',
    type: 'send_money',
    direction: 'out',
    amount: 40000,
    balanceAfter: 100000,
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

describe('buildTransactionKey', () => {
  it('separates a charge from the transaction it belongs to', () => {
    const parent = buildTransaction({ receiptNo: 'SAMPLE0A01', type: 'send_money' });
    const charge = buildTransaction({
      receiptNo: 'SAMPLE0A01',
      type: 'charge',
      amount: 700
    });

    expect(buildTransactionKey(parent)).not.toBe(buildTransactionKey(charge));
  });

  it('separates two charges on one receipt that differ in amount', () => {
    const transferCharge = buildTransaction({
      receiptNo: 'SAMPLE0A01',
      type: 'charge',
      amount: 700
    });
    const paybillCharge = buildTransaction({
      receiptNo: 'SAMPLE0A01',
      type: 'charge',
      amount: 2300
    });

    expect(buildTransactionKey(transferCharge)).not.toBe(
      buildTransactionKey(paybillCharge)
    );
  });

  it('gives the same key to the same row read twice', () => {
    expect(buildTransactionKey(buildTransaction())).toBe(
      buildTransactionKey(buildTransaction())
    );
  });
});

describe('findNewTransactions', () => {
  it('returns everything when nothing is saved yet', () => {
    const incoming = [
      buildTransaction({ receiptNo: 'AAA' }),
      buildTransaction({ receiptNo: 'BBB' })
    ];

    expect(findNewTransactions(incoming, new Set())).toHaveLength(2);
  });

  it('skips rows that are already saved', () => {
    const saved = buildTransaction({ receiptNo: 'AAA' });
    const fresh = buildTransaction({ receiptNo: 'BBB' });

    const result = findNewTransactions(
      [saved, fresh],
      new Set([buildTransactionKey(saved)])
    );

    expect(result).toHaveLength(1);
    expect(result[0].receiptNo).toBe('BBB');
  });

  it('keeps a charge whose parent is already saved', () => {
    const parent = buildTransaction({ receiptNo: 'SAMPLE0A01', type: 'send_money' });
    const charge = buildTransaction({
      receiptNo: 'SAMPLE0A01',
      type: 'charge',
      amount: 700
    });

    const result = findNewTransactions([charge], new Set([buildTransactionKey(parent)]));

    expect(result).toEqual([charge]);
  });

  it('skips a row repeated within the same batch', () => {
    const duplicated = buildTransaction({ receiptNo: 'AAA' });

    expect(findNewTransactions([duplicated, duplicated], new Set())).toHaveLength(1);
  });

  it('returns nothing when every row is already saved', () => {
    const rows = [buildTransaction({ receiptNo: 'AAA' }), buildTransaction({ receiptNo: 'BBB' })];
    const savedKeys = new Set(rows.map(buildTransactionKey));

    expect(findNewTransactions(rows, savedKeys)).toEqual([]);
  });
});
