import { describe, it, expect } from 'vitest';
import { summarisePaymentTiming } from '../summarise-payment-timing';
import type { Transaction } from '../../parser/types';

function buildTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    receiptNo: 'UH00000001',
    completedAt: '2026-08-27T16:18:02.000Z', // 19:18 EAT, a Thursday
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

describe('summarisePaymentTiming', () => {
  it('buckets a transaction into its East Africa Time hour', () => {
    const summary = summarisePaymentTiming([
      buildTransaction({ completedAt: '2026-08-27T16:18:02.000Z' }) // 19:18 EAT
    ]);

    expect(summary.byHour[19].transactionCount).toBe(1);
    expect(summary.busiestHourLabel).toBe('7pm');
  });

  it('buckets a transaction into its weekday, Monday first', () => {
    const summary = summarisePaymentTiming([
      buildTransaction({ completedAt: '2026-08-27T16:18:02.000Z' }) // Thursday
    ]);

    expect(summary.byWeekday[3].label).toBe('Thursday');
    expect(summary.byWeekday[3].transactionCount).toBe(1);
    expect(summary.busiestWeekdayLabel).toBe('Thursday');
  });

  it('handles a transaction that crosses midnight in local time', () => {
    // 22:30 UTC is 01:30 EAT the next day
    const summary = summarisePaymentTiming([
      buildTransaction({ completedAt: '2026-08-27T22:30:00.000Z' })
    ]);

    expect(summary.byHour[1].transactionCount).toBe(1);
    expect(summary.busiestWeekdayLabel).toBe('Friday'); // not Thursday
  });

  it('excludes charges so parent timestamps are not counted twice', () => {
    const summary = summarisePaymentTiming([
      buildTransaction({ type: 'send_money', completedAt: '2026-08-27T07:19:58.000Z' }),
      buildTransaction({ type: 'charge', completedAt: '2026-08-27T07:19:58.000Z' })
    ]);

    expect(summary.byHour[10].transactionCount).toBe(1);
  });

  it('always returns 24 hour buckets and 7 weekday buckets', () => {
    const summary = summarisePaymentTiming([buildTransaction({})]);

    expect(summary.byHour).toHaveLength(24);
    expect(summary.byWeekday).toHaveLength(7);
  });

  it('totals value as well as count', () => {
    const summary = summarisePaymentTiming([
      buildTransaction({ completedAt: '2026-08-27T16:00:00.000Z', amount: 40000 }),
      buildTransaction({ completedAt: '2026-08-27T16:30:00.000Z', amount: 60000 })
    ]);

    expect(summary.byHour[19].totalInCents).toBe(100000);
  });

  it('reports no busiest bucket for an empty statement', () => {
    const summary = summarisePaymentTiming([]);

    expect(summary.busiestHourLabel).toBeNull();
    expect(summary.busiestWeekdayLabel).toBeNull();
  });
});
