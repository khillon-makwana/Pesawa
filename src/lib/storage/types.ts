import type { Transaction, ParseIssue } from '@/lib/parser/types';

/**
 * Bumped whenever the shape of a backup file changes. Import checks it and
 * refuses a file it does not understand, rather than half-reading it.
 */
export const BACKUP_SCHEMA_VERSION = 1;

/**
 * What we keep about a statement the user chose to save.
 *
 * The PDF and its password are deliberately absent. Neither is ever written to
 * storage — the parsed rows are all the app needs, and keeping the source file
 * would undo the point of parsing in the browser.
 */
export interface SavedStatement {
  id: string;
  fileName: string;
  periodStart: string; // ISO 8601
  periodEnd: string;
  savedAt: string;
  transactionCount: number;
  openingBalance: number; // CENTS
  closingBalance: number; // CENTS
  balanceVerified: boolean;
  parserVersion: string;
  issues: ParseIssue[];
}

/**
 * A transaction as stored, which is a parsed transaction plus the statements it
 * came from.
 *
 * `statementIds` is a list rather than a single id because two statements with
 * overlapping date ranges genuinely contain the same row. Deleting one of them
 * must not remove a row the other still needs, so the id is removed from this
 * list and the row itself is deleted only once the list is empty.
 */
export interface StoredTransaction extends Transaction {
  key: string;
  statementIds: string[];
}

/** The whole local database, as written to a backup file. */
export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  statements: SavedStatement[];
  transactions: StoredTransaction[];
}
