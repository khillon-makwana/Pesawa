import type { Transaction } from '@/lib/parser/types';
import { summarisePaymentTiming } from '@/lib/analysis/summarise-payment-timing';
import { Panel } from './panel';

export function TimingPanel({ transactions }: { transactions: Transaction[] }) {
  const timing = summarisePaymentTiming(transactions);

  if (timing.busiestHourLabel === null) {
    return null;
  }

  const peakCount = Math.max(...timing.byHour.map(bucket => bucket.transactionCount));

  return (
    <Panel
      title="When you transact"
      subtitle={`Busiest around ${timing.busiestHourLabel}, and on ${timing.busiestWeekdayLabel}s.`}
    >
      {/*
        Each bar carries a title and an aria-label, so the chart is readable by
        keyboard and screen reader rather than by hover alone.
      */}
      <div
        className="flex h-28 items-end gap-1"
        role="img"
        aria-label={`Transactions by hour of day. Busiest around ${timing.busiestHourLabel}.`}
      >
        {timing.byHour.map(bucket => {
          const isPeak = bucket.transactionCount === peakCount && peakCount > 0;

          return (
            <div
              key={bucket.label}
              title={`${bucket.label}: ${bucket.transactionCount} transactions`}
              className={`flex-1 rounded-sm transition-colors ${
                isPeak
                  ? 'bg-[var(--chart-peak)]'
                  : 'bg-[var(--color-money-in)]/35 hover:bg-[var(--color-money-in)]/60'
              }`}
              style={{
                height: `${Math.max((bucket.transactionCount / peakCount) * 100, 2)}%`,
                opacity: bucket.transactionCount === 0 ? 0.25 : 1
              }}
            />
          );
        })}
      </div>

      <div className="eyebrow mt-2 flex text-muted-foreground">
        <span className="flex-1">12am</span>
        <span className="flex-1 text-center">{timing.busiestHourLabel} peak</span>
        <span className="flex-1 text-right">11pm</span>
      </div>
    </Panel>
  );
}
