/** Amounts appear dozens of times per screen — one formatter, used everywhere. */
export function formatKsh(cents: number): string {
  return `KSh ${(cents / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/** Without the currency prefix, for dense columns where it would be noise. */
export function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
