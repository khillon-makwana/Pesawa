import type { ReactNode } from 'react';
import type { Transaction } from '@/lib/parser/types';
import { formatKsh } from './format';
import { STATEMENT_TIME_ZONE } from './time-zone';
import { Badge } from '@/components/ui/badge';
import { ChargesPanel } from './charges-panel';
import { MoneyFlowPanel, CashFlowPanel } from './money-flow-panel';
import { CounterpartiesPanel } from './counterparties-panel';
import { TimingPanel } from './timing-panel';
import { TransactionList } from './transaction-list';

export interface StatementReportMeta {
  periodStart: string | null;
  periodEnd: string | null;
  openingBalance: number;
  closingBalance: number;
  balanceVerified: boolean;
}

/*
 * The results screen, shared by the upload flow and a saved statement so the
 * two cannot drift apart. Everything that differs between them — the heading,
 * the buttons, the back link — is passed in.
 */
export function StatementReport({
  meta,
  transactions,
  issues,
  heading,
  above,
  actions
}: {
  meta: StatementReportMeta;
  transactions: Transaction[];
  issues: { detail: string }[];
  heading?: string;
  above?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-6 py-8">
      {above}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-heading text-3xl font-bold tracking-tight">
            <span aria-hidden className="text-[0.5em] text-primary">
              ■
            </span>
            <span className="truncate">
              {heading ?? `${transactions.length} transactions`}
            </span>
          </h1>

          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-xs text-muted-foreground">
            {heading !== undefined && (
              <>
                <span>{transactions.length} transactions</span>
                <span aria-hidden>·</span>
              </>
            )}
            <span>{formatPeriod(meta.periodStart, meta.periodEnd)}</span>
            <span aria-hidden>·</span>
            <span>Opening {formatKsh(meta.openingBalance)}</span>
            <span aria-hidden>·</span>
            <span>Closing {formatKsh(meta.closingBalance)}</span>
            {meta.balanceVerified ? (
              <Badge variant="money-in">Balance verified</Badge>
            ) : (
              <Badge variant="charge">Balance not verified</Badge>
            )}
          </p>
        </div>

        {actions !== undefined && (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        )}
      </div>

      {issues.length > 0 && (
        <section className="rounded-lg border border-accent/40 bg-accent/5 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden className="text-accent">
              ▲
            </span>
            {issues.length} {issues.length === 1 ? 'issue' : 'issues'} found in this
            statement
          </h2>
          <ul className="mt-2 space-y-1 pl-6 text-sm text-muted-foreground">
            {issues.map((issue, index) => (
              <li key={index}>{issue.detail}</li>
            ))}
          </ul>
        </section>
      )}

      <ChargesPanel transactions={transactions} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <MoneyFlowPanel transactions={transactions} />
          <CounterpartiesPanel transactions={transactions} />
        </div>
        <div className="space-y-6">
          <CashFlowPanel transactions={transactions} />
          <TimingPanel transactions={transactions} />
        </div>
      </div>

      <TransactionList transactions={transactions} />
    </div>
  );
}

/*
 * "1–30 Jun" where possible, falling back to whatever the parser gave us.
 *
 * Read in EAT, like every other date on this screen: a statement is written in
 * Nairobi time, and rendering it in the viewer's zone would both disagree with
 * the timing chart and shift dates between the server and the browser.
 */
function formatPeriod(start: string | null, end: string | null): string {
  if (start === null || end === null || start === '' || end === '') {
    return 'Period unknown';
  }

  const from = new Date(start);
  const to = new Date(end);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return `${start.slice(0, 10)} – ${end.slice(0, 10)}`;
  }

  const day = (date: Date) =>
    date.toLocaleDateString('en-KE', { day: 'numeric', timeZone: STATEMENT_TIME_ZONE });
  const monthAndYear = (date: Date) =>
    date.toLocaleDateString('en-KE', {
      month: 'short',
      year: 'numeric',
      timeZone: STATEMENT_TIME_ZONE
    });

  if (monthAndYear(from) === monthAndYear(to)) {
    const month = to.toLocaleDateString('en-KE', {
      month: 'short',
      timeZone: STATEMENT_TIME_ZONE
    });
    return `${day(from)}–${day(to)} ${month}`;
  }

  const fromLabel = from.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    timeZone: STATEMENT_TIME_ZONE
  });
  const toLabel = to.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    timeZone: STATEMENT_TIME_ZONE
  });

  return `${fromLabel} – ${toLabel}`;
}
