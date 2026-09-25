import type { Transaction, ParseIssue } from '../parser/types';

/**
 * Escapes a value for CSV. Fields containing commas, quotes or newlines must be
 * quoted, and embedded quotes doubled. Counterparty names and raw details both
 * contain commas regularly, so this is not optional.
 */
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(',');
}

/**
 * Money is written as a decimal string rather than cents, because this file is
 * for spreadsheets and humans. The integer-cents rule applies inside the app,
 * not at its edges.
 */
function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function buildTransactionsCsv(transactions: Transaction[]): string {
  const header = toCsvRow([
    'Receipt No',
    'Date',
    'Time',
    'Type',
    'Direction',
    'Counterparty',
    'Phone',
    'Amount',
    'Balance After',
    'Is Revenue',
    'Charge For',
    'Confidence',
    'Details'
  ]);

  const rows = transactions.map(transaction => {
    const completedAt = new Date(transaction.completedAt);

    return toCsvRow([
      transaction.receiptNo,
      completedAt.toISOString().slice(0, 10),
      completedAt.toISOString().slice(11, 19),
      transaction.type,
      transaction.direction,
      transaction.counterpartyName ?? '',
      transaction.counterpartyPhone ?? '',
      centsToDecimalString(transaction.amount),
      centsToDecimalString(transaction.balanceAfter),
      transaction.isRevenue ? 'yes' : 'no',
      transaction.chargeForReceipt ?? '',
      transaction.confidence,
      // Newlines from wrapped PDF cells would break the row
      transaction.detailsRaw.replace(/\s+/g, ' ')
    ]);
  });

  return [header, ...rows].join('\r\n');
}

export function buildIssuesCsv(issues: ParseIssue[]): string {
  const header = toCsvRow(['Type', 'Page', 'Detail', 'Raw Text']);

  const rows = issues.map(issue =>
    toCsvRow([
      issue.type,
      issue.page?.toString() ?? '',
      issue.detail,
      (issue.rawText ?? '').replace(/\s+/g, ' ')
    ])
  );

  return [header, ...rows].join('\r\n');
}
