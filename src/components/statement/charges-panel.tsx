import type { Transaction } from '@/lib/parser/types';
import { summariseCharges } from '@/lib/analysis/summarise-charges';
import { formatKsh } from './format';
import { Panel } from './panel';

/**
 * What the fees came to. Still the number most people have never added up, so
 * it keeps the orange it has everywhere else — but it is one panel of the
 * report now rather than its headline.
 */
export function ChargesPanel({ transactions }: { transactions: Transaction[] }) {
  const charges = summariseCharges(transactions);

  if (charges.chargeCount === 0) {
    return null;
  }

  const stats = [
    { label: 'Average', value: formatKsh(charges.averageChargeInCents) },
    { label: 'Largest', value: formatKsh(charges.largestChargeInCents) },
    ...(charges.shareOfSpendingPercent !== null
      ? [{ label: 'Of spending', value: `${charges.shareOfSpendingPercent}%` }]
      : [])
  ];

  return (
    <Panel
      title="What M-PESA charged you"
      aside={`${charges.chargeCount} ${charges.chargeCount === 1 ? 'charge' : 'charges'}`}
    >
      <p className="tabular text-3xl font-semibold text-accent">
        {formatKsh(charges.totalChargesInCents)}
      </p>
      {/*
        Only transfer and paybill charges are recognised on real statements
        so far, so this says "recorded as charges" rather than naming kinds
        of fee it may not have seen.
      */}
      <p className="mt-1 text-sm text-muted-foreground">
        The fees recorded as charges on this statement, added up.
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        {stats.map(stat => (
          <div key={stat.label}>
            <dt className="eyebrow text-muted-foreground">{stat.label}</dt>
            <dd className="tabular mt-1 font-medium">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
