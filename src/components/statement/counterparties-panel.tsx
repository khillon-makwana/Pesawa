import type { Transaction } from '@/lib/parser/types';
import { rankCounterparties } from '@/lib/analysis/rank-counterparties';
import { formatAmount } from './format';
import { Panel } from './panel';

export function CounterpartiesPanel({ transactions }: { transactions: Transaction[] }) {
  const rankings = rankCounterparties(transactions).slice(0, 10);

  if (rankings.length === 0) {
    return null;
  }

  return (
    <Panel
      title="Who you transact with most"
      subtitle="Ranked by total value moved, in and out."
    >
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            <th className="eyebrow pb-2 font-normal text-muted-foreground">
              Entity / counterparty
            </th>
            <th className="eyebrow pb-2 text-center font-normal text-muted-foreground">
              Vol
            </th>
            <th className="eyebrow pb-2 text-right font-normal text-muted-foreground">
              Outflow
            </th>
            <th className="eyebrow hidden pb-2 text-right font-normal text-muted-foreground sm:table-cell">
              Inflow
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rankings.map(party => (
            <tr key={party.displayName}>
              <td className="max-w-[1px] truncate py-2.5 pr-3 text-sm">
                {party.displayName}
              </td>

              <td className="py-2.5 text-center">
                <span className="tabular text-xs text-muted-foreground">
                  {party.transactionCount}×
                </span>
              </td>

              <td className="tabular py-2.5 pl-3 text-right text-sm whitespace-nowrap">
                {party.totalPaidInCents > 0
                  ? `−${formatAmount(party.totalPaidInCents)}`
                  : '—'}
              </td>

              <td className="tabular hidden py-2.5 pl-3 text-right text-sm whitespace-nowrap text-[var(--color-money-in)] sm:table-cell">
                {party.totalReceivedInCents > 0
                  ? `+${formatAmount(party.totalReceivedInCents)}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
