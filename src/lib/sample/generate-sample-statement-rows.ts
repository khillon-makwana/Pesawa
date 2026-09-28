import type { RawRow } from '../parser/types';

/**
 * Builds a realistic but entirely fictional M-PESA statement.
 *
 * Every name, phone number and receipt number here is invented. The data is
 * balance-consistent, so a statement rendered from it verifies cleanly — except
 * where a defect is deliberately seeded.
 *
 * This is separate from the test StatementBuilder on purpose: that one produces
 * expected parser output for assertions, this one produces plausible-looking
 * statements for a demo. Sharing them would couple test correctness to demo
 * presentation.
 */

const PEOPLE = [
  'ASHA WAMBUI',
  'DAVID OCHIENG',
  'GRACE KIPROTICH',
  'JOSEPH MUTUA',
  'LINDA ACHIENG',
  'PETER NJOROGE',
  'SARAH WANGARI',
  'BRIAN OTIENO'
];

const MERCHANTS = [
  { name: 'NAIVAS SUPERMARKET', till: '4055567' },
  { name: 'JAVA HOUSE WESTLANDS', till: '5511234' },
  { name: 'CHICKEN INN SARIT', till: '6720098' },
  { name: 'QUICKMART KILIMANI', till: '3390045' }
];

const BILLERS = [
  { name: 'KPLC PREPAID', shortcode: '888880', account: '54123987' },
  { name: 'NAIROBI WATER', shortcode: '444400', account: 'A2298761' },
  { name: 'ZUKU FIBRE', shortcode: '320320', account: '9087123' }
];

/** Deterministic pseudo-random so the sample is identical every time. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * A phone number printed the way Safaricom prints them on statements, with
 * the middle digits hidden: 254700***101.
 *
 * Masked for the same reason real statements mask them. A full 2547 number
 * made up at random could easily be someone's real line, and the samples are
 * public. It takes exactly one draw from `random`, as the unmasked version
 * did, so every other value in the sample comes out the same.
 */
function maskedPhoneNumber(random: () => number): string {
  const digits = String(Math.floor(random() * 90000000 + 10000000));
  return `2547${digits.slice(0, 2)}***${digits.slice(5)}`;
}

function formatCents(cents: number): string {
  const decimal = (Math.abs(cents) / 100).toFixed(2);
  const [whole, fraction] = decimal.split('.');
  const formatted = `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
  return cents < 0 ? `-${formatted}` : formatted;
}

function generateReceiptNumber(random: () => number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let receipt = '';
  for (let i = 0; i < 10; i += 1) {
    receipt += characters[Math.floor(random() * characters.length)];
  }
  return receipt;
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

export interface SampleStatement {
  /** Newest first, as a real statement prints them. */
  rows: RawRow[];
  openingBalanceInCents: number;
  closingBalanceInCents: number;
  periodStart: string;
  periodEnd: string;
}

export interface SampleOptions {
  seed?: number;
  transactionCount?: number;
  /** Omit one transaction, as Safaricom did on the real test statement. */
  seedMissingTransaction?: boolean;
}

export function generateSampleStatement(options: SampleOptions = {}): SampleStatement {
  const random = createRandom(options.seed ?? 42);
  const targetCount = options.transactionCount ?? 90;

  const rows: RawRow[] = [];
  const openingBalanceInCents = 1_250_00;
  let balance = openingBalanceInCents;
  let clock = new Date('2026-06-01T08:14:00');

  function advanceClock(): string {
    // Between 20 minutes and 9 hours, so transactions spread across days
    clock = new Date(clock.getTime() + (20 + random() * 520) * 60_000);
    return clock.toISOString().slice(0, 19).replace('T', ' ');
  }

  function addRow(
    details: string,
    amountInCents: number,
    direction: 'in' | 'out',
    sharedReceipt?: string,
    sharedTime?: string
  ): { receiptNo: string; completionTime: string } {
    const receiptNo = sharedReceipt ?? generateReceiptNumber(random);
    const completionTime = sharedTime ?? advanceClock();

    balance += direction === 'in' ? amountInCents : -amountInCents;

    rows.push({
      receiptNo,
      completionTime,
      details,
      status: 'Completed',
      paidIn: direction === 'in' ? formatCents(amountInCents) : '',
      withdrawn: direction === 'in' ? '' : `-${formatCents(amountInCents)}`,
      balance: formatCents(balance),
      page: 1
    });

    return { receiptNo, completionTime };
  }

  while (rows.length < targetCount) {
    const roll = random();

    // A real M-PESA balance never goes negative, so force money in whenever
    // the account runs low rather than letting spending outpace income.
    const needsTopUp = balance < 5_000_00;

    if (roll < 0.12 || needsTopUp) {
      const sender = pick(PEOPLE, random);
      addRow(
        `Funds received from - ${maskedPhoneNumber(random)} ${sender}`,
        Math.round((8_000 + random() * 40_000) * 100),
        'in'
      );
      continue;
    }

    if (roll < 0.45) {
      // Send money, with its charge sharing the receipt number and timestamp
      const recipient = pick(PEOPLE, random);
      const amount = Math.round((100 + random() * 3_000) * 100);
      const { receiptNo, completionTime } = addRow(
        `Customer Transfer to - ${maskedPhoneNumber(random)} ${recipient}`,
        amount,
        'out'
      );
      addRow(
        'Customer Transfer of Funds Charge',
        amount > 100_00 ? 13_00 : 7_00,
        'out',
        receiptNo,
        completionTime
      );
      continue;
    }

    if (roll < 0.72) {
      const merchant = pick(MERCHANTS, random);
      addRow(
        `Merchant Payment to ${merchant.till} - ${merchant.name}`,
        Math.round((80 + random() * 2_500) * 100),
        'out'
      );
      continue;
    }

    if (roll < 0.88) {
      const biller = pick(BILLERS, random);
      const amount = Math.round((300 + random() * 4_000) * 100);
      const { receiptNo, completionTime } = addRow(
        `Pay Bill to ${biller.shortcode} - ${biller.name} Acc. ${biller.account}`,
        amount,
        'out'
      );
      addRow('Pay Bill Charge', 20_00, 'out', receiptNo, completionTime);
      continue;
    }

    if (roll < 0.96) {
      addRow(
        `Customer Bundle Purchase to 4093441SAFARICOM DATA BUNDLES by - 254700***000 SAMPLE USER`,
        Math.round((20 + random() * 1_000) * 100),
        'out'
      );
      continue;
    }

    addRow('Airtime Purchase', Math.round((20 + random() * 200) * 100), 'out');
  }

  // Safaricom occasionally omits a row from its own statement. Removing one
  // here lets the balance verification demonstrate that it catches it.
  if (options.seedMissingTransaction === true) {
    rows.splice(Math.floor(rows.length / 2), 1);
  }

  const closingBalanceInCents = balance;

  return {
    // Statements print newest first
    rows: [...rows].reverse(),
    openingBalanceInCents,
    closingBalanceInCents,
    periodStart: rows[0].completionTime,
    periodEnd: rows[rows.length - 1].completionTime
  };
}
