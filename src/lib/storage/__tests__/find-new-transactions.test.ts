import { describe, it, expect } from 'vitest';
import type { Transaction } from '@/lib/parser/types';
import { keyTransactions, findNewTransactions } from '../find-new-transactions';

/** The key a row gets when it is the only one of its kind in a statement. */
function keyOf(transaction: Transaction): string {
  return keyTransactions([transaction])[0].key;
}

/** The keys a whole statement's rows get, in order. */
function keysOf(transactions: Transaction[]): string[] {
  return keyTransactions(transactions).map(row => row.key);
}

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

describe('keyTransactions', () => {
  it('separates a charge from the transaction it belongs to', () => {
    const parent = buildTransaction({ receiptNo: 'SAMPLE0A01', type: 'send_money' });
    const charge = buildTransaction({
      receiptNo: 'SAMPLE0A01',
      type: 'charge',
      amount: 700
    });

    expect(keyOf(parent)).not.toBe(keyOf(charge));
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

    expect(keyOf(transferCharge)).not.toBe(keyOf(paybillCharge));
  });

  it('separates two charges identical in receipt, type and amount', () => {
    // Two fees at the same tariff against one receipt. They are two real rows,
    // so they must not collapse into one.
    const charge = buildTransaction({
      receiptNo: 'SAMPLE0A01',
      type: 'charge',
      amount: 700
    });

    const [first, second] = keysOf([charge, charge]);

    expect(first).not.toBe(second);
    expect(first).toBe('SAMPLE0A01:charge:700:1');
    expect(second).toBe('SAMPLE0A01:charge:700:2');
  });

  it('numbers by position, so reading a statement twice gives the same keys', () => {
    const statement = [
      buildTransaction({ receiptNo: 'AAA' }),
      buildTransaction({ receiptNo: 'X', type: 'charge', amount: 700 }),
      buildTransaction({ receiptNo: 'X', type: 'charge', amount: 700 })
    ];

    expect(keysOf(statement)).toEqual(keysOf(statement));
  });

  it('counts occurrences per row kind, not across the whole statement', () => {
    const keys = keysOf([
      buildTransaction({ receiptNo: 'AAA', type: 'charge', amount: 700 }),
      buildTransaction({ receiptNo: 'BBB', type: 'charge', amount: 700 })
    ]);

    expect(keys).toEqual(['AAA:charge:700:1', 'BBB:charge:700:1']);
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

    const result = findNewTransactions([saved, fresh], new Set([keyOf(saved)]));

    expect(result).toHaveLength(1);
    expect(result[0].transaction.receiptNo).toBe('BBB');
  });

  it('keeps a charge whose parent is already saved', () => {
    const parent = buildTransaction({ receiptNo: 'SAMPLE0A01', type: 'send_money' });
    const charge = buildTransaction({
      receiptNo: 'SAMPLE0A01',
      type: 'charge',
      amount: 700
    });

    const result = findNewTransactions([charge], new Set([keyOf(parent)]));

    expect(result.map(row => row.transaction)).toEqual([charge]);
  });

  it('keeps both of two identical charges on one receipt', () => {
    const charge = buildTransaction({
      receiptNo: 'SAMPLE0A01',
      type: 'charge',
      amount: 700
    });

    expect(findNewTransactions([charge, charge], new Set())).toHaveLength(2);
  });

  it('adds nothing when the same statement is imported again', () => {
    const statement = [
      buildTransaction({ receiptNo: 'AAA', type: 'send_money', amount: 40000 }),
      buildTransaction({ receiptNo: 'AAA', type: 'charge', amount: 700 }),
      buildTransaction({ receiptNo: 'AAA', type: 'charge', amount: 700 }),
      buildTransaction({ receiptNo: 'BBB', type: 'paybill_payment', amount: 150000 })
    ];

    const savedKeys = new Set(keysOf(statement));

    expect(findNewTransactions(statement, savedKeys)).toEqual([]);
  });

  it('returns nothing when every row is already saved', () => {
    const rows = [buildTransaction({ receiptNo: 'AAA' }), buildTransaction({ receiptNo: 'BBB' })];

    expect(findNewTransactions(rows, new Set(keysOf(rows)))).toEqual([]);
  });
});
