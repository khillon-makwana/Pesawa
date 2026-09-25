'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Transaction } from '@/lib/parser/types';
import type { SavedStatement } from '@/lib/storage/types';
import {
  listSavedStatements,
  loadAllTransactions,
  deleteStatement,
  deleteAllSavedData
} from '@/lib/storage/saved-statements';
import { getStorageMode } from '@/lib/storage/statement-database';
import { buildBackupFile, parseBackupFile, importBackup } from '@/lib/storage/backup-file';
import { downloadJson } from '@/lib/export/download-json';
import { StatementReport } from '@/components/statement/statement-report';
import {
  DateRangeFilter,
  filterByDateRange,
  WHOLE_RANGE,
  type DateRange
} from '@/components/statement/date-range-filter';
import { SiteContainer } from '@/components/site-container';
import { Button, buttonVariants } from '@/components/ui/button';
import { SessionOnlyNotice } from '@/components/storage-notice';

interface LoadedData {
  statements: SavedStatement[];
  transactions: Transaction[];
  isSessionOnly: boolean;
}

/**
 * Reads everything the page shows.
 *
 * The storage mode is read afterwards, because it is only known once a read has
 * actually tried to open IndexedDB.
 */
async function loadSavedData(): Promise<LoadedData> {
  const [statements, transactions] = await Promise.all([
    listSavedStatements(),
    loadAllTransactions()
  ]);

  return { statements, transactions, isSessionOnly: getStorageMode() === 'session-only' };
}

export function SavedStatementsView() {
  const [statements, setStatements] = useState<SavedStatement[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionOnly, setIsSessionOnly] = useState(false);
  const [range, setRange] = useState<DateRange>(WHOLE_RANGE);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  function applyLoaded(loaded: LoadedData) {
    setStatements(loaded.statements);
    setTransactions(loaded.transactions);
    setIsSessionOnly(loaded.isSessionOnly);
    setIsLoading(false);
  }

  async function reload() {
    applyLoaded(await loadSavedData());
  }

  useEffect(() => {
    // Ignore a load that finishes after this page has gone away.
    let isCurrent = true;

    void loadSavedData().then(loaded => {
      if (isCurrent) {
        applyLoaded(loaded);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleDeleteStatement(statementId: string) {
    await deleteStatement(statementId);
    await reload();
  }

  async function handleDeleteAll() {
    await deleteAllSavedData();
    setConfirmingDeleteAll(false);
    await reload();
  }

  async function handleExport() {
    const backup = await buildBackupFile();
    const today = new Date().toISOString().slice(0, 10);
    downloadJson(`pesawa-backup-${today}.json`, backup);
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    setImportMessage(null);

    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }

    const outcome = parseBackupFile(await file.text());

    // Let the same file be picked again after a failure.
    event.target.value = '';

    if (!outcome.ok) {
      setImportError(outcome.error);
      return;
    }

    await importBackup(outcome.backup);
    await reload();
    setImportMessage(
      `Imported ${outcome.backup.statements.length} statement${
        outcome.backup.statements.length === 1 ? '' : 's'
      }.`
    );
  }

  if (isLoading) {
    return (
      <main>
        <SiteContainer>
          <p className="py-24 text-center font-mono text-muted-foreground">
            Reading saved statements<span className="animate-pulse">▌</span>
          </p>
        </SiteContainer>
      </main>
    );
  }

  const visibleTransactions = filterByDateRange(transactions, range);

  return (
    <main>
      <SiteContainer className="py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted-foreground">Stored in this browser</p>
            <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight">
              Saved statements
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void handleExport()}>
              Export backup
            </Button>

            {/* A label rather than a button, so it drives the real file input. */}
            <label
              htmlFor="import-backup"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Import backup
            </label>
            <input
              id="import-backup"
              type="file"
              accept="application/json"
              onChange={event => void handleImport(event)}
              className="sr-only"
            />
          </div>
        </div>

        {isSessionOnly && <SessionOnlyNotice className="mt-6" />}

        {importError !== null && (
          <p
            className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            role="alert"
          >
            {importError}
          </p>
        )}

        {importMessage !== null && (
          <p className="mt-6 text-sm text-[var(--color-money-in)]">{importMessage}</p>
        )}

        {statements.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <section className="mt-8">
              <h2 className="eyebrow text-muted-foreground">
                {statements.length} statement{statements.length === 1 ? '' : 's'}
              </h2>

              <ul className="mt-3 space-y-2">
                {statements.map(statement => (
                  <StatementRow
                    key={statement.id}
                    statement={statement}
                    onDelete={() => void handleDeleteStatement(statement.id)}
                  />
                ))}
              </ul>

              <div className="mt-6 rounded-lg border border-destructive/30 p-4">
                {confirmingDeleteAll ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="flex-1 text-sm">
                      Delete every saved statement and transaction from this browser? This
                      cannot be undone.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setConfirmingDeleteAll(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => void handleDeleteAll()}>
                      Yes, delete everything
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="flex-1 text-sm text-muted-foreground">
                      Everything here is stored only in this browser.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmingDeleteAll(true)}
                    >
                      Delete all my data
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-10">
              <DateRangeFilter
                range={range}
                onChange={setRange}
                resultCount={visibleTransactions.length}
              />
            </section>

            {visibleTransactions.length === 0 ? (
              <p className="mt-8 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                No transactions fall in that date range.
              </p>
            ) : (
              <StatementReport
                meta={buildCombinedMeta(visibleTransactions, statements)}
                transactions={visibleTransactions}
                issues={statements.flatMap(statement => statement.issues)}
                heading="Across your saved statements"
              />
            )}
          </>
        )}
      </SiteContainer>
    </main>
  );
}

function StatementRow({
  statement,
  onDelete
}: {
  statement: SavedStatement;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="truncate font-medium">{statement.fileName}</p>
        <p className="tabular mt-1 font-mono text-xs text-muted-foreground">
          {formatDate(statement.periodStart)} – {formatDate(statement.periodEnd)} ·{' '}
          {statement.transactionCount} transactions · saved{' '}
          {formatDate(statement.savedAt)}
        </p>
      </div>

      <Button variant="outline" size="sm" onClick={onDelete}>
        Delete
      </Button>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center">
      <p className="text-muted-foreground">
        Nothing saved on this device yet. Open a statement and choose{' '}
        <strong className="font-medium text-foreground">Save on this device</strong> to
        keep it here.
      </p>
      <Link href="/" className={`${buttonVariants()} mt-5`}>
        Open a statement
      </Link>
    </div>
  );
}

/**
 * Describes the filtered set as if it were one statement.
 *
 * The opening balance is the first row's balance with its own effect undone,
 * the same reasoning the parser uses for a single file. `balanceVerified` means
 * every saved statement verified on its own — the walk is not re-run across
 * files, because statements can have gaps between them.
 */
function buildCombinedMeta(transactions: Transaction[], statements: SavedStatement[]) {
  const first = transactions[0];
  const last = transactions[transactions.length - 1];
  const firstEffect = first.direction === 'in' ? first.amount : -first.amount;

  return {
    periodStart: first.completedAt,
    periodEnd: last.completedAt,
    openingBalance: first.balanceAfter - firstEffect,
    closingBalance: last.balanceAfter,
    balanceVerified: statements.every(statement => statement.balanceVerified)
  };
}

function formatDate(isoTimestamp: string): string {
  if (isoTimestamp === '') {
    return 'unknown';
  }
  return isoTimestamp.slice(0, 10);
}
