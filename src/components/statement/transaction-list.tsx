'use client';

import type { Transaction } from '@/lib/parser/types';
import { cn } from '@/lib/utils';

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
    minute: '2-digit'
  });
}

function counterpartyLabel(transaction: Transaction): string {
  if (transaction.type === 'charge' && transaction.chargeForReceipt !== null) {
    return `Fee for ${transaction.chargeForReceipt}`;
  }
  return transaction.counterpartyName ?? '—';
}

/**
 * The sign carries the meaning, not the colour — a colourblind user or a
 * greyscale print still reads this correctly.
 */
function AmountCell({ transaction }: { transaction: Transaction }) {
  const isIncoming = transaction.direction === 'in';

  return (
    <span
      className={cn(
        'tabular whitespace-nowrap',
        isIncoming ? 'text-[var(--color-money-in)]' : 'text-foreground'
      )}
    >
      {isIncoming ? '+' : '−'}
      {formatAmount(transaction.amount)}
    </span>
  );
}

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  return (
    <section>
      <h3 className="mb-3 text-lg font-semibold">
        Transactions{' '}
        <span className="font-normal text-muted-foreground">({transactions.length})</span>
      </h3>

      {/* Mobile: one card per transaction. Five columns will not fit 375px. */}
      <ul className="divide-y divide-border rounded-lg border bg-card md:hidden">
        {transactions.map(transaction => (
          <li key={`${transaction.receiptNo}-${transaction.type}`} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 flex-1 truncate font-medium">
                {counterpartyLabel(transaction)}
              </span>
              <AmountCell transaction={transaction} />
            </div>

            <div className="mt-1 flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {TYPE_LABELS[transaction.type] ?? transaction.type}
                {transaction.confidence === 'low' && (
                  <span title="Low confidence — check this row" className="ml-1">
                    ⚠
                  </span>
                )}
                {' · '}
                {formatDateTime(transaction.completedAt)}
              </span>
              <span className="tabular whitespace-nowrap text-xs">
                {formatAmount(transaction.balanceAfter)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: full table */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Counterparty</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                Amount
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                Balance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map(transaction => (
              <tr
                key={`${transaction.receiptNo}-${transaction.type}`}
                className="transition-colors hover:bg-muted/40"
              >
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                  {formatDateTime(transaction.completedAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {TYPE_LABELS[transaction.type] ?? transaction.type}
                  {transaction.confidence === 'low' && (
                    <span
                      title="Low confidence — check this row"
                      className="ml-1 text-[var(--color-accent)]"
                    >
                      ⚠
                    </span>
                  )}
                </td>
                <td className="max-w-[240px] truncate px-4 py-2.5">
                  {counterpartyLabel(transaction)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <AmountCell transaction={transaction} />
                </td>
                <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-muted-foreground">
                  {formatAmount(transaction.balanceAfter)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}