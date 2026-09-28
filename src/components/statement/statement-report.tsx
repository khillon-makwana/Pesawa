import type { ReactNode } from 'react';
import type { ParseIssue, Transaction } from '@/lib/parser/types';
import { formatKsh } from './format';
import { STATEMENT_TIME_ZONE } from './time-zone';
import { Badge } from '@/components/ui/badge';
import { ChargesPanel } from './charges-panel';
import { MoneyFlowPanel } from './money-flow-panel';
import { MoneySummary } from './money-summary';
import { CounterpartiesPanel } from './counterparties-panel';
import { TimingPanel } from './timing-panel';
import { TransactionList } from './transaction-list';
import { IssuesPanel } from './issues-panel';

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
  issues: ParseIssue[];
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
              <Badge variant="money-in">Balances add up</Badge>
            ) : (
              <Badge variant="charge">Balances don&apos;t add up</Badge>
            )}
          </p>
        </div>

        {actions !== undefined && (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        )}
      </div>

      <IssuesPanel issues={issues} />

      <MoneySummary transactions={transactions} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ChargesPanel transactions={transactions} />
          <MoneyFlowPanel transactions={transactions} />
        </div>
        <div className="space-y-6">
          <CounterpartiesPanel transactions={transactions} />
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
function formatInNairobi(date: Date, options: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('en-KE', { ...options, timeZone: STATEMENT_TIME_ZONE });
}

const DAY = { day: 'numeric' } as const;
const MONTH = { month: 'short' } as const;
const MONTH_AND_YEAR = { month: 'short', year: 'numeric' } as const;
const DAY_AND_MONTH = { day: 'numeric', month: 'short' } as const;

function formatPeriod(start: string | null, end: string | null): string {
  if (start === null || end === null || start === '' || end === '') {
    return 'Period unknown';
  }

  const from = new Date(start);
  const to = new Date(end);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return `${start.slice(0, 10)} – ${end.slice(0, 10)}`;
  }

  // Within one month the month is named once: "1–30 Jun".
  if (formatInNairobi(from, MONTH_AND_YEAR) === formatInNairobi(to, MONTH_AND_YEAR)) {
    return (
      `${formatInNairobi(from, DAY)}–${formatInNairobi(to, DAY)} ` +
      formatInNairobi(to, MONTH)
    );
  }

  return `${formatInNairobi(from, DAY_AND_MONTH)} – ${formatInNairobi(to, DAY_AND_MONTH)}`;
}
