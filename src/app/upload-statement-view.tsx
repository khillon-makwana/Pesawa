'use client';

import { useState } from 'react';
import type { ParseResult, Transaction } from '@/lib/parser/types';
import { parseStatementPdf } from '@/lib/parser/parse-statement-pdf';
import { summariseCharges } from '@/lib/analysis/summarise-charges';
import { rankCounterparties } from '@/lib/analysis/rank-counterparties';
import { summariseMoneyFlow } from '@/lib/analysis/summarise-money-flow';
import { summarisePaymentTiming } from '@/lib/analysis/summarise-payment-timing';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type ScreenState =
  | { name: 'idle' }
  | { name: 'needs_password'; file: File; hadWrongPassword: boolean }
  | { name: 'parsing' }
  | { name: 'done'; result: ParseResult; fileName: string  }
  | { name: 'failed'; message: string };

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

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void parse(file);
    }
  }

  return (
    <main style={{ padding: 32, fontFamily: 'system-ui', maxWidth: 900 }}>
      <h1>M-Pesa Statement Parser</h1>

      {screen.name === 'idle' && (
        <div>
          <p>Select your M-Pesa statement PDF.</p>
          <input type="file" accept="application/pdf" onChange={handleFileSelected} />
          <p style={{ fontSize: 14, color: '#555', marginTop: 16 }}>
            Your statement is read entirely in this browser. Nothing is uploaded.
          </p>
        </div>
      )}

      {screen.name === 'needs_password' && (
        <div>
          <p>This statement is password protected.</p>
          <p style={{ fontSize: 14, color: '#555' }}>
            Enter the code Safaricom sent with the statement.{' '}
            <strong>This is not your M-PESA PIN.</strong> Never enter your PIN here or anywhere else.
          </p>

          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && screen.name === 'needs_password') {
                void parse(screen.file, password);
              }
            }}
            autoFocus
          />
          <button onClick={() => void parse(screen.file, password)} style={{ marginLeft: 8 }}>
            Open statement
          </button>

          {screen.hadWrongPassword && (
            <p style={{ color: '#b00' }}>That code did not work. Try again.</p>
          )}
        </div>
      )}

      {screen.name === 'parsing' && <p>Reading statement…</p>}

      {screen.name === 'failed' && (
        <div>
          <p style={{ color: '#b00' }}>{screen.message}</p>
          <button onClick={() => setScreen({ name: 'idle' })}>Start over</button>
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

function formatCents(cents: number) {
  return `KSh ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
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

  return (
    <div>
      <h2>{transactions.length} transactions</h2>
      <p>
        Opening {formatCents(meta.openingBalance)} · Closing {formatCents(meta.closingBalance)} ·{' '}
        Balance {meta.balanceVerified ? 'verified' : 'not verified'}
      </p>

      <div style={{ margin: '16px 0' }}>
        {!isSignedIn && (
          <p style={{ fontSize: 14, color: '#555' }}>
            <Link href="/login">Sign in</Link> to save this statement.
          </p>
        )}

        {isSignedIn && saveState.name === 'idle' && (
          <button onClick={handleSave}>Save this statement</button>
        )}

        {saveState.name === 'saving' && <p>Saving…</p>}

        {saveState.name === 'saved' && (
          <p style={{ color: '#070' }}>
            Saved {saveState.imported} transactions
            {saveState.duplicates > 0 && `, skipped ${saveState.duplicates} already imported`}.{' '}
            <Link href="/statements">View your statements</Link>
          </p>
        )}

        {saveState.name === 'failed' && <p style={{ color: '#b00' }}>{saveState.message}</p>}
      </div>

      <MoneyFlowPanel transactions={transactions} />
      <ChargesPanel transactions={transactions} />
      <CounterpartiesPanel transactions={transactions} />
      <TimingPanel transactions={transactions} />

      {issues.length > 0 && (
        <>
          <h3>Issues ({issues.length})</h3>
          <ul>
            {issues.map((issue, index) => (
              <li key={index}>
                [{issue.type}] {issue.detail}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>Transactions</h3>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th>Date</th>
            <th>Type</th>
            <th>Counterparty</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
            <th style={{ textAlign: 'right' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(transaction => (
            <tr key={`${transaction.receiptNo}-${transaction.type}`}>
              <td>{new Date(transaction.completedAt).toLocaleString('en-KE')}</td>
              <td>
                {transaction.type}
                {transaction.confidence === 'low' && ' ⚠'}
              </td>
              <td>
                {transaction.type === 'charge' && transaction.chargeForReceipt
                  ? `Fee for ${transaction.chargeForReceipt}`
                  : transaction.counterpartyName ?? '—'}
              </td>
              <td style={{ textAlign: 'right' }}>
                {transaction.direction === 'in' ? '+' : '−'}
                {formatCents(transaction.amount)}
              </td>
              <td style={{ textAlign: 'right' }}>{formatCents(transaction.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ChargesPanel({ transactions }: { transactions: Transaction[] }) {
  const charges = summariseCharges(transactions);

  if (charges.chargeCount === 0) {
    return null;
  }

  return (
    <div style={{ margin: '24px 0', padding: 16, background: '#f6f6f6' }}>
      <h3 style={{ marginTop: 0 }}>What M-PESA charged you</h3>
      <p style={{ fontSize: 24, margin: '8px 0' }}>
        {formatCents(charges.totalChargesInCents)}
      </p>
      <p style={{ fontSize: 14, color: '#555', margin: 0 }}>
        {charges.chargeCount} charges · average {formatCents(charges.averageChargeInCents)} ·
        largest {formatCents(charges.largestChargeInCents)}
        {charges.shareOfSpendingPercent !== null &&
          ` · ${charges.shareOfSpendingPercent}% of what you spent`}
      </p>
    </div>
  );
}

function CounterpartiesPanel({ transactions }: { transactions: Transaction[] }) {
  const rankings = rankCounterparties(transactions).slice(0, 10);

  if (rankings.length === 0) {
    return null;
  }

  return (
    <div style={{ margin: '24px 0' }}>
      <h3>Who you transact with most</h3>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th>Name</th>
            <th style={{ textAlign: 'right' }}>Transactions</th>
            <th style={{ textAlign: 'right' }}>Paid out</th>
            <th style={{ textAlign: 'right' }}>Received</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map(party => (
            <tr key={party.displayName}>
              <td>{party.displayName}</td>
              <td style={{ textAlign: 'right' }}>{party.transactionCount}</td>
              <td style={{ textAlign: 'right' }}>
                {party.totalPaidInCents > 0 ? formatCents(party.totalPaidInCents) : '—'}
              </td>
              <td style={{ textAlign: 'right' }}>
                {party.totalReceivedInCents > 0 ? formatCents(party.totalReceivedInCents) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MoneyFlowPanel({ transactions }: { transactions: Transaction[] }) {
  const flow = summariseMoneyFlow(transactions);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div style={{ margin: '24px 0' }}>
      <h3>Where your money went</h3>

      <p style={{ fontSize: 14, color: '#555' }}>
        In {formatCents(flow.totalInInCents)} · Out {formatCents(flow.totalOutInCents)} · Net{' '}
        {flow.netInCents >= 0 ? '+' : '−'}
        {formatCents(Math.abs(flow.netInCents))}
        {flow.revenueInCents !== flow.totalInInCents &&
          ` · of which ${formatCents(flow.revenueInCents)} was earned`}
      </p>

      <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
        <tbody>
          {flow.spendingByCategory.map(category => (
            <tr key={category.label}>
              <td style={{ padding: '4px 0' }}>{category.label}</td>
              <td style={{ textAlign: 'right', width: 60, color: '#555' }}>
                {category.transactionCount}
              </td>
              <td style={{ textAlign: 'right', width: 140 }}>
                {formatCents(category.totalInCents)}
              </td>
              <td style={{ textAlign: 'right', width: 60, color: '#555' }}>
                {category.shareOfTotalPercent}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimingPanel({ transactions }: { transactions: Transaction[] }) {
  const timing = summarisePaymentTiming(transactions);

  if (timing.busiestHourLabel === null) {
    return null;
  }

  const peakCount = Math.max(...timing.byHour.map(bucket => bucket.transactionCount));

  return (
    <div style={{ margin: '24px 0' }}>
      <h3>When you transact</h3>
      <p style={{ fontSize: 14, color: '#555' }}>
        Busiest around {timing.busiestHourLabel}, and on {timing.busiestWeekdayLabel}s.
      </p>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
        {timing.byHour.map(bucket => (
          <div
            key={bucket.label}
            title={`${bucket.label}: ${bucket.transactionCount}`}
            style={{
              flex: 1,
              height: `${(bucket.transactionCount / peakCount) * 100}%`,
              minHeight: bucket.transactionCount > 0 ? 2 : 0,
              background: '#4a7'
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', fontSize: 11, color: '#888', marginTop: 4 }}>
        <span style={{ flex: 1 }}>12am</span>
        <span style={{ flex: 1, textAlign: 'center' }}>12pm</span>
        <span style={{ flex: 1, textAlign: 'right' }}>11pm</span>
      </div>
    </div>
  );
}