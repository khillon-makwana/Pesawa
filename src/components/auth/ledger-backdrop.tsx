/*
 * Decorative texture for the dark half of the auth screens: faded rows of
 * statement-shaped text, as if the panel were printed over a ledger. Entirely
 * fictional figures, and hidden from assistive tech — it carries no meaning.
 */
const LEDGER_ROWS = [
  '2024-03-29 08:14:22 · REF QK91LM884X · KES +14,500.00 · CUSTOMER TRANSFER',
  '2024-03-29 09:37:05 · REF QK92RT019B · KES  -1,200.00 · KPLC PREPAID',
  '2024-03-29 11:42:19 · REF QK93ZZ491C · KES  -4,850.00 · NAIROBI WATER',
  '2024-03-29 14:03:52 · REF QK94TR320E · KES +85,000.00 · SALARY CLEARING',
  '2024-03-29 16:20:10 · REF QK95MM102P · KES    -750.00 · AIRTIME PURCHASE',
  '2024-03-29 18:05:44 · REF QK96VB903Q · KES -12,400.00 · MERCHANT TILL 58129',
  '2024-03-30 07:11:09 · REF QK97OP114M · KES  +3,200.00 · REVERSAL REFUND',
  '2024-03-30 10:48:31 · REF QK98KD225N · KES  -2,798.38 · SENT TO ASHA W.',
  '2024-03-30 13:26:07 · REF QK99FG336R · KES    -518.42 · SENT TO BRIAN O.',
  '2024-03-30 19:52:40 · REF QL01HJ447S · KES    +142.16 · INTEREST EARNED',
];

export function LedgerBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none space-y-1 overflow-hidden font-mono text-[0.6875rem] leading-relaxed whitespace-nowrap text-primary-foreground/10 select-none ${className ?? ''}`}
    >
      {LEDGER_ROWS.map(row => (
        <p key={row}>{row}</p>
      ))}
    </div>
  );
}
