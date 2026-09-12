import type { Transaction } from '@/lib/parser/types';
import { summarisePaymentTiming } from '@/lib/analysis/summarise-payment-timing';

export function TimingPanel({ transactions }: { transactions: Transaction[] }) {
  const timing = summarisePaymentTiming(transactions);

  if (timing.busiestHourLabel === null) {
    return null;
  }

  const peakCount = Math.max(...timing.byHour.map(bucket => bucket.transactionCount));

  return (
    <section className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold">When you transact</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Busiest around {timing.busiestHourLabel}, and on {timing.busiestWeekdayLabel}s.
      </p>

      {/*
        Each bar carries a title and an aria-label, so the chart is readable by
        keyboard and screen reader rather than by hover alone.
      */}
      <div
        className="mt-6 flex h-24 items-end gap-1"
        role="img"
        aria-label={`Transactions by hour of day. Busiest around ${timing.busiestHourLabel}.`}
      >
        {timing.byHour.map(bucket => (
          <div
            key={bucket.label}
            title={`${bucket.label}: ${bucket.transactionCount} transactions`}
            className="flex-1 rounded-sm bg-primary/80 transition-colors hover:bg-primary"
            style={{
              height: `${Math.max((bucket.transactionCount / peakCount) * 100, 2)}%`,
              opacity: bucket.transactionCount === 0 ? 0.15 : 1
            }}
          />
        ))}
      </div>

      <div className="mt-2 flex text-xs text-muted-foreground">
        <span className="flex-1">12am</span>
        <span className="flex-1 text-center">12pm</span>
        <span className="flex-1 text-right">11pm</span>
      </div>
    </section>
  );
}