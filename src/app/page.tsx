'use client';

import { useState } from 'react';
import type { ParseResult } from '@/lib/parser/types';
import { parseStatementPdf } from '@/lib/parser/parse-statement-pdf';

type ScreenState =
  | { name: 'idle' }
  | { name: 'needs_password'; file: File; hadWrongPassword: boolean }
  | { name: 'parsing' }
  | { name: 'done'; result: ParseResult }
  | { name: 'failed'; message: string };

export default function UploadStatementPage() {
  const [screen, setScreen] = useState<ScreenState>({ name: 'idle' });
  const [password, setPassword] = useState('');

  async function parse(file: File, submittedPassword?: string) {
    setScreen({ name: 'parsing' });

    const outcome = await parseStatementPdf(await file.arrayBuffer(), submittedPassword);

    if (outcome.ok) {
      setPassword('');
      setScreen({ name: 'done', result: outcome.result });
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

      {screen.name === 'done' && <StatementSummary result={screen.result} />}
    </main>
  );
}

function formatCents(cents: number) {
  return `KSh ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}

function StatementSummary({ result }: { result: ParseResult }) {
  const { meta, transactions, issues } = result;

  return (
    <div>
      <h2>{transactions.length} transactions</h2>
      <p>
        Opening {formatCents(meta.openingBalance)} · Closing {formatCents(meta.closingBalance)} ·{' '}
        Balance {meta.balanceVerified ? 'verified' : 'not verified'}
      </p>

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