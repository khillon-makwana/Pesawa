import type { Transaction } from '../parser/types';

export interface CounterpartyRanking {
  /** Unique per entry, so two people sharing a name stay separable. */
  key: string;
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
 * Collects the phone numbers each normalised name was seen with.
 *
 * Used to decide whether a name is ambiguous. Names alone group two different
 * people with the same name into one entry, but adding the phone to every key
 * would be worse: the same person appears both with and without a number
 * depending on the row, and they would split in two.
 */
function collectPhonesByName(transactions: Transaction[]): Map<string, Set<string>> {
  const phonesByName = new Map<string, Set<string>>();

  for (const transaction of transactions) {
    if (transaction.type === 'charge' || transaction.counterpartyName === null) {
      continue;
    }

    const nameKey = normaliseCounterpartyKey(transaction.counterpartyName);
    if (nameKey === '') {
      continue;
    }

    const phones = phonesByName.get(nameKey) ?? new Set<string>();

    if (transaction.counterpartyPhone !== null) {
      phones.add(transaction.counterpartyPhone);
    }

    phonesByName.set(nameKey, phones);
  }

  return phonesByName;
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
  const phonesByName = collectPhonesByName(transactions);

  for (const transaction of transactions) {
    if (transaction.type === 'charge' || transaction.counterpartyName === null) {
      continue;
    }

    const nameKey = normaliseCounterpartyKey(transaction.counterpartyName);
    if (nameKey === '') {
      continue;
    }

    /*
     * The phone joins the key only for a name seen with more than one number,
     * which is the case where two different people share a name. Everywhere
     * else the name alone still groups them, so rows that happen to carry no
     * number stay with the rest of that party's transactions.
     */
    const isAmbiguousName = (phonesByName.get(nameKey)?.size ?? 0) > 1;
    const key = isAmbiguousName
      ? `${nameKey}|${transaction.counterpartyPhone ?? 'no-number'}`
      : nameKey;

    const existing = rankingsByKey.get(key);

    if (existing === undefined) {
      rankingsByKey.set(key, {
        key,
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