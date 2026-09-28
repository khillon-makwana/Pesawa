import { describe, it, expect } from 'vitest';
import { verifyBalance } from '../verify-balance';
import type { Transaction } from '../types';

function buildTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    receiptNo: 'UH00000001',
    completedAt: '2026-08-27T16:18:02.000Z',
    detailsRaw: '',
    type: 'send_money',
    direction: 'out',
    amount: 30000,
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

describe('verifyBalance', () => {
  it('passes a consistent statement', () => {
    // opening 10,000 -> +5,000 -> -2,000 -> -7
    const transactions = [
      buildTransaction({
        receiptNo: 'A',
        direction: 'in',
        amount: 500000,
        balanceAfter: 1500000
      }),
      buildTransaction({
        receiptNo: 'B',
        direction: 'out',
        amount: 200000,
        balanceAfter: 1300000
      }),
      buildTransaction({
        receiptNo: 'C',
        direction: 'out',
        amount: 700,
        balanceAfter: 1299300
      })
    ];

    const result = verifyBalance(transactions, 1000000);

    expect(result.isVerified).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('detects a dropped row', () => {
    // a 3,000 withdrawal is missing between the two
    const transactions = [
      buildTransaction({
        receiptNo: 'A',
        direction: 'in',
        amount: 500000,
        balanceAfter: 1500000
      }),
      buildTransaction({
        receiptNo: 'B',
        direction: 'out',
        amount: 200000,
        balanceAfter: 1000000
      })
    ];

    const result = verifyBalance(transactions, 1000000);

    expect(result.isVerified).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].detail).toContain('B');
    expect(result.issues[0].detail).toContain('3000.00'); // the missing amount
    // The structured facts must match the arithmetic, since the plain-language
    // explanation is built from them rather than from the text above.
    expect(result.issues[0]).toMatchObject({
      code: 'balance_mismatch',
      receiptNo: 'B',
      expectedBalanceInCents: 1300000,
      printedBalanceInCents: 1000000
    });
  });

  it('detects a direction that was read the wrong way round', () => {
    const transactions = [
      buildTransaction({
        receiptNo: 'A',
        direction: 'in',
        amount: 200000,
        balanceAfter: 800000
      })
    ];

    const result = verifyBalance(transactions, 1000000);

    expect(result.isVerified).toBe(false);
    expect(result.issues[0].detail).toContain('A');
  });

  it('reports one issue per break, not a cascade', () => {
    const transactions = [
      buildTransaction({
        receiptNo: 'A',
        direction: 'out',
        amount: 100000,
        balanceAfter: 500000
      }), // break
      buildTransaction({
        receiptNo: 'B',
        direction: 'out',
        amount: 100000,
        balanceAfter: 400000
      }), // fine
      buildTransaction({
        receiptNo: 'C',
        direction: 'out',
        amount: 100000,
        balanceAfter: 300000
      }) // fine
    ];

    const result = verifyBalance(transactions, 1000000);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].detail).toContain('A');
  });

  it('verifies an empty statement trivially', () => {
    expect(verifyBalance([], 1000000).isVerified).toBe(true);
  });

  it('verifies a bundle that prints one balance on both rows', () => {
    // opening 4,357; -400 and -7 settle together, both rows print 3,950
    const transactions = [
      buildTransaction({
        receiptNo: 'SAMPLE0A01',
        direction: 'out',
        amount: 40000,
        balanceAfter: 395000
      }),
      buildTransaction({
        receiptNo: 'SAMPLE0A01',
        direction: 'out',
        amount: 700,
        balanceAfter: 395000
      })
    ];

    const result = verifyBalance(transactions, 435700);

    expect(result.isVerified).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('still catches a wrong amount inside a bundle', () => {
    const transactions = [
      buildTransaction({
        receiptNo: 'X',
        direction: 'out',
        amount: 50000,
        balanceAfter: 395000
      }),
      buildTransaction({
        receiptNo: 'X',
        direction: 'out',
        amount: 700,
        balanceAfter: 395000
      })
    ];

    expect(verifyBalance(transactions, 435700).isVerified).toBe(false);
  });

  it('does not group same-receipt rows with different balances', () => {
    // transfers settle row by row, unlike the bundled paybill case
    const transactions = [
      buildTransaction({
        receiptNo: 'Y',
        direction: 'out',
        amount: 40000,
        balanceAfter: 395700
      }),
      buildTransaction({
        receiptNo: 'Y',
        direction: 'out',
        amount: 700,
        balanceAfter: 395000
      })
    ];

    expect(verifyBalance(transactions, 435700).isVerified).toBe(true);
  });
});
