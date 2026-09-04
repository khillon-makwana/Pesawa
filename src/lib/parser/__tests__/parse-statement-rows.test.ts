import { describe, it, expect, beforeEach } from 'vitest';
import { parseStatementRows } from '../parse-statement-rows';
import { StatementBuilder, resetReceiptNumbering } from './statement-builder';

describe('parseStatementRows', () => {
  beforeEach(() => {
    resetReceiptNumbering();
  });

  it('parses a realistic statement end to end', () => {
    const { rows, meta } = new StatementBuilder(500_00)
      .receivedFunds(10_000_00, 'JANE DOE')
      .sentMoney(400_00, 'JOHN DOE')
      .transferCharge()
      .merchantPayment(150_00, 'GREENFIELD UNIVERSITY CATERING DEPARTMENT')
      .payBill(1_566_00, 'KPLC PREPAID')
      .payBillCharge()
      .airtimePurchase(50_00)
      .build();

    const result = parseStatementRows(rows, meta.openingBalance);

    expect(result.issues).toHaveLength(0);
    expect(result.isBalanceVerified).toBe(true);
    expect(result.transactions).toHaveLength(7);
  });

  it('parses the newer transaction types end to end', () => {
    // opening must cover the transactions; the builder cannot print a
    // negative balance correctly, and real M-Pesa balances never go negative
    const { rows, meta } = new StatementBuilder(10_000_00)
      .pochiPayment(250_00, 'JAMES KIPTOO')
      .unitTrustInvestment(5_000_00)
      .build();

    const result = parseStatementRows(rows, meta.openingBalance);

    expect(result.issues).toHaveLength(0);
    expect(result.isBalanceVerified).toBe(true);
    expect(result.transactions.map(t => t.type)).toEqual([
      'pochi_payment',
      'unit_trust_investment'
    ]);
  });

  it('returns transactions oldest first', () => {
    const { rows, meta } = new StatementBuilder()
      .receivedFunds(1_000_00, 'FIRST SENDER')
      .receivedFunds(2_000_00, 'SECOND SENDER')
      .receivedFunds(3_000_00, 'THIRD SENDER')
      .build();

    const { transactions } = parseStatementRows(rows, meta.openingBalance);

    expect(transactions.map(t => t.counterpartyName)).toEqual([
      'FIRST SENDER',
      'SECOND SENDER',
      'THIRD SENDER'
    ]);
  });

  it('links charges to their parent transactions', () => {
    const { rows, meta } = new StatementBuilder()
      .sentMoney(400_00, 'JOHN DOE')
      .transferCharge()
      .build();

    const { transactions } = parseStatementRows(rows, meta.openingBalance);

    const [transfer, charge] = transactions;
    expect(transfer.type).toBe('send_money');
    expect(charge.type).toBe('charge');
    expect(charge.chargeForReceipt).toBe(transfer.receiptNo);
  });

  it('skips failed transactions and records why', () => {
    const { rows, meta } = new StatementBuilder()
      .receivedFunds(1_000_00, 'JANE DOE')
      .failedTransfer(500_00, 'JOHN DOE')
      .receivedFunds(2_000_00, 'MARY DOE')
      .build();

    const result = parseStatementRows(rows, meta.openingBalance);

    expect(result.transactions).toHaveLength(2);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe('unparsed_row');
    expect(result.issues[0].detail).toContain('Failed');
    expect(result.isBalanceVerified).toBe(true); // failed rows do not move the balance
  });

  it('flags unrecognised rows as low confidence without dropping them', () => {
    const { rows, meta } = new StatementBuilder()
      .receivedFunds(1_000_00, 'JANE DOE')
      .unrecognisedFormat()
      .build();

    const { transactions, isBalanceVerified } = parseStatementRows(rows, meta.openingBalance);

    expect(transactions).toHaveLength(2);
    expect(transactions[1].type).toBe('unknown');
    expect(transactions[1].confidence).toBe('low');
    expect(isBalanceVerified).toBe(true); // still a real transaction, balance holds
  });

  it('detects a dropped row via the balance walk', () => {
    const { rows, meta } = new StatementBuilder()
      .receivedFunds(1_000_00, 'JANE DOE')
      .sentMoney(400_00, 'JOHN DOE')
      .receivedFunds(2_000_00, 'MARY DOE')
      .build();

    // simulate extraction losing a row — rows are newest first, so index 1
    // is the middle transaction
    const rowsWithOneMissing = [rows[0], rows[2]];

    const result = parseStatementRows(rowsWithOneMissing, meta.openingBalance);

    expect(result.isBalanceVerified).toBe(false);
    expect(result.issues.some(issue => issue.type === 'balance_break')).toBe(true);
    expect(result.issues.some(issue => issue.detail.includes('400.00'))).toBe(true);
  });

  it('handles an empty statement', () => {
    const result = parseStatementRows([], 500_00);

    expect(result.transactions).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.isBalanceVerified).toBe(true);
  });

});