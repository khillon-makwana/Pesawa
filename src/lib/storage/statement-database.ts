import { openDB, type IDBPDatabase } from 'idb';
import type { SavedStatement, StoredTransaction } from './types';

const DATABASE_NAME = 'pesawa';
const DATABASE_VERSION = 1;

export const STATEMENT_STORE = 'statements';
export const TRANSACTION_STORE = 'transactions';

/**
 * Where the data actually lives right now.
 *
 * `session-only` means IndexedDB could not be opened — private browsing blocks
 * it in some browsers — so everything is held in memory and lost on reload.
 * The UI shows a notice in that case rather than pretending a save persisted.
 */
export type StorageMode = 'indexeddb' | 'session-only';

let storageMode: StorageMode = 'indexeddb';

/*
 * The in-memory stand-in used when IndexedDB is unavailable. Two plain Maps,
 * mirroring the two object stores. This file handles the fallback itself so
 * that every caller can ignore the difference.
 */
const memoryStatements = new Map<string, SavedStatement>();
const memoryTransactions = new Map<string, StoredTransaction>();

let databasePromise: Promise<IDBPDatabase | null> | null = null;

function openStatementDatabase(): Promise<IDBPDatabase | null> {
  if (databasePromise !== null) {
    return databasePromise;
  }

  databasePromise = (async () => {
    if (typeof indexedDB === 'undefined') {
      storageMode = 'session-only';
      return null;
    }

    try {
      return await openDB(DATABASE_NAME, DATABASE_VERSION, {
        upgrade(database) {
          database.createObjectStore(STATEMENT_STORE, { keyPath: 'id' });

          const transactions = database.createObjectStore(TRANSACTION_STORE, {
            keyPath: 'key'
          });

          // multiEntry, so one row is indexed under each statement that
          // contains it. That is what makes "the rows of statement X" a
          // lookup rather than a scan of everything.
          transactions.createIndex('statementIds', 'statementIds', {
            multiEntry: true
          });
        }
      });
    } catch {
      storageMode = 'session-only';
      return null;
    }
  })();

  return databasePromise;
}

/** Call after any read or write to find out which mode that call used. */
export function getStorageMode(): StorageMode {
  return storageMode;
}

export async function readAllStatements(): Promise<SavedStatement[]> {
  const database = await openStatementDatabase();

  if (database === null) {
    return [...memoryStatements.values()];
  }

  return database.getAll(STATEMENT_STORE);
}

export async function readAllTransactions(): Promise<StoredTransaction[]> {
  const database = await openStatementDatabase();

  if (database === null) {
    return [...memoryTransactions.values()];
  }

  return database.getAll(TRANSACTION_STORE);
}

/**
 * Writes a statement and its transactions together.
 *
 * One IndexedDB transaction covers both stores, because a statement whose rows
 * failed to write would corrupt every total derived from it.
 */
export async function writeStatementWithTransactions(
  statement: SavedStatement,
  transactions: StoredTransaction[]
): Promise<void> {
  const database = await openStatementDatabase();

  if (database === null) {
    memoryStatements.set(statement.id, statement);
    for (const transaction of transactions) {
      memoryTransactions.set(transaction.key, transaction);
    }
    return;
  }

  const writeTransaction = database.transaction(
    [STATEMENT_STORE, TRANSACTION_STORE],
    'readwrite'
  );

  await Promise.all([
    writeTransaction.objectStore(STATEMENT_STORE).put(statement),
    ...transactions.map(transaction =>
      writeTransaction.objectStore(TRANSACTION_STORE).put(transaction)
    ),
    writeTransaction.done
  ]);
}

export async function deleteStatementRecord(statementId: string): Promise<void> {
  const database = await openStatementDatabase();

  if (database === null) {
    memoryStatements.delete(statementId);
    return;
  }

  await database.delete(STATEMENT_STORE, statementId);
}

export async function writeTransaction(transaction: StoredTransaction): Promise<void> {
  const database = await openStatementDatabase();

  if (database === null) {
    memoryTransactions.set(transaction.key, transaction);
    return;
  }

  await database.put(TRANSACTION_STORE, transaction);
}

export async function deleteTransactionRecord(key: string): Promise<void> {
  const database = await openStatementDatabase();

  if (database === null) {
    memoryTransactions.delete(key);
    return;
  }

  await database.delete(TRANSACTION_STORE, key);
}

export async function deleteEverything(): Promise<void> {
  const database = await openStatementDatabase();

  memoryStatements.clear();
  memoryTransactions.clear();

  if (database === null) {
    return;
  }

  const clearTransaction = database.transaction(
    [STATEMENT_STORE, TRANSACTION_STORE],
    'readwrite'
  );

  await Promise.all([
    clearTransaction.objectStore(STATEMENT_STORE).clear(),
    clearTransaction.objectStore(TRANSACTION_STORE).clear(),
    clearTransaction.done
  ]);
}

/** Only for tests, which need each case to start from an empty database. */
export async function resetForTests(): Promise<void> {
  const database = await openStatementDatabase();
  database?.close();
  databasePromise = null;
  storageMode = 'indexeddb';
  memoryStatements.clear();
  memoryTransactions.clear();
}
