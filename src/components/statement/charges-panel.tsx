import type { Transaction } from '@/lib/parser/types';
import { summariseCharges } from '@/lib/analysis/summarise-charges';
import { formatKsh } from './format';

/**
 * The single number most people have never seen. It gets the darkest surface
 * on the page and the largest type — nothing else competes for that role.
 */
export function ChargesPanel({ transactions }: { transactions: Transaction[] }) {
  const charges = summariseCharges(transactions);

  if (charges.chargeCount === 0) {
    return null;
  }

  const stats = [
    { label: 'Charges', value: String(charges.chargeCount) },
    { label: 'Average', value: formatKsh(charges.averageChargeInCents) },
    { label: 'Largest', value: formatKsh(charges.largestChargeInCents) },
    ...(charges.shareOfSpendingPercent !== null
      ? [{ label: 'Of spending', value: `${charges.shareOfSpendingPercent}%` }]
      : [])
  ];

  return (
    <section className="rounded-lg bg-surface-deep p-6 text-primary-foreground sm:p-8">
      <h3 className="eyebrow flex items-center gap-2 text-primary-foreground/60">
        <span aria-hidden className="text-accent-bright">
          ■
        </span>
        What M-PESA charged you
      </h3>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <p className="tabular text-4xl font-semibold text-accent-bright sm:text-6xl">
            {formatKsh(charges.totalChargesInCents)}
          </p>
          <p className="mt-2 max-w-sm text-sm text-primary-foreground/60">
            Tariffs, paybill commissions and withdrawal fees, added up across the whole
            statement.
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-10 gap-y-5 sm:grid-cols-4">
          {stats.map(stat => (
            <div key={stat.label}>
              <dt className="eyebrow text-primary-foreground/50">{stat.label}</dt>
              <dd className="tabular mt-1 text-xl font-medium">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
