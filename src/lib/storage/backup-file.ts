import { z } from 'zod';
import { ISSUE_CODES, TRANSACTION_TYPES } from '@/lib/parser/types';
import { BACKUP_SCHEMA_VERSION, type BackupFile } from './types';
import {
  readAllStatements,
  readAllTransactions,
  writeStatementWithTransactions
} from './statement-database';

const parseIssueSchema = z.object({
  type: z.enum(['unparsed_row', 'balance_break', 'unknown_type']),
  page: z.number().nullable(),
  rawText: z.string().nullable(),
  detail: z.string(),

  // All optional: backups made before issues carried codes have none of these,
  // and must still import. Listed rather than left out, because Zod drops any
  // field it is not told about — a restored issue would lose its code and fall
  // back to the technical wording.
  code: z.enum(ISSUE_CODES).optional(),
  receiptNo: z.string().optional(),
  status: z.string().optional(),
  rowCount: z.number().int().optional(),
  amountInCents: z.number().int().optional(),
  expectedBalanceInCents: z.number().int().optional(),
  printedBalanceInCents: z.number().int().optional()
});

const storedTransactionSchema = z.object({
  key: z.string(),
  statementIds: z.array(z.string()),
  receiptNo: z.string(),
  completedAt: z.string(),
  detailsRaw: z.string(),
  // The parser's own list, so a hand-edited file cannot introduce a type the
  // rest of the app has no handling for.
  type: z.enum(TRANSACTION_TYPES),
  direction: z.enum(['in', 'out']),
  // Money is integer cents everywhere, including in a backup file. A decimal
  // here would mean the file was written by something other than this app.
  amount: z.number().int(),
  balanceAfter: z.number().int(),
  isRevenue: z.boolean(),
  counterpartyName: z.string().nullable(),
  counterpartyPhone: z.string().nullable(),
  chargeForReceipt: z.string().nullable(),
  reversesReceipt: z.string().nullable(),
  confidence: z.enum(['high', 'low']),
  sourcePage: z.number()
});

const savedStatementSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  savedAt: z.string(),
  transactionCount: z.number(),
  openingBalance: z.number().int(),
  closingBalance: z.number().int(),
  balanceVerified: z.boolean(),
  parserVersion: z.string(),
  issues: z.array(parseIssueSchema)
});

const backupFileSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  statements: z.array(savedStatementSchema),
  transactions: z.array(storedTransactionSchema)
});

/** Everything currently saved, ready to be written to a .json file. */
export async function buildBackupFile(): Promise<BackupFile> {
  const [statements, transactions] = await Promise.all([
    readAllStatements(),
    readAllTransactions()
  ]);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    statements,
    transactions
  };
}

export type BackupParseOutcome =
  { ok: true; backup: BackupFile } | { ok: false; error: string };

/**
 * Reads a backup file's text and checks it really is one.
 *
 * Every failure returns a message worth showing to someone, because the usual
 * cause is picking the wrong file rather than a corrupted one.
 */
export function parseBackupFile(fileContents: string): BackupParseOutcome {
  let rawData: unknown;

  try {
    rawData = JSON.parse(fileContents);
  } catch {
    return {
      ok: false,
      error: 'This file is not valid JSON, so it is not a Pesawa backup.'
    };
  }

  const parsed = backupFileSchema.safeParse(rawData);

  if (!parsed.success) {
    const firstProblem = parsed.error.issues[0];
    const location = firstProblem.path.join('.');

    return {
      ok: false,
      error: location
        ? `This does not look like a Pesawa backup: ${firstProblem.message} at "${location}".`
        : `This does not look like a Pesawa backup: ${firstProblem.message}.`
    };
  }

  if (parsed.data.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error:
        `This backup was made by a different version of Pesawa ` +
        `(file version ${parsed.data.schemaVersion}, this app reads ${BACKUP_SCHEMA_VERSION}).`
    };
  }

  return { ok: true, backup: parsed.data as BackupFile };
}

/**
 * Writes a validated backup into storage, alongside anything already saved.
 *
 * Importing adds to what is there rather than replacing it, so restoring a
 * backup onto a device that has been used since does not lose the newer work.
 * Rows already present keep their own statement ids and gain the imported ones.
 */
export async function importBackup(backup: BackupFile): Promise<void> {
  const existing = await readAllTransactions();
  const existingByKey = new Map(existing.map(row => [row.key, row]));

  for (const statement of backup.statements) {
    const rowsForStatement = backup.transactions
      .filter(transaction => transaction.statementIds.includes(statement.id))
      .map(transaction => {
        const alreadySaved = existingByKey.get(transaction.key);

        if (alreadySaved === undefined) {
          return transaction;
        }

        return {
          ...alreadySaved,
          statementIds: mergeStatementIds(
            alreadySaved.statementIds,
            transaction.statementIds
          )
        };
      });

    await writeStatementWithTransactions(statement, rowsForStatement);
  }
}

function mergeStatementIds(current: string[], incoming: string[]): string[] {
  return [...new Set([...current, ...incoming])];
}
