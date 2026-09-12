import type { Transaction } from '@/lib/parser/types';
import { rankCounterparties } from '@/lib/analysis/rank-counterparties';
import { formatAmount } from './format';

export function CounterpartiesPanel({ transactions }: { transactions: Transaction[] }) {
  const rankings = rankCounterparties(transactions).slice(0, 10);

  if (rankings.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold">Who you transact with most</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Ranked by total value moved, in and out.
      </p>

      <ul className="mt-4 divide-y divide-border">
        {rankings.map(party => (
          <li key={party.displayName} className="flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm">{party.displayName}</span>

            <span className="tabular w-8 shrink-0 text-right text-xs text-muted-foreground">
              {party.transactionCount}×
            </span>

            <span className="tabular w-28 shrink-0 text-right text-sm">
              {party.totalPaidInCents > 0 ? `−${formatAmount(party.totalPaidInCents)}` : ''}
            </span>

            <span className="tabular hidden w-28 shrink-0 text-right text-sm text-[var(--color-money-in)] sm:block">
              {party.totalReceivedInCents > 0
                ? `+${formatAmount(party.totalReceivedInCents)}`
                : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}