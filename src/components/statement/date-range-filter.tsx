'use client';

import type { Transaction } from '@/lib/parser/types';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface DateRange {
  from: string; // "YYYY-MM-DD", or "" for no limit
  to: string;
}

export const WHOLE_RANGE: DateRange = { from: '', to: '' };

/**
 * Keeps the transactions that fall inside the range.
 *
 * `completedAt` is an ISO timestamp, so its first ten characters are the date.
 * Comparing those as strings is correct for ISO dates and avoids pulling in a
 * date library to answer a question this simple.
 */
export function filterByDateRange(
  transactions: Transaction[],
  range: DateRange
): Transaction[] {
  return transactions.filter(transaction => {
    const date = transaction.completedAt.slice(0, 10);

    if (range.from !== '' && date < range.from) {
      return false;
    }

    if (range.to !== '' && date > range.to) {
      return false;
    }

    return true;
  });
}

export function DateRangeFilter({
  range,
  onChange,
  resultCount
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
  resultCount: number;
}) {
  const isFiltered = range.from !== '' || range.to !== '';

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-4">
      <div>
        <Label htmlFor="range-from">From</Label>
        <Input
          id="range-from"
          type="date"
          value={range.from}
          onChange={event => onChange({ ...range, from: event.target.value })}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="range-to">To</Label>
        <Input
          id="range-to"
          type="date"
          value={range.to}
          onChange={event => onChange({ ...range, to: event.target.value })}
          className="mt-1.5"
        />
      </div>

      <p className="tabular flex-1 text-sm text-muted-foreground">
        {resultCount} transaction{resultCount === 1 ? '' : 's'}
        {isFiltered ? ' in range' : ' saved'}
      </p>

      {isFiltered && (
        <Button variant="outline" size="sm" onClick={() => onChange(WHOLE_RANGE)}>
          Clear
        </Button>
      )}
    </div>
  );
}
