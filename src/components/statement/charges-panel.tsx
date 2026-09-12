import type { Transaction } from '@/lib/parser/types';
import { summariseCharges } from '@/lib/analysis/summarise-charges';
import { formatKsh } from './format';

/**
 * The single number most people have never seen. It gets the accent colour and
 * the largest type on the page — nothing else competes for that role.
 */
export function ChargesPanel({ transactions }: { transactions: Transaction[] }) {
  const charges = summariseCharges(transactions);

  if (charges.chargeCount === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border bg-card p-6">
      <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        What M-PESA charged you
      </h3>

      <p className="tabular mt-2 text-4xl font-semibold text-[var(--color-accent)] sm:text-5xl">
        {formatKsh(charges.totalChargesInCents)}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Charges</dt>
          <dd className="tabular mt-0.5 font-medium">{charges.chargeCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Average</dt>
          <dd className="tabular mt-0.5 font-medium">
            {formatKsh(charges.averageChargeInCents)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Largest</dt>
          <dd className="tabular mt-0.5 font-medium">
            {formatKsh(charges.largestChargeInCents)}
          </dd>
        </div>
        {charges.shareOfSpendingPercent !== null && (
          <div>
            <dt className="text-muted-foreground">Of spending</dt>
            <dd className="tabular mt-0.5 font-medium">
              {charges.shareOfSpendingPercent}%
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}