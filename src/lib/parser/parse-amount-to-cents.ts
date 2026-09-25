/**
 * Converts an amount as printed on a statement into integer cents.
 *   "1,500.00"  ->  150000
 *   "-7.00"     ->  700      (sign is dropped; direction lives elsewhere)
 *   ""          ->  null     (blank cell)
 *
 * Deliberately avoids parseFloat. `parseFloat("1842.50") * 100` gives
 * 184250.00000000003, and rounding that away works until it doesn't. Splitting
 * the string keeps the arithmetic exact.
 */
export function parseAmountToCents(printedAmount: string): number | null {
  const cleaned = printedAmount.replace(/[\s,]/g, '').replace(/^[-+]/, '');

  if (cleaned === '') {
    return null;
  }

  const match = cleaned.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    return null;
  }

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '0').padEnd(2, '0'));

  return whole * 100 + fraction;
}
