'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  buildTransactionsCsv,
  buildIssuesCsv
} from '@/lib/export/build-transactions-csv';
import { downloadCsv } from '@/lib/export/download-csv';
import { saveStatement } from '@/lib/storage/saved-statements';
import { getStorageMode } from '@/lib/storage/statement-database';
import { StatementReport } from '@/components/statement/statement-report';
import { SiteContainer } from '@/components/site-container';
import { SessionOnlyNotice } from '@/components/storage-notice';
import { DownloadGlyph } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { useStatementSession, type OpenStatement } from '@/components/statement-session';

export function ReportView() {
  const { openStatement } = useStatementSession();

  return (
    <main>
      <SiteContainer>
        {openStatement === null ? (
          <NoStatementOpen />
        ) : (
          <StatementSummary statement={openStatement} />
        )}
      </SiteContainer>
    </main>
  );
}

/*
 * Reached by refreshing the report, opening its address directly, or coming
 * back to it in a new tab. The statement was only ever in memory, so it is
 * gone — which is the privacy promise working, not a fault.
 */
function NoStatementOpen() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        No statement is open
      </h1>
      <p className="mt-4 text-muted-foreground">
        Statements are read in your browser and aren&apos;t kept after a refresh or when
        you close the tab — unless you save them.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonVariants()}>
          Open a statement
        </Link>
        <Link href="/saved" className={buttonVariants({ variant: 'outline' })}>
          Saved statements
        </Link>
      </div>
    </div>
  );
}

/*
 * Saving is deliberately opt-in. Reading a statement shows you the report; it
 * does not put anything in storage until you ask for it here.
 *
 * Whether it was saved lives on the open statement rather than in this
 * component, so going Back and Forward does not bring the save button back —
 * pressing it again would store the same statement twice.
 */
type SaveProgress =
  { name: 'idle' } | { name: 'saving' } | { name: 'failed'; message: string };

function StatementSummary({ statement }: { statement: OpenStatement }) {
  const { setOpenStatement } = useStatementSession();
  const { result, fileName, saved } = statement;
  const { meta, transactions, issues } = result;
  const [progress, setProgress] = useState<SaveProgress>({ name: 'idle' });

  async function handleSave() {
    setProgress({ name: 'saving' });

    try {
      const outcome = await saveStatement(result, fileName);

      setOpenStatement({
        ...statement,
        saved: { ...outcome, isSessionOnly: getStorageMode() === 'session-only' }
      });
      setProgress({ name: 'idle' });
    } catch {
      setProgress({
        name: 'failed',
        message: 'This browser would not let Pesawa store the statement.'
      });
    }
  }

  function handleExport(what: 'transactions' | 'issues') {
    const baseName = fileName.replace(/\.pdf$/i, '');

    if (what === 'transactions') {
      downloadCsv(`${baseName}-transactions.csv`, buildTransactionsCsv(transactions));
    } else {
      downloadCsv(`${baseName}-issues.csv`, buildIssuesCsv(issues));
    }
  }

  return (
    <StatementReport
      meta={meta}
      transactions={transactions}
      issues={issues}
      above={
        getStorageMode() === 'session-only' ? (
          <SessionOnlyNotice className="mt-8" />
        ) : undefined
      }
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('transactions')}
          >
            <DownloadGlyph /> Download CSV
          </Button>

          {issues.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => handleExport('issues')}>
              Download issues
            </Button>
          )}

          {saved === null && progress.name === 'idle' && (
            <Button size="sm" onClick={() => void handleSave()}>
              Save on this device
            </Button>
          )}

          {progress.name === 'saving' && (
            <p className="text-sm text-muted-foreground">Saving…</p>
          )}

          {saved !== null && (
            <p className="text-sm text-[var(--color-money-in)]">
              Saved {saved.savedCount} transaction
              {saved.savedCount === 1 ? '' : 's'} in this browser
              {saved.duplicateCount > 0 &&
                `, skipped ${saved.duplicateCount} already saved`}
              .{' '}
              <Link href="/saved" className="underline underline-offset-4">
                Saved statements
              </Link>
              {saved.isSessionOnly && ' — for this visit only, see the notice above.'}
            </p>
          )}

          {progress.name === 'failed' && (
            <p className="text-sm text-destructive" role="alert">
              {progress.message}
            </p>
          )}
        </>
      }
    />
  );
}
