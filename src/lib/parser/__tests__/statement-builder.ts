import type { RawRow, Transaction, TransactionType } from '../types';

/** Format cents the way the statement prints them: 150000 -> "1,500.00" */
function formatCentsAsStatementText(cents: number): string {
  const asDecimal = (Math.abs(cents) / 100).toFixed(2);
  const [whole, fraction] = asDecimal.split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}

let receiptCounter = 0;

/**
 * Deterministic receipt numbers shaped like the real thing:
 * 10 uppercase alphanumeric characters, e.g. "UH000000A1".
 */
function generateNextReceiptNumber(): string {
  receiptCounter += 1;
  return `UH${receiptCounter.toString(36).toUpperCase().padStart(8, '0')}`;
}

/** Reset receipt numbering between tests so runs are reproducible. */
export function resetReceiptNumbering(): void {
  receiptCounter = 0;
}

interface BuilderEntry {
  row: RawRow;
  expected: Transaction | null; // null = the parser should skip this row
}

interface AddRowOptions {
  details: string;
  amountInCents: number;
  direction: 'in' | 'out';
  type: TransactionType;
  isRevenue: boolean;
  counterpartyName?: string | null;
  counterpartyPhone?: string | null;
  status?: string;
  receiptNo?: string;
  chargeForReceipt?: string | null;
  reuseCurrentTimestamp?: boolean;
  expected?: Partial<Transaction> | null;
}

/**
 * Builds a fake M-Pesa statement together with the exact output the parser
 * should produce from it. Every method appends one row and keeps the running
 * balance correct, so tests get a valid statement for free.
 *
 * Rows are emitted newest-first by build(), matching real statements.
 */
export class StatementBuilder {
  private entries: BuilderEntry[] = [];
  private balanceInCents: number;
  private readonly openingBalanceInCents: number;
  private clock: Date;
  private lastTimestamp = '';
  private lastReceiptNo = '';

  constructor(openingBalanceInCents = 500_00, startedAt = '2026-08-24T08:00:00') {
    this.openingBalanceInCents = openingBalanceInCents;
    this.balanceInCents = openingBalanceInCents;
    this.clock = new Date(startedAt);
  }

  /** Advance the clock so each transaction gets a distinct completion time. */
  private advanceClock(minutes = 37): string {
    this.clock = new Date(this.clock.getTime() + minutes * 60_000);
    this.lastTimestamp = this.clock.toISOString().slice(0, 19).replace('T', ' ');
    return this.lastTimestamp;
  }

  private addRow(options: AddRowOptions): this {
    const receiptNo = options.receiptNo ?? generateNextReceiptNumber();
    const completionTime = options.reuseCurrentTimestamp
      ? this.lastTimestamp
      : this.advanceClock();

    const isMoneyIn = options.direction === 'in';
    const hasFailed = options.status === 'Failed';

    if (!hasFailed) {
      this.balanceInCents += isMoneyIn ? options.amountInCents : -options.amountInCents;
    }

    const row: RawRow = {
      receiptNo,
      completionTime,
      details: options.details,
      status: options.status ?? 'Completed',
      paidIn: isMoneyIn ? formatCentsAsStatementText(options.amountInCents) : '',
      withdrawn: isMoneyIn ? '' : `-${formatCentsAsStatementText(options.amountInCents)}`,
      balance: formatCentsAsStatementText(this.balanceInCents),
      page: 1
    };

    const expected: Transaction | null =
      options.expected === null
        ? null
        : {
            receiptNo,
            completedAt: new Date(
              `${completionTime.replace(' ', 'T')}+03:00`
            ).toISOString(),
            detailsRaw: options.details,
            type: options.type,
            direction: options.direction,
            amount: options.amountInCents,
            balanceAfter: this.balanceInCents,
            isRevenue: options.isRevenue,
            counterpartyName: options.counterpartyName ?? null,
            counterpartyPhone: options.counterpartyPhone ?? null,
            chargeForReceipt: options.chargeForReceipt ?? null,
            reversesReceipt: null,
            confidence: 'high',
            sourcePage: 1,
            ...options.expected
          };

    this.entries.push({ row, expected });
    this.lastReceiptNo = receiptNo;
    return this;
  }

  // ==========================================================================
  // VERIFIED PATTERNS — confirmed against a real M-Pesa statement
  // ==========================================================================

  receivedFunds(amountInCents: number, senderName: string, senderPhone = '254712345678') {
    return this.addRow({
      details: `Funds received from - ${senderPhone} ${senderName}`,
      amountInCents,
      direction: 'in',
      type: 'payment_received',
      isRevenue: true,
      counterpartyName: senderName,
      counterpartyPhone: senderPhone
    });
  }

  sentMoney(
    amountInCents: number,
    recipientName: string,
    recipientPhone = '254798765432'
  ) {
    return this.addRow({
      details: `Customer Transfer to - ${recipientPhone} ${recipientName}`,
      amountInCents,
      direction: 'out',
      type: 'send_money',
      isRevenue: false,
      counterpartyName: recipientName,
      counterpartyPhone: recipientPhone
    });
  }

  payBill(
    amountInCents: number,
    billerName: string,
    shortcode = '888880',
    accountNumber = '12345'
  ) {
    return this.addRow({
      details: `Pay Bill to ${shortcode} - ${billerName} Acc. ${accountNumber}`,
      amountInCents,
      direction: 'out',
      type: 'paybill_payment',
      isRevenue: false,
      counterpartyName: billerName
    });
  }

  payBillOnline(
    amountInCents: number,
    billerName: string,
    shortcode = '247247',
    accountNumber = '12345'
  ) {
    return this.addRow({
      details: `Pay Bill Online to ${shortcode} - ${billerName} Acc. ${accountNumber}`,
      amountInCents,
      direction: 'out',
      type: 'paybill_payment',
      isRevenue: false,
      counterpartyName: billerName
    });
  }

  merchantPayment(amountInCents: number, merchantName: string, tillNumber = '5001234') {
    return this.addRow({
      details: `Merchant Payment to ${tillNumber} - ${merchantName}`,
      amountInCents,
      direction: 'out',
      type: 'till_payment',
      isRevenue: false,
      counterpartyName: merchantName
    });
  }

  /**
   * Pochi la Biashara — payment to a small trader's till, which is tied to a
   * phone number rather than a till number.
   */
  pochiPayment(amountInCents: number, traderName: string, traderPhone = '254700***102') {
    return this.addRow({
      details: `Customer Payment to Small Business to - ${traderPhone} ${traderName}`,
      amountInCents,
      direction: 'out',
      type: 'pochi_payment',
      isRevenue: false,
      counterpartyName: traderName,
      counterpartyPhone: traderPhone
    });
  }

  /**
   * Investment into a unit trust (money market fund). Money leaves M-Pesa but
   * is not spent — it moves into a savings product.
   */
  unitTrustInvestment(
    amountInCents: number,
    fundName = 'ZIIDI MMF',
    shortcode = '4145555'
  ) {
    return this.addRow({
      details: `Unit Trust Invest To ${shortcode} - ${fundName} by M-PESA\\UnitTrust`,
      amountInCents,
      direction: 'out',
      type: 'unit_trust_investment',
      isRevenue: false,
      counterpartyName: fundName
    });
  }

  /**
   * Note the missing separator between shortcode and product name — this is
   * how the real statement prints it, and it is why the parser must use a
   * leading digit-run to split them.
   */
  bundlePurchase(
    amountInCents: number,
    productName = 'SAFARICOM DATA BUNDLES',
    shortcode = '4093441',
    buyerName = 'JANE DOE',
    buyerPhone = '254712345678'
  ) {
    return this.addRow({
      details: `Customer Bundle Purchase to ${shortcode}${productName} by - ${buyerPhone} ${buyerName}`,
      amountInCents,
      direction: 'out',
      type: 'bundle_purchase',
      isRevenue: false,
      counterpartyName: productName,
      counterpartyPhone: buyerPhone
    });
  }

  airtimePurchase(amountInCents: number) {
    return this.addRow({
      details: 'Airtime Purchase',
      amountInCents,
      direction: 'out',
      type: 'airtime',
      isRevenue: false
    });
  }

  /**
   * A charge always shares its parent's receipt number and timestamp.
   * Call immediately after the transaction it belongs to.
   */
  transferCharge(amountInCents = 7_00, parentReceiptNo?: string) {
    const parent = parentReceiptNo ?? this.lastReceiptNo;
    return this.addRow({
      details: 'Customer Transfer of Funds Charge',
      amountInCents,
      direction: 'out',
      type: 'charge',
      isRevenue: false,
      receiptNo: parent,
      chargeForReceipt: parent,
      reuseCurrentTimestamp: true
    });
  }

  payBillCharge(amountInCents = 20_00, parentReceiptNo?: string) {
    const parent = parentReceiptNo ?? this.lastReceiptNo;
    return this.addRow({
      details: 'Pay Bill Charge',
      amountInCents,
      direction: 'out',
      type: 'charge',
      isRevenue: false,
      receiptNo: parent,
      chargeForReceipt: parent,
      reuseCurrentTimestamp: true
    });
  }

  // ==========================================================================
  // PROVISIONAL PATTERNS — format guessed, not yet seen on a real statement.
  // Replace these strings once a statement containing them is available.
  // ==========================================================================

  agentDeposit(amountInCents: number, agentTill = '123456') {
    return this.addRow({
      details: `Deposit of Funds at Agent Till ${agentTill}`,
      amountInCents,
      direction: 'in',
      type: 'agent_deposit',
      isRevenue: false,
      expected: { confidence: 'low' }
    });
  }

  agentWithdrawal(amountInCents: number, agentTill = '123456') {
    return this.addRow({
      details: `Customer Withdrawal At Agent Till ${agentTill}`,
      amountInCents,
      direction: 'out',
      type: 'agent_withdrawal',
      isRevenue: false,
      expected: { confidence: 'low' }
    });
  }

  fulizaLoan(amountInCents: number) {
    return this.addRow({
      details: 'Fuliza M-Pesa Loan',
      amountInCents,
      direction: 'in',
      type: 'fuliza_loan',
      isRevenue: false,
      expected: { confidence: 'low' }
    });
  }

  fulizaRepayment(amountInCents: number) {
    return this.addRow({
      details: 'Fuliza M-Pesa Loan Repayment',
      amountInCents,
      direction: 'out',
      type: 'fuliza_repayment',
      isRevenue: false,
      expected: { confidence: 'low' }
    });
  }

  reversal(amountInCents: number, originalReceiptNo = 'UH00000001') {
    return this.addRow({
      details: `Reversal of Transaction ${originalReceiptNo}`,
      amountInCents,
      direction: 'in',
      type: 'reversal',
      isRevenue: false,
      expected: { confidence: 'low', reversesReceipt: originalReceiptNo }
    });
  }

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  failedTransfer(amountInCents: number, recipientName: string) {
    return this.addRow({
      details: `Customer Transfer to - 254712345678 ${recipientName}`,
      amountInCents,
      direction: 'out',
      type: 'send_money',
      isRevenue: false,
      counterpartyName: recipientName,
      status: 'Failed',
      expected: null
    });
  }

  unrecognisedFormat() {
    return this.addRow({
      details: 'Some Format We Have Never Seen',
      amountInCents: 100_00,
      direction: 'out',
      type: 'unknown',
      isRevenue: false,
      expected: { type: 'unknown', confidence: 'low' }
    });
  }

  // ==========================================================================
  // OUTPUT
  // ==========================================================================

  /**
   * Rows come out newest-first, as a real statement prints them.
   * `expected` stays in chronological order — that is what the parser should
   * produce after sorting.
   */
  build() {
    return {
      rows: this.entries.map(entry => entry.row).reverse(),
      expected: this.entries
        .map(entry => entry.expected)
        .filter((transaction): transaction is Transaction => transaction !== null),
      meta: {
        openingBalance: this.openingBalanceInCents,
        closingBalance: this.balanceInCents
      }
    };
  }
}
