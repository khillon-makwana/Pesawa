import { describe, it, expect, beforeEach } from 'vitest';
import { classifyTransactionType } from '../classify-transaction-type';
import { StatementBuilder, resetReceiptNumbering } from './statement-builder';

describe('classifyTransactionType', () => {
  describe('verified patterns', () => {
    const cases: Array<[string, string]> = [
      ['Funds received from - 254712345678 JANE DOE',              'payment_received'],
      ['Customer Transfer to - 254798765432 JOHN DOE',             'send_money'],
      ['Customer Transfer of Funds Charge',                        'charge'],
      ['Pay Bill Charge',                                          'charge'],
      ['Pay Bill to 888880 - KPLC PREPAID Acc. 12345',             'paybill_payment'],
      ['Pay Bill Online to 247247 - EQUITY PAYBILL Acc. 5501',     'paybill_payment'],
      ['Merchant Payment to 5001234 - GREENFIELD UNIVERSITY',      'till_payment'],
      ['Customer Bundle Purchase to 4093441SAFARICOM DATA BUNDLES by - 254712345678 JANE DOE', 'bundle_purchase'],
      ['Airtime Purchase', 'airtime'],
      ['Customer Payment to Small Business to - 254700***102 JAMES KIPTOO', 'pochi_payment'],
      ['Unit Trust Invest To 4145555 - ZIIDI MMF by M-PESA\\UnitTrust', 'unit_trust_investment'],
    ];

    it.each(cases)('classifies %s', (details, expectedType) => {
      const result = classifyTransactionType(details);
      expect(result.type).toBe(expectedType);
      expect(result.confidence).toBe('high');
    });
  });

  describe('provisional patterns', () => {
    it('classifies agent transactions with low confidence', () => {
      expect(classifyTransactionType('Deposit of Funds at Agent Till 123456'))
        .toEqual({ type: 'agent_deposit', confidence: 'low' });

      expect(classifyTransactionType('Customer Withdrawal At Agent Till 123456'))
        .toEqual({ type: 'agent_withdrawal', confidence: 'low' });
    });

    it('distinguishes fuliza repayment from fuliza loan', () => {
      expect(classifyTransactionType('Fuliza M-Pesa Loan Repayment').type)
        .toBe('fuliza_repayment');

      expect(classifyTransactionType('Fuliza M-Pesa Loan').type)
        .toBe('fuliza_loan');
    });
  });

  describe('similar formats are not confused with one another', () => {
    it('classifies "Pay Bill Charge" as a charge, not a paybill payment', () => {
      expect(classifyTransactionType('Pay Bill Charge').type).toBe('charge');
    });

    it('classifies "Customer Transfer of Funds Charge" as a charge, not a transfer', () => {
      expect(classifyTransactionType('Customer Transfer of Funds Charge').type).toBe('charge');
    });

    it('does not mistake a Pochi payment for a transfer', () => {
      // the string contains "to - <phone> <name>", the same shape as a transfer
      expect(classifyTransactionType(
        'Customer Payment to Small Business to - 254700***102 JAMES KIPTOO'
      ).type).toBe('pochi_payment');
    });
  });

  describe('unrecognised input', () => {
    it('returns unknown rather than guessing', () => {
      expect(classifyTransactionType('Some Format We Have Never Seen'))
        .toEqual({ type: 'unknown', confidence: 'low' });
    });

    it('returns unknown for empty details', () => {
      expect(classifyTransactionType('').type).toBe('unknown');
    });
  });

  describe('messy whitespace from wrapped PDF cells', () => {
    it('handles details split across lines', () => {
      const wrapped = 'Merchant Payment to 5001234 -\nGREENFIELD UNIVERSITY\nCATERING DEPARTMENT';
      expect(classifyTransactionType(wrapped).type).toBe('till_payment');
    });

    it('handles leading and doubled spaces', () => {
      expect(classifyTransactionType('  Airtime  Purchase ').type).toBe('airtime');
    });
  });

  describe('against generated fixtures', () => {
    beforeEach(() => {
      resetReceiptNumbering();
    });

    it('agrees with the builder on every row it generates', () => {
      const { rows, expected } = new StatementBuilder()
        .receivedFunds(10_000_00, 'JANE DOE')
        .sentMoney(400_00, 'JOHN DOE')
        .transferCharge()
        .payBill(1_566_00, 'KPLC PREPAID')
        .payBillCharge()
        .merchantPayment(150_00, 'GREENFIELD UNIVERSITY CATERING DEPARTMENT')
        .bundlePurchase(500_00)
        .airtimePurchase(50_00)
        .build();

      // rows come out newest-first; expected is chronological
      const chronologicalRows = [...rows].reverse();

      chronologicalRows.forEach((row, index) => {
        expect(classifyTransactionType(row.details).type).toBe(expected[index].type);
      });
    });
  });
});