// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Transaction } from '@/lib/parser/types';
import { TransactionList } from '../transaction-list';

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    receiptNo: 'SAMPLE0A01',
    completedAt: '2026-08-27T16:18:02.000Z',
    detailsRaw: '',
    type: 'send_money',
    direction: 'out',
    amount: 40000,
    balanceAfter: 100000,
    isRevenue: false,
    counterpartyName: 'ASHA WAMBUI',
    counterpartyPhone: '254712345678',
    chargeForReceipt: null,
    reversesReceipt: null,
    confidence: 'high',
    sourcePage: 1,
    ...overrides
  };
}

/*
 * React reports duplicate keys by logging, not by throwing, so the only way to
 * assert on them is to watch what it logs while it reconciles. A server render
 * is not enough — the warning comes from the real renderer.
 */
function renderAndCollectWarnings(transactions: Transaction[]): {
  container: HTMLElement;
  warnings: string[];
} {
  const warnings: string[] = [];
  const record = (...args: unknown[]) => warnings.push(args.map(String).join(' '));

  vi.spyOn(console, 'error').mockImplementation(record);
  vi.spyOn(console, 'warn').mockImplementation(record);

  const container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    createRoot(container).render(<TransactionList transactions={transactions} />);
  });

  return { container, warnings };
}

function duplicateKeyWarnings(warnings: string[]): string[] {
  return warnings.filter(message => /same key/i.test(message));
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('TransactionList keys', () => {
  it('renders two identical charges without duplicate keys', () => {
    // Same receipt, same type, same amount: two real rows that receipt and
    // type alone cannot tell apart.
    const charge = buildTransaction({
      receiptNo: 'SAMPLE0A01',
      type: 'charge',
      amount: 700,
      counterpartyName: null
    });

    const { warnings } = renderAndCollectWarnings([
      buildTransaction({ receiptNo: 'SAMPLE0A01', type: 'send_money', amount: 40000 }),
      charge,
      charge
    ]);

    expect(duplicateKeyWarnings(warnings)).toEqual([]);
  });

  it('renders a charge alongside its parent without duplicate keys', () => {
    const { warnings } = renderAndCollectWarnings([
      buildTransaction({ receiptNo: 'SAMPLE0A03', type: 'send_money', amount: 40000 }),
      buildTransaction({ receiptNo: 'SAMPLE0A03', type: 'charge', amount: 700 })
    ]);

    expect(duplicateKeyWarnings(warnings)).toEqual([]);
  });

  it('keeps both identical charges on screen', () => {
    const charge = buildTransaction({
      type: 'charge',
      amount: 700,
      counterpartyName: null
    });

    const { container } = renderAndCollectWarnings([charge, charge]);

    expect(container.textContent).toContain('Showing 2 of 2');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
  });
});
