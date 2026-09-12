import { describe, it, expect } from 'vitest';
import { buildTransactionsCsv, buildIssuesCsv } from '../build-transactions-csv';
import type { Transaction, ParseIssue } from '../../parser/types';

function buildTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    receiptNo: 'SAMPLE0A02',
    completedAt: '2026-06-04T15:25:10.000Z',
    detailsRaw: 'Customer Transfer to - 254798765432 JOHN DOE',
    type: 'send_money',
    direction: 'out',
    amount: 42000,
    balanceAfter: 281100,
    isRevenue: false,
    counterpartyName: 'JOHN DOE',
    counterpartyPhone: '254798765432',
    chargeForReceipt: null,
    reversesReceipt: null,
    confidence: 'high',
    sourcePage: 1,
    ...overrides
  };
}

describe('buildTransactionsCsv', () => {
  it('writes a header and one row per transaction', () => {
    const csv = buildTransactionsCsv([buildTransaction({}), buildTransaction({})]);
    const lines = csv.split('\r\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Receipt No');
  });

  it('writes amounts as decimals, not cents', () => {
    const csv = buildTransactionsCsv([buildTransaction({ amount: 184250 })]);

    expect(csv).toContain('1842.50');
    expect(csv).not.toContain('184250');
  });

  it('quotes a counterparty name containing a comma', () => {
    const csv = buildTransactionsCsv([
      buildTransaction({ counterpartyName: 'NAIVAS SUPERMARKET, KILIMANI' })
    ]);

    expect(csv).toContain('"NAIVAS SUPERMARKET, KILIMANI"');
  });

  it('doubles embedded quotes', () => {
    const csv = buildTransactionsCsv([
      buildTransaction({ counterpartyName: 'THE "BEST" SHOP' })
    ]);

    expect(csv).toContain('"THE ""BEST"" SHOP"');
  });

  it('flattens newlines in raw details so rows stay intact', () => {
    const csv = buildTransactionsCsv([
      buildTransaction({ detailsRaw: 'Merchant Payment to 5001234 -\nGREENFIELD UNIVERSITY' })
    ]);

    expect(csv.split('\r\n')).toHaveLength(2);
    expect(csv).toContain('Merchant Payment to 5001234 - GREENFIELD UNIVERSITY');
  });

  it('writes empty strings for missing optional fields', () => {
    const csv = buildTransactionsCsv([
      buildTransaction({ counterpartyName: null, counterpartyPhone: null })
    ]);

    expect(csv).toContain(',,');
  });

  it('splits the timestamp into date and time columns', () => {
    const csv = buildTransactionsCsv([
      buildTransaction({ completedAt: '2026-06-04T15:25:10.000Z' })
    ]);

    expect(csv).toContain('2026-06-04,15:25:10');
  });

  it('handles an empty list', () => {
    expect(buildTransactionsCsv([]).split('\r\n')).toHaveLength(1);
  });
});

describe('buildIssuesCsv', () => {
  it('writes one row per issue', () => {
    const issues: ParseIssue[] = [
      { type: 'balance_break', page: 2, rawText: null, detail: 'Balance break at UH123' }
    ];

    const csv = buildIssuesCsv(issues);

    expect(csv.split('\r\n')).toHaveLength(2);
    expect(csv).toContain('balance_break');
  });
});