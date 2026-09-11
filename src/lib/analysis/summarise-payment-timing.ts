import type { Transaction } from '../parser/types';

export interface TimingBucket {
  label: string;
  transactionCount: number;
  totalInCents: number;
}

export interface PaymentTimingSummary {
  /** 24 buckets, midnight to 11pm, always present even when empty. */
  byHour: TimingBucket[];
  /** 7 buckets, Monday to Sunday. */
  byWeekday: TimingBucket[];
  busiestHourLabel: string | null;
  busiestWeekdayLabel: string | null;
}

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Statements are in East Africa Time; timestamps are stored as UTC. */
const EAT_OFFSET_HOURS = 3;

function toEastAfricaTime(isoTimestamp: string): Date {
  return new Date(new Date(isoTimestamp).getTime() + EAT_OFFSET_HOURS * 3_600_000);
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12am';
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return '12pm';
  return `${hour - 12}pm`;
}

/**
 * Counts transactions by hour of day and day of week.
 *
 * Charges are excluded — they inherit their parent's timestamp, so counting
 * them would double every hour in which a fee was incurred.
 *
 * Empty buckets are kept so a chart has a continuous axis rather than gaps.
 */
export function summarisePaymentTiming(transactions: Transaction[]): PaymentTimingSummary {
  const counted = transactions.filter(transaction => transaction.type !== 'charge');

  const byHour: TimingBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    label: formatHourLabel(hour),
    transactionCount: 0,
    totalInCents: 0
  }));

  const byWeekday: TimingBucket[] = WEEKDAY_LABELS.map(label => ({
    label,
    transactionCount: 0,
    totalInCents: 0
  }));

  for (const transaction of counted) {
    const localTime = toEastAfricaTime(transaction.completedAt);

    const hourBucket = byHour[localTime.getUTCHours()];
    hourBucket.transactionCount += 1;
    hourBucket.totalInCents += transaction.amount;

    // getUTCDay() is 0 for Sunday; shift so Monday is index 0.
    const weekdayIndex = (localTime.getUTCDay() + 6) % 7;
    const weekdayBucket = byWeekday[weekdayIndex];
    weekdayBucket.transactionCount += 1;
    weekdayBucket.totalInCents += transaction.amount;
  }

  return {
    byHour,
    byWeekday,
    busiestHourLabel: busiestLabel(byHour),
    busiestWeekdayLabel: busiestLabel(byWeekday)
  };
}

function busiestLabel(buckets: TimingBucket[]): string | null {
  const busiest = buckets.reduce((best, bucket) =>
    bucket.transactionCount > best.transactionCount ? bucket : best
  );
  return busiest.transactionCount === 0 ? null : busiest.label;
}