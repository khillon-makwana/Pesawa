import type { Transaction } from '../parser/types';

export interface CounterpartyRanking {
  displayName: string;
  phone: string | null;
  transactionCount: number;
  totalPaidInCents: number;
  totalReceivedInCents: number;
  netInCents: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

/**
 * Names print inconsistently across a statement — casing varies, and merchant
 * names carry extra whitespace from wrapped cells. Normalising gives a stable
 * key so the same party groups into one entry.
 */
function normaliseCounterpartyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')   // drop punctuation, keep word boundaries
    .replace(/\s+/g, ' ')          // collapse runs of whitespace
    .trim();
}

/**
 * Groups transactions by who they were with, ranked by total value moved.
 *
 * Charges are excluded — they have no counterparty, and a "fees" entry would
 * dominate a list meant to show who you deal with. Charge totals belong in
 * summariseCharges instead.
 *
 * Ranking is by gross value moved (paid + received), not net, so a party you
 * both pay and receive from does not cancel itself out of the list.
 */
export function rankCounterparties(transactions: Transaction[]): CounterpartyRanking[] {
  const rankingsByKey = new Map<string, CounterpartyRanking>();

  for (const transaction of transactions) {
    if (transaction.type === 'charge' || transaction.counterpartyName === null) {
      continue;
    }

    const key = normaliseCounterpartyKey(transaction.counterpartyName);
    if (key === '') {
      continue;
    }

    const existing = rankingsByKey.get(key);

    if (existing === undefined) {
      rankingsByKey.set(key, {
        displayName: transaction.counterpartyName,
        phone: transaction.counterpartyPhone,
        transactionCount: 1,
        totalPaidInCents: transaction.direction === 'out' ? transaction.amount : 0,
        totalReceivedInCents: transaction.direction === 'in' ? transaction.amount : 0,
        netInCents: transaction.direction === 'in' ? transaction.amount : -transaction.amount,
        firstSeenAt: transaction.completedAt,
        lastSeenAt: transaction.completedAt
      });
      continue;
    }

    existing.transactionCount += 1;
    existing.phone = existing.phone ?? transaction.counterpartyPhone;

    if (transaction.direction === 'out') {
      existing.totalPaidInCents += transaction.amount;
      existing.netInCents -= transaction.amount;
    } else {
      existing.totalReceivedInCents += transaction.amount;
      existing.netInCents += transaction.amount;
    }

    if (transaction.completedAt < existing.firstSeenAt) {
      existing.firstSeenAt = transaction.completedAt;
    }
    if (transaction.completedAt > existing.lastSeenAt) {
      existing.lastSeenAt = transaction.completedAt;
    }
  }

  return [...rankingsByKey.values()].sort(
    (a, b) =>
      b.totalPaidInCents + b.totalReceivedInCents - (a.totalPaidInCents + a.totalReceivedInCents)
  );
}