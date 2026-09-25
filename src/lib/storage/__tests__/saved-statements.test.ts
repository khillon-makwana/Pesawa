// Gives this file a working IndexedDB. Must come before the storage imports.
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach } from 'vitest';
import type { ParseResult, Transaction } from '@/lib/parser/types';
import {
  saveStatement,
  listSavedStatements,
  loadAllTransactions,
  loadParentReceiptNumbers,
  deleteStatement,
  deleteAllSavedData
} from '../saved-statements';
import { resetForTests } from '../statement-database';

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

function buildParseResult(transactions: Transaction[]): ParseResult {
  return {
    meta: {
      periodStart: transactions[0]?.completedAt ?? '',
      periodEnd: transactions[transactions.length - 1]?.completedAt ?? '',
      openingBalance: 0,
      closingBalance: 100000,
      accountLabel: null,
      balanceVerified: true,
      parserVersion: '0.1.0'
    },
    transactions,
    issues: []
  };
}

beforeEach(async () => {
  await resetForTests();
  await deleteAllSavedData();
});

describe('saveStatement', () => {
  it('saves a statement and its transactions', async () => {
    const result = await saveStatement(
      buildParseResult([
        buildTransaction({ receiptNo: 'AAA' }),
        buildTransaction({ receiptNo: 'BBB' })
      ]),
      'august.pdf'
    );

    expect(result.savedCount).toBe(2);
    expect(result.duplicateCount).toBe(0);

    const statements = await listSavedStatements();
    expect(statements).toHaveLength(1);
    expect(statements[0].fileName).toBe('august.pdf');
    expect(statements[0].transactionCount).toBe(2);

    expect(await loadAllTransactions()).toHaveLength(2);
  });

  it('never stores the PDF or its password', async () => {
    await saveStatement(buildParseResult([buildTransaction()]), 'august.pdf');

    const [statement] = await listSavedStatements();
    const storedFields = Object.keys(statement).join(' ');

    expect(storedFields).not.toMatch(/password|pdf|bytes|file(?!Name)/i);
  });

  it('skips rows already saved by an earlier statement', async () => {
    const shared = buildTransaction({ receiptNo: 'SHARED' });

    await saveStatement(buildParseResult([shared]), 'august.pdf');
    const second = await saveStatement(
      buildParseResult([shared, buildTransaction({ receiptNo: 'NEW' })]),
      'september.pdf'
    );

    expect(second.savedCount).toBe(1);
    expect(second.duplicateCount).toBe(1);
    expect(await loadAllTransactions()).toHaveLength(2);
  });

  it('adds nothing when the same statement is saved again', async () => {
    const statement = buildParseResult([
      buildTransaction({ receiptNo: 'AAA', type: 'send_money', amount: 40000 }),
      buildTransaction({ receiptNo: 'AAA', type: 'charge', amount: 700 }),
      buildTransaction({ receiptNo: 'BBB', type: 'paybill_payment', amount: 150000 })
    ]);

    await saveStatement(statement, 'august.pdf');
    const second = await saveStatement(statement, 'august.pdf');

    expect(second.savedCount).toBe(0);
    expect(second.duplicateCount).toBe(3);
    expect(await loadAllTransactions()).toHaveLength(3);
  });

  it('keeps both of two identical charges, and still dedupes on re-import', async () => {
    // Same receipt, same type, same tariff. Two real rows, not one.
    const statement = buildParseResult([
      buildTransaction({ receiptNo: 'SAMPLE0A01', type: 'send_money', amount: 40000 }),
      buildTransaction({ receiptNo: 'SAMPLE0A01', type: 'charge', amount: 700 }),
      buildTransaction({ receiptNo: 'SAMPLE0A01', type: 'charge', amount: 700 })
    ]);

    const first = await saveStatement(statement, 'august.pdf');
    expect(first.savedCount).toBe(3);
    expect(await loadAllTransactions()).toHaveLength(3);

    const second = await saveStatement(statement, 'august.pdf');
    expect(second.savedCount).toBe(0);
    expect(await loadAllTransactions()).toHaveLength(3);
  });

  it('keeps a charge that shares its parent receipt number', async () => {
    await saveStatement(
      buildParseResult([
        buildTransaction({ receiptNo: 'SAMPLE0A01', type: 'send_money', amount: 40000 }),
        buildTransaction({ receiptNo: 'SAMPLE0A01', type: 'charge', amount: 700 })
      ]),
      'august.pdf'
    );

    expect(await loadAllTransactions()).toHaveLength(2);
  });

  it('returns transactions oldest first regardless of save order', async () => {
    await saveStatement(
      buildParseResult([
        buildTransaction({ receiptNo: 'LATER', completedAt: '2026-09-02T10:00:00.000Z' })
      ]),
      'september.pdf'
    );
    await saveStatement(
      buildParseResult([
        buildTransaction({
          receiptNo: 'EARLIER',
          completedAt: '2026-08-01T10:00:00.000Z'
        })
      ]),
      'august.pdf'
    );

    const transactions = await loadAllTransactions();
    expect(transactions.map(t => t.receiptNo)).toEqual(['EARLIER', 'LATER']);
  });
});

describe('loadParentReceiptNumbers', () => {
  it('includes ordinary transactions but not charges', async () => {
    await saveStatement(
      buildParseResult([
        buildTransaction({ receiptNo: 'PARENT', type: 'send_money', amount: 40000 }),
        buildTransaction({ receiptNo: 'ORPHAN', type: 'charge', amount: 700 })
      ]),
      'august.pdf'
    );

    const receipts = await loadParentReceiptNumbers();

    expect(receipts.has('PARENT')).toBe(true);
    // A charge must not count as its own parent.
    expect(receipts.has('ORPHAN')).toBe(false);
  });
});

describe('deleteStatement', () => {
  it('removes the statement and the rows only it contained', async () => {
    const { statementId } = await saveStatement(
      buildParseResult([buildTransaction({ receiptNo: 'AAA' })]),
      'august.pdf'
    );

    await deleteStatement(statementId);

    expect(await listSavedStatements()).toHaveLength(0);
    expect(await loadAllTransactions()).toHaveLength(0);
  });

  it('keeps rows that an overlapping statement still contains', async () => {
    const sharedRow = buildTransaction({ receiptNo: 'SHARED' });
    const augustOnly = buildTransaction({ receiptNo: 'AUGUST_ONLY' });
    const septemberOnly = buildTransaction({ receiptNo: 'SEPTEMBER_ONLY' });

    const august = await saveStatement(
      buildParseResult([augustOnly, sharedRow]),
      'august.pdf'
    );
    await saveStatement(buildParseResult([sharedRow, septemberOnly]), 'september.pdf');

    await deleteStatement(august.statementId);

    const remaining = await loadAllTransactions();
    const receipts = remaining.map(transaction => transaction.receiptNo).sort();

    // September's rows are both intact: the one it shared with August survived
    // the delete, and the one only it had was never at risk.
    expect(receipts).toEqual(['SEPTEMBER_ONLY', 'SHARED']);
    expect(await listSavedStatements()).toHaveLength(1);
  });
});

describe('deleteAllSavedData', () => {
  it('leaves nothing behind', async () => {
    await saveStatement(buildParseResult([buildTransaction()]), 'august.pdf');
    await saveStatement(
      buildParseResult([buildTransaction({ receiptNo: 'BBB' })]),
      'september.pdf'
    );

    await deleteAllSavedData();

    expect(await listSavedStatements()).toEqual([]);
    expect(await loadAllTransactions()).toEqual([]);
  });
});
