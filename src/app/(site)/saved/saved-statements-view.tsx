'use client';

import { useEffect, useState } from 'react';
import type { Transaction } from '@/lib/parser/types';
import type { SavedStatement } from '@/lib/storage/types';
import {
  listSavedStatements,
  loadAllTransactions,
  deleteStatement,
  deleteAllSavedData
} from '@/lib/storage/saved-statements';
import { getStorageMode } from '@/lib/storage/statement-database';
import {
  buildBackupFile,
  parseBackupFile,
  importBackup
} from '@/lib/storage/backup-file';
import { downloadJson } from '@/lib/export/download-json';
import { StatementReport } from '@/components/statement/statement-report';
import { buildCombinedMeta } from '@/components/statement/combined-meta';
import { SavedStatementList, SavedStatementsEmptyState } from './saved-statement-list';
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
          <SavedStatementsEmptyState />
        ) : (
          <>
            <SavedStatementList
              statements={statements}
              onDeleteStatement={statementId => void handleDeleteStatement(statementId)}
              onDeleteAll={() => void handleDeleteAll()}
            />

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
