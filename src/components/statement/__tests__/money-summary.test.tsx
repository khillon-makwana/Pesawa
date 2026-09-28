import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Transaction } from '@/lib/parser/types';
import { MoneySummary } from '../money-summary';

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
    counterpartyName: null,
    counterpartyPhone: null,
    chargeForReceipt: null,
    reversesReceipt: null,
    confidence: 'high',
    sourcePage: 1,
    ...overrides
  };
}

/** The visible text, with tags stripped, so assertions read like the screen. */
function textOf(transactions: Transaction[]): string {
  return renderToStaticMarkup(<MoneySummary transactions={transactions} />)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

describe('MoneySummary', () => {
  it('shows money in and money out as the headline figures', () => {
    const text = textOf([
      buildTransaction({ type: 'payment_received', direction: 'in', amount: 9642000 }),
      buildTransaction({ type: 'send_money', direction: 'out', amount: 5351000 })
    ]);

    expect(text).toContain('Money in');
    expect(text).toContain('+KSh 96,420.00');
    expect(text).toContain('Money out');
    expect(text).toContain('−KSh 53,510.00');
    expect(text).toContain('KSh 42,910.00 more came in than went out.');
  });

  it('says how much of money in was deposits, loans or reversals', () => {
    const text = textOf([
      buildTransaction({ type: 'payment_received', direction: 'in', amount: 300000 }),
      buildTransaction({ type: 'agent_deposit', direction: 'in', amount: 200000 })
    ]);

    expect(text).toContain(
      'Includes KSh 2,000.00 of cash you deposited, Fuliza loans or reversals.'
    );
  });

  it('says nothing about deposits when there were none', () => {
    const text = textOf([
      buildTransaction({ type: 'payment_received', direction: 'in', amount: 300000 })
    ]);

    expect(text).not.toContain('deposited');
  });

  it('says how much of money out went to savings, and only then', () => {
    expect(
      textOf([
        buildTransaction({
          type: 'unit_trust_investment',
          direction: 'out',
          amount: 100000
        })
      ])
    ).toContain('Includes KSh 1,000.00 moved to savings.');

    expect(textOf([buildTransaction()])).not.toContain('savings');
  });

  it('reports more going out than coming in', () => {
    const text = textOf([
      buildTransaction({ type: 'payment_received', direction: 'in', amount: 10000 }),
      buildTransaction({ direction: 'out', amount: 40000 })
    ]);

    expect(text).toContain('KSh 300.00 more went out than came in.');
  });

  it('does not put a sign on a zero total', () => {
    const text = textOf([buildTransaction({ direction: 'out', amount: 40000 })]);

    // Money in is zero here: "+KSh 0.00" would suggest something came in.
    expect(text).toContain('Money in KSh 0.00');
    expect(text).not.toContain('+KSh 0.00');
  });

  it('renders nothing for an empty statement', () => {
    expect(renderToStaticMarkup(<MoneySummary transactions={[]} />)).toBe('');
  });
});
