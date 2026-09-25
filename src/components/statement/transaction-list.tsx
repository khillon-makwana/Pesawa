'use client';

import { useMemo, useState } from 'react';
import type { Transaction } from '@/lib/parser/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { STATEMENT_TIME_ZONE } from './time-zone';

const TYPE_LABELS: Record<string, string> = {
  payment_received: 'Received',
  send_money: 'Sent money',
  paybill_payment: 'Paybill',
  till_payment: 'Merchant',
  pochi_payment: 'Pochi',
  unit_trust_investment: 'Investment',
  bundle_purchase: 'Bundles',
  airtime: 'Airtime',
  charge: 'Charge',
  agent_deposit: 'Deposit',
  agent_withdrawal: 'Withdrawal',
  fuliza_loan: 'Fuliza',
  fuliza_repayment: 'Fuliza repayment',
  reversal: 'Reversal',
  transfer: 'Transfer',
  unknown: 'Unrecognised'
};

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: STATEMENT_TIME_ZONE
  });
}

function counterpartyLabel(transaction: Transaction): string {
  if (transaction.type === 'charge' && transaction.chargeForReceipt !== null) {
    return `Fee for ${transaction.chargeForReceipt}`;
  }
  return transaction.counterpartyName ?? '—';
}

function typeLabel(transaction: Transaction): string {
  return TYPE_LABELS[transaction.type] ?? transaction.type;
}

/**
 * The sign carries the meaning, not the colour — a colourblind user or a
 * greyscale print still reads this correctly.
 */
function AmountCell({ transaction }: { transaction: Transaction }) {
  const isIncoming = transaction.direction === 'in';
  const isCharge = transaction.type === 'charge';

  return (
    <span
      className={cn(
        'tabular whitespace-nowrap',
        isIncoming && 'text-[var(--color-money-in)]',
        isCharge && 'text-accent',
        !isIncoming && !isCharge && 'text-foreground'
      )}
    >
      {isIncoming ? '+' : '−'}
      {formatAmount(transaction.amount)}
    </span>
  );
}

function TypeBadge({ transaction }: { transaction: Transaction }) {
  const variant =
    transaction.type === 'charge'
      ? 'charge'
      : transaction.direction === 'in'
        ? 'money-in'
        : 'default';

  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant={variant}>{typeLabel(transaction)}</Badge>
      {transaction.confidence === 'low' && (
        <span title="Low confidence — check this row" className="text-accent">
          ⚠
        </span>
      )}
    </span>
  );
}

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const [filter, setFilter] = useState('');

  /*
   * Matches counterparty and receipt number, which are the two things anyone
   * arrives looking for — "what did I send Asha?" or "what is QG94KN29L?".
   * The charge rows carry the receipt they belong to, so searching a receipt
   * turns up both the payment and its fee.
   */
  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();

    if (needle === '') {
      return transactions;
    }

    return transactions.filter(transaction =>
      [
        transaction.counterpartyName,
        transaction.receiptNo,
        transaction.chargeForReceipt,
        typeLabel(transaction)
      ]
        .filter(value => value !== null)
        .some(value => value.toLowerCase().includes(needle))
    );
  }, [transactions, filter]);

  const hasCharges = visible.some(transaction => transaction.type === 'charge');

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-xl font-bold">
          Transactions{' '}
          <span className="tabular text-base font-normal text-muted-foreground">
            ({transactions.length})
          </span>
        </h3>

        <Input
          type="search"
          value={filter}
          onChange={event => setFilter(event.target.value)}
          placeholder="Filter counterparty or ref"
          aria-label="Filter transactions by counterparty or receipt number"
          className="h-9 w-full text-sm sm:w-72"
        />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          Nothing matches “{filter}”.
        </p>
      ) : (
        <>
          {/* Mobile: one card per transaction. Five columns will not fit 375px. */}
          <ul className="divide-y divide-border rounded-lg border border-border bg-card md:hidden">
            {visible.map(transaction => (
              <li key={`${transaction.receiptNo}-${transaction.type}`} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {counterpartyLabel(transaction)}
                  </span>
                  <AmountCell transaction={transaction} />
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <TypeBadge transaction={transaction} />
                  <span className="tabular text-xs whitespace-nowrap">
                    {formatDateTime(transaction.completedAt)} · {formatAmount(transaction.balanceAfter)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: full table */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-left text-primary-foreground">
                  <th className="eyebrow w-12 px-4 py-3 font-normal text-primary-foreground/70">
                    #
                  </th>
                  <th className="eyebrow px-4 py-3 font-normal text-primary-foreground/70">
                    Date &amp; time
                  </th>
                  <th className="eyebrow px-4 py-3 font-normal text-primary-foreground/70">
                    Type
                  </th>
                  <th className="eyebrow px-4 py-3 font-normal text-primary-foreground/70">
                    Counterparty / description
                  </th>
                  <th className="eyebrow px-4 py-3 text-right font-normal text-primary-foreground/70">
                    Amount (KSh)
                  </th>
                  <th className="eyebrow px-4 py-3 text-right font-normal text-primary-foreground/70">
                    Balance (KSh)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((transaction, index) => (
                  <tr
                    key={`${transaction.receiptNo}-${transaction.type}`}
                    className="transition-colors hover:bg-muted/50"
                  >
                    {/*
                      Charges are numbered too, but marked with a dot so the eye
                      can pick out what M-PESA took without reading the Type
                      column on every row.
                    */}
                    <td className="tabular px-4 py-2.5 text-xs text-muted-foreground">
                      {transaction.type === 'charge' ? (
                        <span className="text-accent" title="M-PESA charge">
                          ●
                        </span>
                      ) : (
                        String(index + 1).padStart(2, '0')
                      )}
                    </td>
                    <td className="tabular px-4 py-2.5 text-xs whitespace-nowrap text-muted-foreground">
                      {formatDateTime(transaction.completedAt)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <TypeBadge transaction={transaction} />
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-2.5">
                      {counterpartyLabel(transaction)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <AmountCell transaction={transaction} />
                    </td>
                    <td className="tabular px-4 py-2.5 text-right whitespace-nowrap text-muted-foreground">
                      {formatAmount(transaction.balanceAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-3 flex flex-wrap justify-between gap-3">
        {hasCharges ? (
          <p className="eyebrow text-muted-foreground">
            <span aria-hidden className="text-accent">
              ●
            </span>{' '}
            marks an M-PESA charge
          </p>
        ) : (
          <span />
        )}
        <p className="eyebrow text-muted-foreground">
          Showing {visible.length} of {transactions.length}
        </p>
      </div>
    </section>
  );
}
