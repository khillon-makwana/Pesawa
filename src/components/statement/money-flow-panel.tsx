import type { Transaction } from '@/lib/parser/types';
import { summariseMoneyFlow } from '@/lib/analysis/summarise-money-flow';
import { formatKsh } from './format';

export function MoneyFlowPanel({ transactions }: { transactions: Transaction[] }) {
  const flow = summariseMoneyFlow(transactions);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold">Where your money went</h3>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-sm text-muted-foreground">In</p>
          <p className="tabular mt-0.5 text-xl font-medium text-[var(--color-money-in)]">
            {formatKsh(flow.totalInInCents)}
          </p>
          {flow.revenueInCents !== flow.totalInInCents && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatKsh(flow.revenueInCents)} earned
            </p>
          )}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Out</p>
          <p className="tabular mt-0.5 text-xl font-medium">
            {formatKsh(flow.totalOutInCents)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Net</p>
          <p className="tabular mt-0.5 text-xl font-medium">
            {flow.netInCents >= 0 ? '+' : '−'}
            {formatKsh(Math.abs(flow.netInCents))}
          </p>
        </div>
      </div>

      {/*
        A bar per category, width proportional to share. Clearer than a pie for
        seven categories, and it degrades to a readable list without CSS.
      */}
      <ul className="mt-6 space-y-3 border-t pt-4">
        {flow.spendingByCategory.map(category => (
          <li key={category.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{category.label}</span>
              <span className="tabular whitespace-nowrap font-medium">
                {formatKsh(category.totalInCents)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${category.shareOfTotalPercent}%` }}
                />
              </div>
              <span className="tabular w-12 shrink-0 text-right text-xs text-muted-foreground">
                {category.shareOfTotalPercent}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}