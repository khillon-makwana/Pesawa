import { describe, it, expect } from 'vitest';
import { rankCounterparties } from '../rank-counterparties';
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
    counterpartyName: 'JANE DOE',
    counterpartyPhone: '254712345678',
    chargeForReceipt: null,
    reversesReceipt: null,
    confidence: 'high',
    sourcePage: 1,
    ...overrides
  };
}

describe('rankCounterparties', () => {
  it('groups repeat transactions with the same party', () => {
    const [jane] = rankCounterparties([
      buildTransaction({ counterpartyName: 'JANE DOE', amount: 40000 }),
      buildTransaction({ counterpartyName: 'JANE DOE', amount: 60000 })
    ]);

    expect(jane.transactionCount).toBe(2);
    expect(jane.totalPaidInCents).toBe(100000);
  });

  it('groups names that differ only in casing or punctuation', () => {
    const rankings = rankCounterparties([
      buildTransaction({ counterpartyName: 'Alice Mutiso' }),
      buildTransaction({ counterpartyName: 'ALICE MUTISO' }),
      buildTransaction({ counterpartyName: "SAM NG'ONG'A" }),
      buildTransaction({ counterpartyName: 'SAM NGONGA' })
    ]);

    expect(rankings).toHaveLength(2);
  });

  it('keeps the first spelling for display', () => {
    const [first] = rankCounterparties([
      buildTransaction({ counterpartyName: 'Alice Mutiso' }),
      buildTransaction({ counterpartyName: 'ALICE MUTISO' })
    ]);

    expect(first.displayName).toBe('Alice Mutiso');
  });

  it('ranks by gross value, so a party is not cancelled out by netting', () => {
    const rankings = rankCounterparties([
      buildTransaction({ counterpartyName: 'BIG', direction: 'out', amount: 500000 }),
      buildTransaction({ counterpartyName: 'BIG', direction: 'in', amount: 500000 }),
      buildTransaction({ counterpartyName: 'SMALL', direction: 'out', amount: 100000 })
    ]);

    expect(rankings[0].displayName).toBe('BIG');
    expect(rankings[0].netInCents).toBe(0);
  });

  it('tracks money in and out separately', () => {
    const [party] = rankCounterparties([
      buildTransaction({ counterpartyName: 'X', direction: 'out', amount: 30000 }),
      buildTransaction({ counterpartyName: 'X', direction: 'in', amount: 50000 })
    ]);

    expect(party.totalPaidInCents).toBe(30000);
    expect(party.totalReceivedInCents).toBe(50000);
    expect(party.netInCents).toBe(20000);
  });

  it('records the first and last time a party appears', () => {
    const [party] = rankCounterparties([
      buildTransaction({
        counterpartyName: 'X',
        completedAt: '2026-08-27T10:00:00.000Z'
      }),
      buildTransaction({
        counterpartyName: 'X',
        completedAt: '2026-08-01T10:00:00.000Z'
      }),
      buildTransaction({ counterpartyName: 'X', completedAt: '2026-08-15T10:00:00.000Z' })
    ]);

    expect(party.firstSeenAt).toBe('2026-08-01T10:00:00.000Z');
    expect(party.lastSeenAt).toBe('2026-08-27T10:00:00.000Z');
  });

  it('excludes charges and transactions with no counterparty', () => {
    const rankings = rankCounterparties([
      buildTransaction({ type: 'charge', counterpartyName: null, amount: 700 }),
      buildTransaction({ type: 'airtime', counterpartyName: null, amount: 5000 }),
      buildTransaction({ counterpartyName: 'JANE DOE' })
    ]);

    expect(rankings).toHaveLength(1);
    expect(rankings[0].displayName).toBe('JANE DOE');
  });

  it('handles an empty statement', () => {
    expect(rankCounterparties([])).toEqual([]);
  });

  describe('when two parties normalise to the same name', () => {
    it('keeps them apart by phone number', () => {
      const rankings = rankCounterparties([
        buildTransaction({
          counterpartyName: 'JOHN KAMAU',
          counterpartyPhone: '254712345678',
          amount: 50000
        }),
        buildTransaction({
          counterpartyName: 'JOHN KAMAU',
          counterpartyPhone: '254799999999',
          amount: 20000
        })
      ]);

      expect(rankings).toHaveLength(2);
      expect(rankings.map(party => party.phone).sort()).toEqual([
        '254712345678',
        '254799999999'
      ]);
      expect(new Set(rankings.map(party => party.key)).size).toBe(2);
    });

    it('still groups repeat transactions with the same person', () => {
      const rankings = rankCounterparties([
        buildTransaction({
          counterpartyName: 'JOHN KAMAU',
          counterpartyPhone: '254712345678',
          amount: 50000
        }),
        buildTransaction({
          counterpartyName: 'JOHN KAMAU',
          counterpartyPhone: '254712345678',
          amount: 10000
        }),
        buildTransaction({
          counterpartyName: 'JOHN KAMAU',
          counterpartyPhone: '254799999999',
          amount: 20000
        })
      ]);

      expect(rankings).toHaveLength(2);
      expect(rankings[0].transactionCount).toBe(2);
      expect(rankings[0].totalPaidInCents).toBe(60000);
    });
  });

  describe('when a name is not ambiguous', () => {
    it('groups rows with and without a phone number together', () => {
      // The same person: some rows carry the number, some do not. Splitting
      // these would be worse than the problem the phone tiebreaker solves.
      const rankings = rankCounterparties([
        buildTransaction({
          counterpartyName: 'NAIVAS SUPERMARKET',
          counterpartyPhone: null,
          amount: 50000
        }),
        buildTransaction({
          counterpartyName: 'NAIVAS SUPERMARKET',
          counterpartyPhone: '254712345678',
          amount: 10000
        })
      ]);

      expect(rankings).toHaveLength(1);
      expect(rankings[0].transactionCount).toBe(2);
      expect(rankings[0].phone).toBe('254712345678');
    });

    it('still groups names that differ only by punctuation or case', () => {
      const rankings = rankCounterparties([
        buildTransaction({ counterpartyName: "SAM NG'ONG'A", amount: 50000 }),
        buildTransaction({ counterpartyName: 'Sam Ngonga', amount: 10000 })
      ]);

      expect(rankings).toHaveLength(1);
      expect(rankings[0].transactionCount).toBe(2);
    });
  });
});
