'use client';

import { useState } from 'react';
import type { ParseResult } from '@/lib/parser/types';
import { parseStatementPdf } from '@/lib/parser/parse-statement-pdf';
import Link from 'next/link';
import {
  buildTransactionsCsv,
  buildIssuesCsv
} from '@/lib/export/build-transactions-csv';
import { downloadCsv } from '@/lib/export/download-csv';
import { loadParentReceiptNumbers, saveStatement } from '@/lib/storage/saved-statements';
import { getStorageMode } from '@/lib/storage/statement-database';
import { StatementReport } from '@/components/statement/statement-report';
import { ReceiptPreview } from '@/components/marketing/receipt-preview';
import { StatisticsBand } from '@/components/marketing/statistics-band';
import { SiteContainer } from '@/components/site-container';
import { SessionOnlyNotice } from '@/components/storage-notice';
import {
  DocumentGlyph,
  PlayGlyph,
  WarningGlyph,
  DownloadGlyph
} from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

type ScreenState =
  | { name: 'idle' }
  | { name: 'needs_password'; file: File; hadWrongPassword: boolean }
  | { name: 'parsing' }
  | { name: 'done'; result: ParseResult; fileName: string }
  | { name: 'failed'; message: string };

export function UploadStatementView() {
  const [screen, setScreen] = useState<ScreenState>({ name: 'idle' });
  const [password, setPassword] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  async function parse(file: File, submittedPassword?: string) {
    setScreen({ name: 'parsing' });

    // Loaded up front so the parser can be given a plain synchronous answer.
    // This links charges whose parent transaction is in a statement saved
    // earlier — common when a fee lands at the very start of a month.
    const parentReceipts = await loadParentReceiptNumbers();

    const outcome = await parseStatementPdf(
      await file.arrayBuffer(),
      submittedPassword,
      receiptNo => parentReceipts.has(receiptNo)
    );

    if (outcome.ok) {
      setPassword('');
      setScreen({ name: 'done', result: outcome.result, fileName: file.name });
      return;
    }

    if (outcome.reason === 'password_required' || outcome.reason === 'wrong_password') {
      setScreen({
        name: 'needs_password',
        file,
        hadWrongPassword: outcome.reason === 'wrong_password'
      });
      return;
    }

    setScreen({ name: 'failed', message: outcome.detail });
  }

  async function loadSample(withDefect: boolean) {
    setScreen({ name: 'parsing' });

    const path = withDefect
      ? '/samples/sample-statement-with-defect.pdf'
      : '/samples/sample-statement.pdf';

    try {
      const response = await fetch(path);
      const bytes = await response.arrayBuffer();
      const parentReceipts = await loadParentReceiptNumbers();
      const outcome = await parseStatementPdf(bytes, '123456', receiptNo =>
        parentReceipts.has(receiptNo)
      );

      if (outcome.ok) {
        setScreen({
          name: 'done',
          result: outcome.result,
          fileName: withDefect
            ? 'sample-statement-with-defect.pdf'
            : 'sample-statement.pdf'
        });
        return;
      }

      setScreen({ name: 'failed', message: outcome.detail });
    } catch {
      setScreen({ name: 'failed', message: 'Could not load the sample statement' });
    }
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      void parse(file);
    }
  }

  if (screen.name === 'idle') {
    return (
      <main>
        <SiteContainer className="grid items-start gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16 lg:py-20">
          <div>
            <p className="eyebrow flex items-center gap-2 text-muted-foreground">
              <span aria-hidden>—</span> M-PESA statement parser
            </p>

            <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              See what M-PESA actually costs you
            </h1>

            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Open your statement and get a breakdown of where your money went, what you
              paid in charges, and who you transact with most.
            </p>

            <div className="mt-10 rounded-xl border border-dashed border-primary/30 bg-card/60 p-6">
              <DocumentGlyph />

              <Label htmlFor="statement-file" className="mt-4 text-lg font-semibold">
                Drop your M-PESA statement PDF
              </Label>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {/* A label rather than a button, so it drives the real file input. */}
                <label htmlFor="statement-file" className={buttonVariants()}>
                  Choose file
                </label>
                <span className="font-mono text-sm text-muted-foreground">
                  {selectedFileName ?? 'No file chosen'}
                </span>
              </div>

              <input
                id="statement-file"
                type="file"
                accept="application/pdf"
                onChange={handleFileSelected}
                className="sr-only"
              />

              <p className="mt-6 flex items-start gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
                <span
                  aria-hidden
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-money-in)]"
                />
                <span>
                  Read in your browser. The file and its password never leave this device.
                  You can then save the result in this browser if you want it next time,
                  and delete it whenever you like.{' '}
                  <Link href="/privacy" className="underline underline-offset-4">
                    How this works
                  </Link>
                </span>
              </p>
            </div>

            <div className="mt-10">
              <h2 className="eyebrow text-muted-foreground">Sample statements</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                No statement to hand? Both of these contain entirely fictional data.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => void loadSample(false)}>
                  <PlayGlyph /> Try a sample statement
                </Button>
                <Button variant="outline" onClick={() => void loadSample(true)}>
                  <WarningGlyph /> Try one with a missing transaction
                </Button>
              </div>

              <p className="mt-4 max-w-xl text-sm text-muted-foreground">
                The second sample has a transaction removed from it. The balance check
                detects the gap and reports the exact amount that is unaccounted for — the
                same thing happened on a real statement from Safaricom.
              </p>
            </div>
          </div>

          <div className="hidden lg:block lg:pt-10">
            <ReceiptPreview />
          </div>
        </SiteContainer>

        <StatisticsBand />
      </main>
    );
  }

  return (
    <main>
      <SiteContainer>
        {screen.name === 'needs_password' && (
          <div className="mx-auto max-w-md py-16">
            <p className="chip bg-muted text-muted-foreground">Protected document</p>
            <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight">
              This statement is protected
            </h1>

            <div className="mt-6 rounded-lg border border-border bg-card p-6">
              <Label htmlFor="statement-password">Statement code</Label>
              <p className="mt-1.5 text-sm text-muted-foreground">
                The code Safaricom sent with the statement.{' '}
                <strong className="font-medium text-foreground">
                  This is not your M-PESA PIN.
                </strong>{' '}
                Never enter your PIN here or anywhere else.
              </p>

              <div className="mt-4 flex gap-2">
                <Input
                  id="statement-password"
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && screen.name === 'needs_password') {
                      void parse(screen.file, password);
                    }
                  }}
                  autoFocus
                  className="min-w-0 flex-1"
                />
                <Button onClick={() => void parse(screen.file, password)} size="lg">
                  Open
                </Button>
              </div>

              {screen.hadWrongPassword && (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  That code did not work. Try again.
                </p>
              )}
            </div>
          </div>
        )}

        {screen.name === 'parsing' && (
          <div className="py-24 text-center">
            <p className="eyebrow text-muted-foreground">Working locally</p>
            <p className="mt-3 font-mono text-lg">
              Reading statement
              <span className="animate-pulse">▌</span>
            </p>
          </div>
        )}

        {screen.name === 'failed' && (
          <div className="mx-auto max-w-md py-16">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
              <p className="eyebrow text-destructive">Could not read this file</p>
              <p className="mt-2 text-sm" role="alert">
                {screen.message}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFileName(null);
                  setScreen({ name: 'idle' });
                }}
                className="mt-5"
              >
                Start over
              </Button>
            </div>
          </div>
        )}

        {screen.name === 'done' && (
          <StatementSummary result={screen.result} fileName={screen.fileName} />
        )}
      </SiteContainer>
    </main>
  );
}

/*
 * Saving is deliberately opt-in. Parsing a statement shows you the report; it
 * does not put anything in storage until you ask for it here.
 */
type SaveState =
  | { name: 'idle' }
  | { name: 'saving' }
  | { name: 'saved'; savedCount: number; duplicateCount: number; isSessionOnly: boolean }
  | { name: 'failed'; message: string };

function StatementSummary({
  result,
  fileName
}: {
  result: ParseResult;
  fileName: string;
}) {
  const { meta, transactions, issues } = result;
  const [saveState, setSaveState] = useState<SaveState>({ name: 'idle' });

  async function handleSave() {
    setSaveState({ name: 'saving' });

    try {
      const outcome = await saveStatement(result, fileName);

      setSaveState({
        name: 'saved',
        savedCount: outcome.savedCount,
        duplicateCount: outcome.duplicateCount,
        isSessionOnly: getStorageMode() === 'session-only'
      });
    } catch {
      setSaveState({
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

          {saveState.name === 'idle' && (
            <Button size="sm" onClick={() => void handleSave()}>
              Save on this device
            </Button>
          )}

          {saveState.name === 'saving' && (
            <p className="text-sm text-muted-foreground">Saving…</p>
          )}

          {saveState.name === 'saved' && (
            <p className="text-sm text-[var(--color-money-in)]">
              Saved {saveState.savedCount} transaction
              {saveState.savedCount === 1 ? '' : 's'} in this browser
              {saveState.duplicateCount > 0 &&
                `, skipped ${saveState.duplicateCount} already saved`}
              .{' '}
              <Link href="/saved" className="underline underline-offset-4">
                Saved statements
              </Link>
              {saveState.isSessionOnly && ' — for this visit only, see the notice above.'}
            </p>
          )}

          {saveState.name === 'failed' && (
            <p className="text-sm text-destructive" role="alert">
              {saveState.message}
            </p>
          )}
        </>
      }
    />
  );
}
