import { Badge } from '@/components/ui/badge';

/*
 * A still of what the results screen produces, shown beside the hero so the
 * page can make its promise visually rather than only in prose. Static and
 * decorative: the figures are fictional, matching the shipped sample
 * statements in shape, and the whole card is hidden from assistive tech
 * because the real thing is one click away.
 */
const ROWS = [
  {
    date: '12 Oct',
    time: '08:41',
    ref: 'QG94KN29L',
    party: 'Asha Wambui',
    kind: 'Merchant payment',
    fee: '-14.81',
    amount: '-2,450.00',
    incoming: false
  },
  {
    date: '11 Oct',
    time: '19:15',
    ref: 'QG81PP04Z',
    party: 'Kenneth Omondi',
    kind: 'Customer transfer',
    fee: '0.00',
    amount: '+35,948.62',
    incoming: true
  },
  {
    date: '10 Oct',
    time: '14:02',
    ref: 'QG79LA11C',
    party: 'KPLC Prepaid',
    kind: 'Paybill 888880',
    fee: '-23.00',
    amount: '-1,000.00',
    incoming: false
  },
  {
    date: '09 Oct',
    time: '11:28',
    ref: 'QG70BB88X',
    party: 'Safaricom Data',
    kind: 'Airtime purchase',
    fee: '0.00',
    amount: '-500.00',
    incoming: false
  }
];

export function ReceiptPreview() {
  return (
    <div aria-hidden className="rotate-[1.25deg]">
      <div className="rounded-xl border border-border bg-card p-6 shadow-[0_24px_60px_-30px_rgb(12_59_42_/_0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-heading text-lg font-bold">Statement summary</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              254 712 ••• 894 · 1–31 Oct
            </p>
          </div>
          <Badge variant="money-in">Reconciled</Badge>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-10 gap-y-3 rounded-md bg-muted/60 px-4 py-3">
          <div>
            <p className="eyebrow text-muted-foreground">Total charges</p>
            <p className="tabular mt-1 text-lg font-semibold text-accent">KSh 1,284.50</p>
          </div>
          <div>
            <p className="eyebrow text-muted-foreground">Net inflow</p>
            <p className="tabular mt-1 text-lg font-semibold text-[var(--color-money-in)]">
              +KSh 42,910.00
            </p>
          </div>
        </div>

        <table className="mt-5 w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-foreground/80">
              <th className="eyebrow pb-2 text-muted-foreground">Date</th>
              <th className="eyebrow pb-2 text-muted-foreground">Counterparty</th>
              <th className="eyebrow pb-2 text-right text-muted-foreground">Fee</th>
              <th className="eyebrow pb-2 text-right text-muted-foreground">Amount</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr key={row.ref} className="border-b border-border last:border-0">
                <td className="py-3 pr-3 align-top">
                  <p className="tabular text-xs">
                    {row.date} {row.time}
                  </p>
                  <p className="tabular text-[0.625rem] text-muted-foreground">
                    {row.ref}
                  </p>
                </td>
                <td className="py-3 pr-3 align-top">
                  <p className="text-sm font-medium">{row.party}</p>
                  <p className="text-xs text-muted-foreground">{row.kind}</p>
                </td>
                <td
                  className={`tabular py-3 pr-3 text-right align-top text-xs ${
                    row.fee === '0.00' ? 'text-muted-foreground' : 'text-accent'
                  }`}
                >
                  {row.fee}
                </td>
                <td
                  className={`tabular py-3 text-right align-top text-sm font-medium ${
                    row.incoming ? 'text-[var(--color-money-in)]' : 'text-foreground'
                  }`}
                >
                  {row.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="eyebrow mt-5 border-t border-border pt-4 text-muted-foreground">
          Running balance checks out · Illustration only
        </p>
      </div>
    </div>
  );
}
