import type { Transaction } from '@/lib/parser/types';
import { summariseMoneyFlow } from '@/lib/analysis/summarise-money-flow';
import { formatKsh } from './format';
import { Panel } from './panel';

/*
 * Categories arrive sorted largest first, so colour by rank down the green
 * ramp defined in globals.css. Charges are the exception: they keep the orange
 * they are given everywhere else on the page, wherever they happen to rank.
 */
const CATEGORY_RAMP_LENGTH = 6;
const CHARGES_LABEL = 'M-PESA charges';

function colourFor(label: string, rank: number) {
  if (label === CHARGES_LABEL) {
    return 'var(--accent)';
  }
  return `var(--category-${(rank % CATEGORY_RAMP_LENGTH) + 1})`;
}

export function MoneyFlowPanel({ transactions }: { transactions: Transaction[] }) {
  const flow = summariseMoneyFlow(transactions);

  if (transactions.length === 0 || flow.spendingByCategory.length === 0) {
    return null;
  }

  const categories = flow.spendingByCategory.map((category, index) => ({
    ...category,
    colour: colourFor(category.label, index)
  }));

  return (
    <Panel
      title="Where your money went"
      aside={`${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`}
    >
      {/*
        One stacked bar for the shape of the spending, then the same numbers as
        a list. The bar is decoration over the list, not a replacement for it —
        without CSS the list still reads correctly.
      */}
      <div role="presentation" className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {categories.map(category => (
          <div
            key={category.label}
            style={{
              width: `${category.shareOfTotalPercent}%`,
              backgroundColor: category.colour
            }}
          />
        ))}
      </div>

      <ul className="mt-5 divide-y divide-border">
        {categories.map(category => (
          <li
            key={category.label}
            className="flex items-baseline justify-between gap-4 py-3"
          >
            <span className="flex min-w-0 items-center gap-2.5 text-sm">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: category.colour }}
              />
              <span className="truncate">{category.label}</span>
            </span>

            <span className="shrink-0 text-right">
              <span
                className={`tabular block text-sm font-medium ${
                  category.label === CHARGES_LABEL ? 'text-accent' : ''
                }`}
              >
                {formatKsh(category.totalInCents)}
              </span>
              <span className="tabular block text-xs text-muted-foreground">
                {category.shareOfTotalPercent}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
