import type { Transaction } from '@/lib/parser/types';
import { summariseMoneyFlow } from '@/lib/analysis/summarise-money-flow';
import { formatKsh } from './format';

/**
 * The top of the report: what came in and what went out.
 *
 * Money in is not the same as income on M-PESA — it includes cash you
 * deposited yourself, Fuliza loans and reversals — and money out includes
 * what went into savings. As the largest figures on the page they would
 * overstate both, so each carries its breakdown right underneath rather than
 * somewhere further down.
 *
 * The figures are near-white rather than green and dark: the money-in green is
 * too dark to read on this surface, so the labels and signs say which is which
 * and colour is not needed to tell them apart.
 */
export function MoneySummary({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return null;
  }

  const flow = summariseMoneyFlow(transactions);

  return (
    <section className="rounded-lg bg-surface-deep p-6 text-primary-foreground sm:p-8">
      <h2 className="eyebrow flex items-center gap-2 text-primary-foreground/60">
        <span aria-hidden className="text-accent-bright">
          ■
        </span>
        Money in and out
      </h2>

      {/* Two columns only from md: below that the figures need the full width. */}
      <dl className="mt-5 grid gap-8 md:grid-cols-2 md:gap-10">
        <Figure
          label="Money in"
          sign="+"
          cents={flow.totalInInCents}
          note={
            flow.depositsLoansAndReversalsInCents > 0
              ? `Includes ${formatKsh(flow.depositsLoansAndReversalsInCents)} of cash you deposited, Fuliza loans or reversals.`
              : null
          }
        />
        <Figure
          label="Money out"
          sign="−"
          cents={flow.totalOutInCents}
          note={
            flow.movedToSavingsInCents > 0
              ? `Includes ${formatKsh(flow.movedToSavingsInCents)} moved to savings.`
              : null
          }
        />
      </dl>

      <p className="mt-6 border-t border-white/10 pt-4 text-sm text-primary-foreground/70">
        {describeNet(flow.netInCents)}
      </p>
    </section>
  );
}

function Figure({
  label,
  sign,
  cents,
  note
}: {
  label: string;
  sign: string;
  cents: number;
  note: string | null;
}) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow text-primary-foreground/60">{label}</dt>
      <dd className="tabular mt-2 text-3xl font-semibold lg:text-4xl">
        {cents > 0 ? sign : ''}
        {formatKsh(cents)}
      </dd>
      {note !== null && (
        <dd className="mt-2 max-w-xs text-sm text-primary-foreground/70">{note}</dd>
      )}
    </div>
  );
}

function describeNet(netInCents: number): string {
  if (netInCents > 0) {
    return `${formatKsh(netInCents)} more came in than went out.`;
  }
  if (netInCents < 0) {
    return `${formatKsh(-netInCents)} more went out than came in.`;
  }
  return 'Exactly as much came in as went out.';
}
