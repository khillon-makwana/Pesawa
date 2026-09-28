'use client';

import { useState } from 'react';
import type { ParseResult } from '@/lib/parser/types';
import { parseStatementPdf } from '@/lib/parser/parse-statement-pdf';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStatementSession } from '@/components/statement-session';
import { loadParentReceiptNumbers } from '@/lib/storage/saved-statements';
import { ReceiptPreview } from '@/components/marketing/receipt-preview';
import { StatisticsBand } from '@/components/marketing/statistics-band';
import { SiteContainer } from '@/components/site-container';
import { DocumentGlyph, PlayGlyph, WarningGlyph } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

type ScreenState =
  | { name: 'idle' }
  | { name: 'needs_password'; file: File; hadWrongPassword: boolean }
  | { name: 'parsing' }
  | { name: 'failed'; message: string };

/*
 * Keyed on the session's counter so the logo can bring this page back to its
 * first screen: changing the key makes React throw the old screens away and
 * start fresh, dropping any chosen file and typed code with them.
 */
export function UploadStatementView() {
  const { uploadScreenKey } = useStatementSession();
  return <UploadScreens key={uploadScreenKey} />;
}

function UploadScreens() {
  const router = useRouter();
  const { setOpenStatement } = useStatementSession();
  const [screen, setScreen] = useState<ScreenState>({ name: 'idle' });
  const [password, setPassword] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  /*
   * The report is its own page, so the address says what is on screen and the
   * Back button returns here. The statement travels in memory, through the
   * session, never in the address or in browser storage.
   */
  function showReport(result: ParseResult, fileName: string) {
    setOpenStatement({ result, fileName, saved: null });
    router.push('/report');
  }

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
      showReport(outcome.result, file.name);
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
        showReport(
          outcome.result,
          withDefect ? 'sample-statement-with-defect.pdf' : 'sample-statement.pdf'
        );
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

              {/*
                A real form rather than an input beside a button: it makes Enter
                submit without a key handler, and a password field outside a
                form is something browsers warn about.
              */}
              <form
                className="mt-4 flex gap-2"
                onSubmit={event => {
                  event.preventDefault();
                  void parse(screen.file, password);
                }}
              >
                <Input
                  id="statement-password"
                  name="statement-password"
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  /*
                   * Not offered to a password manager. This unlocks one
                   * document and is discarded straight after; it is not a
                   * credential for this site, and the page says as much.
                   */
                  autoComplete="off"
                  autoFocus
                  className="min-w-0 flex-1"
                />
                <Button type="submit" size="lg">
                  Open
                </Button>
              </form>

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
      </SiteContainer>
    </main>
  );
}
