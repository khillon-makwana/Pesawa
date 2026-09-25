// Gives this file a working IndexedDB. Must come before the storage imports.
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach } from 'vitest';
import type { ParseResult, Transaction } from '@/lib/parser/types';
import { buildBackupFile, parseBackupFile, importBackup } from '../backup-file';
import {
  saveStatement,
  listSavedStatements,
  loadAllTransactions,
  deleteAllSavedData
} from '../saved-statements';
import { resetForTests } from '../statement-database';
import { BACKUP_SCHEMA_VERSION } from '../types';

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    receiptNo: 'UH00000001',
    completedAt: '2026-08-27T16:18:02.000Z',
    detailsRaw: 'Customer Transfer to - 0712345678 ASHA WAMBUI',
    type: 'send_money',
    direction: 'out',
    amount: 40000,
    balanceAfter: 100000,
    isRevenue: false,
    counterpartyName: 'ASHA WAMBUI',
    counterpartyPhone: '0712345678',
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

describe('export and import round trip', () => {
  it('restores the same statements and transactions', async () => {
    await saveStatement(
      buildParseResult([
        buildTransaction({ receiptNo: 'AAA' }),
        buildTransaction({ receiptNo: 'BBB', amount: 12345 })
      ]),
      'august.pdf'
    );

    const exported = await buildBackupFile();
    const fileContents = JSON.stringify(exported);

    await deleteAllSavedData();
    expect(await loadAllTransactions()).toEqual([]);

    const parsed = parseBackupFile(fileContents);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    await importBackup(parsed.backup);

    const statements = await listSavedStatements();
    const transactions = await loadAllTransactions();

    expect(statements).toHaveLength(1);
    expect(statements[0].fileName).toBe('august.pdf');
    expect(transactions).toHaveLength(2);
    expect(transactions.map(t => t.receiptNo).sort()).toEqual(['AAA', 'BBB']);
  });

  it('keeps amounts as exact integer cents', async () => {
    await saveStatement(
      buildParseResult([buildTransaction({ amount: 12345, balanceAfter: 999999 })]),
      'august.pdf'
    );

    const backup = await buildBackupFile();
    await deleteAllSavedData();

    const parsed = parseBackupFile(JSON.stringify(backup));
    if (!parsed.ok) throw new Error(parsed.error);
    await importBackup(parsed.backup);

    const [transaction] = await loadAllTransactions();
    expect(transaction.amount).toBe(12345);
    expect(transaction.balanceAfter).toBe(999999);
  });

  it('carries the schema version', async () => {
    const backup = await buildBackupFile();
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
  });

  it('adds to what is already saved rather than replacing it', async () => {
    await saveStatement(
      buildParseResult([buildTransaction({ receiptNo: 'FROM_BACKUP' })]),
      'august.pdf'
    );
    const backup = await buildBackupFile();

    await deleteAllSavedData();
    await saveStatement(
      buildParseResult([buildTransaction({ receiptNo: 'SAVED_SINCE' })]),
      'september.pdf'
    );

    const parsed = parseBackupFile(JSON.stringify(backup));
    if (!parsed.ok) throw new Error(parsed.error);
    await importBackup(parsed.backup);

    const receipts = (await loadAllTransactions()).map(t => t.receiptNo).sort();
    expect(receipts).toEqual(['FROM_BACKUP', 'SAVED_SINCE']);
  });
});

describe('rejecting a file that is not a backup', () => {
  it('rejects text that is not JSON', () => {
    const outcome = parseBackupFile('this is not json');

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toMatch(/not valid JSON/i);
  });

  it('rejects JSON that is missing the transactions list', () => {
    const outcome = parseBackupFile(
      JSON.stringify({ schemaVersion: 1, exportedAt: '2026-09-25', statements: [] })
    );

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toMatch(/does not look like a Pesawa backup/i);
  });

  it('names where the problem is', () => {
    const outcome = parseBackupFile(
      JSON.stringify({
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: '2026-09-25',
        statements: [],
        transactions: [{ key: 'k', statementIds: [] }]
      })
    );

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toMatch(/transactions\.0/);
  });

  it('rejects a backup written by a different schema version', () => {
    const outcome = parseBackupFile(
      JSON.stringify({
        schemaVersion: BACKUP_SCHEMA_VERSION + 1,
        exportedAt: '2026-09-25',
        statements: [],
        transactions: []
      })
    );

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error).toMatch(/different version of Pesawa/i);
  });

  it('rejects an amount that is not integer cents', () => {
    const outcome = parseBackupFile(
      JSON.stringify({
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: '2026-09-25',
        statements: [],
        transactions: [{ ...buildTransaction({ amount: 400.5 }), key: 'k', statementIds: [] }]
      })
    );

    expect(outcome.ok).toBe(false);
  });
});
