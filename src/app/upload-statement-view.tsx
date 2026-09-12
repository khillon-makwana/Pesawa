'use client';

import { useState } from 'react';
import type { ParseResult } from '@/lib/parser/types';
import { parseStatementPdf } from '@/lib/parser/parse-statement-pdf';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { buildTransactionsCsv, buildIssuesCsv } from '@/lib/export/build-transactions-csv';
import { downloadCsv } from '@/lib/export/download-csv';
import { TransactionList } from '@/components/statement/transaction-list';
import { ChargesPanel } from '@/components/statement/charges-panel';
import { MoneyFlowPanel } from '@/components/statement/money-flow-panel';
import { CounterpartiesPanel } from '@/components/statement/counterparties-panel';
import { TimingPanel } from '@/components/statement/timing-panel';
import { formatKsh } from '@/components/statement/format';

type ScreenState =
  | { name: 'idle' }
  | { name: 'needs_password'; file: File; hadWrongPassword: boolean }
  | { name: 'parsing' }
  | { name: 'done'; result: ParseResult; fileName: string }
  | { name: 'failed'; message: string };

const PRIMARY_BUTTON =
  'cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const SECONDARY_BUTTON =
  'cursor-pointer rounded-md border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export function UploadStatementView({ isSignedIn }: { isSignedIn: boolean }) {
  const [screen, setScreen] = useState<ScreenState>({ name: 'idle' });
  const [password, setPassword] = useState('');

  async function parse(file: File, submittedPassword?: string) {
    setScreen({ name: 'parsing' });

    const outcome = await parseStatementPdf(await file.arrayBuffer(), submittedPassword);

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
      const outcome = await parseStatementPdf(bytes, '123456');

      if (outcome.ok) {
        setScreen({
          name: 'done',
          result: outcome.result,
          fileName: withDefect ? 'sample-statement-with-defect.pdf' : 'sample-statement.pdf'
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
      void parse(file);
    }
  }

  return (
    <main>
      {screen.name === 'idle' && (
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            See what M-PESA actually costs you
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Open your statement and get a breakdown of where your money went, what you
            paid in charges, and who you transact with most.
          </p>

          <div className="mt-8 rounded-lg border bg-card p-6">
            <label
              htmlFor="statement-file"
              className="block text-sm font-medium"
            >
              Your M-PESA statement
            </label>
            <input
              id="statement-file"
              type="file"
              accept="application/pdf"
              onChange={handleFileSelected}
              className="mt-2 block w-full cursor-pointer text-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
            <p className="mt-4 text-sm text-muted-foreground">
              Your statement is read entirely in this browser. The file and its password
              are never sent anywhere.{' '}
              <Link href="/privacy" className="underline">
                How this works
              </Link>
            </p>
          </div>

          <div className="mt-8 border-t pt-8">
            <h2 className="text-lg font-semibold">No statement to hand?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try one of these. Both contain entirely fictional data.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => void loadSample(false)} className={PRIMARY_BUTTON}>
                Try a sample statement
              </button>
              <button onClick={() => void loadSample(true)} className={SECONDARY_BUTTON}>
                Try one with a missing transaction
              </button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              The second sample has a transaction removed from it. The balance check
              detects the gap and reports the exact amount that is unaccounted for — the
              same thing happened on a real statement from Safaricom.
            </p>
          </div>
        </div>
      )}

      {screen.name === 'needs_password' && (
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-semibold">This statement is protected</h1>

          <div className="mt-6 rounded-lg border bg-card p-6">
            <label htmlFor="statement-password" className="block text-sm font-medium">
              Statement code
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
              The code Safaricom sent with the statement.{' '}
              <strong className="font-medium text-foreground">
                This is not your M-PESA PIN.
              </strong>{' '}
              Never enter your PIN here or anywhere else.
            </p>

            <div className="mt-4 flex gap-2">
              <input
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
                className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              <button
                onClick={() => void parse(screen.file, password)}
                className={PRIMARY_BUTTON}
              >
                Open
              </button>
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
        <div className="py-16 text-center">
          <p className="text-muted-foreground">Reading statement…</p>
        </div>
      )}

      {screen.name === 'failed' && (
        <div className="mx-auto max-w-md rounded-lg border bg-card p-6">
          <p className="text-destructive" role="alert">
            {screen.message}
          </p>
          <button
            onClick={() => setScreen({ name: 'idle' })}
            className={`mt-4 ${SECONDARY_BUTTON}`}
          >
            Start over
          </button>
        </div>
      )}

      {screen.name === 'done' && (
        <StatementSummary
          result={screen.result}
          fileName={screen.fileName}
          isSignedIn={isSignedIn}
        />
      )}
    </main>
  );
}

function StatementSummary({
  result,
  fileName,
  isSignedIn
}: {
  result: ParseResult;
  fileName: string;
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const { meta, transactions, issues } = result;

  const [saveState, setSaveState] = useState<
    | { name: 'idle' }
    | { name: 'saving' }
    | { name: 'saved'; imported: number; duplicates: number }
    | { name: 'failed'; message: string }
  >({ name: 'idle' });

  async function handleSave() {
    setSaveState({ name: 'saving' });

    try {
      const response = await fetch('/api/statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          meta: {
            periodStart: meta.periodStart,
            periodEnd: meta.periodEnd,
            openingBalance: meta.openingBalance,
            closingBalance: meta.closingBalance,
            balanceVerified: meta.balanceVerified,
            parserVersion: meta.parserVersion
          },
          transactions,
          issues
        })
      });

      const body = await response.json();

      if (!response.ok) {
        setSaveState({ name: 'failed', message: body.error ?? 'Could not save' });
        return;
      }

      setSaveState({
        name: 'saved',
        imported: body.importedCount,
        duplicates: body.duplicateCount
      });
      router.refresh();
    } catch {
      setSaveState({ name: 'failed', message: 'Could not reach the server' });
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{transactions.length} transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Opening <span className="tabular">{formatKsh(meta.openingBalance)}</span> ·
          Closing <span className="tabular">{formatKsh(meta.closingBalance)}</span> ·
          Balance {meta.balanceVerified ? 'verified' : 'not verified'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isSignedIn && saveState.name === 'idle' && (
          <button onClick={handleSave} className={PRIMARY_BUTTON}>
            Save this statement
          </button>
        )}

        <button onClick={() => handleExport('transactions')} className={SECONDARY_BUTTON}>
          Download CSV
        </button>

        {issues.length > 0 && (
          <button onClick={() => handleExport('issues')} className={SECONDARY_BUTTON}>
            Download issues
          </button>
        )}

        {!isSignedIn && (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="underline">
              Sign in
            </Link>{' '}
            to save this statement.
          </p>
        )}

        {saveState.name === 'saving' && (
          <p className="text-sm text-muted-foreground">Saving…</p>
        )}

        {saveState.name === 'saved' && (
          <p className="text-sm text-[var(--color-money-in)]">
            Saved {saveState.imported} transactions
            {saveState.duplicates > 0 &&
              `, skipped ${saveState.duplicates} already imported`}
            .{' '}
            <Link href="/statements" className="underline">
              View your statements
            </Link>
          </p>
        )}

        {saveState.name === 'failed' && (
          <p className="text-sm text-destructive" role="alert">
            {saveState.message}
          </p>
        )}
      </div>

      {issues.length > 0 && (
        <section className="rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5 p-4">
          <h2 className="text-sm font-medium">
            {issues.length} {issues.length === 1 ? 'issue' : 'issues'} found in this
            statement
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {issues.map((issue, index) => (
              <li key={index}>{issue.detail}</li>
            ))}
          </ul>
        </section>
      )}

      <ChargesPanel transactions={transactions} />
      <MoneyFlowPanel transactions={transactions} />
      <CounterpartiesPanel transactions={transactions} />
      <TimingPanel transactions={transactions} />

      <TransactionList transactions={transactions} />
    </div>
  );
}