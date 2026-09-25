'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SavedStatement } from '@/lib/storage/types';
import { Button, buttonVariants } from '@/components/ui/button';

/** The list of saved statements, with per-statement and delete-everything controls. */
export function SavedStatementList({
  statements,
  onDeleteStatement,
  onDeleteAll
}: {
  statements: SavedStatement[];
  onDeleteStatement: (statementId: string) => void;
  onDeleteAll: () => void;
}) {
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);

  return (
    <section className="mt-8">
      <h2 className="eyebrow text-muted-foreground">
        {statements.length} statement{statements.length === 1 ? '' : 's'}
      </h2>

      <ul className="mt-3 space-y-2">
        {statements.map(statement => (
          <StatementRow
            key={statement.id}
            statement={statement}
            onDelete={() => onDeleteStatement(statement.id)}
          />
        ))}
      </ul>

      <div className="mt-6 rounded-lg border border-destructive/30 p-4">
        {confirmingDeleteAll ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 text-sm">
              Delete every saved statement and transaction from this browser? This cannot
              be undone.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmingDeleteAll(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={onDeleteAll}>
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
  );
}

export function SavedStatementsEmptyState() {
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

function formatDate(isoTimestamp: string): string {
  if (isoTimestamp === '') {
    return 'unknown';
  }
  return isoTimestamp.slice(0, 10);
}
