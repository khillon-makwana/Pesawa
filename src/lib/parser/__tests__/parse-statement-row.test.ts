import { describe, it, expect } from 'vitest';
import { parseStatementRow } from '../parse-statement-row';
import type { RawRow } from '../types';

/**
 * A valid row. Tests override only the field under test, so each case reads
 * as "this row, but with a broken balance" rather than repeating eight fields.
 */
function buildRawRow(overrides: Partial<RawRow> = {}): RawRow {
  return {
    receiptNo: 'SAMPLE0A02',
    completionTime: '2026-06-04 18:25:10',
    details: 'Customer Transfer to - 254798765432 JOHN DOE',
    status: 'Completed',
    paidIn: '',
    withdrawn: '-420.00',
    balance: '2,811.00',
    page: 1,
    ...overrides
  };
}

describe('parseStatementRow', () => {
  describe('a well-formed outgoing row', () => {
    it('parses every field', () => {
      const outcome = parseStatementRow(buildRawRow());

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return; // narrows the type for the assertions below

      expect(outcome.transaction).toEqual({
        receiptNo: 'SAMPLE0A02',
        completedAt: '2026-06-04T15:25:10.000Z', // 18:25:10 EAT
        detailsRaw: 'Customer Transfer to - 254798765432 JOHN DOE',
        type: 'send_money',
        direction: 'out',
        amount: 42000,
        balanceAfter: 281100,
        isRevenue: false,
        counterpartyName: 'JOHN DOE',
        counterpartyPhone: '254798765432',
        chargeForReceipt: null,
        reversesReceipt: null,
        confidence: 'high',
        sourcePage: 1
      });
    });
  });

  describe('a well-formed incoming row', () => {
    it('marks received funds as revenue', () => {
      const outcome = parseStatementRow(
        buildRawRow({
          details: 'Funds received from - 254712345678 JANE DOE',
          paidIn: '10,000.00',
          withdrawn: '',
          balance: '15,640.00'
        })
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      expect(outcome.transaction.direction).toBe('in');
      expect(outcome.transaction.amount).toBe(1000000);
      expect(outcome.transaction.isRevenue).toBe(true);
      expect(outcome.transaction.type).toBe('payment_received');
    });

    it('does not treat an agent deposit as revenue', () => {
      const outcome = parseStatementRow(
        buildRawRow({
          details: 'Deposit of Funds at Agent Till 123456',
          paidIn: '2,000.00',
          withdrawn: ''
        })
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      expect(outcome.transaction.direction).toBe('in');
      expect(outcome.transaction.isRevenue).toBe(false);
    });
  });

  describe('rows the parser should reject', () => {
    it('skips a failed transaction', () => {
      const outcome = parseStatementRow(buildRawRow({ status: 'Failed' }));

      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.reason).toContain('Failed');
    });

    it('rejects an unreadable completion time', () => {
      const outcome = parseStatementRow(buildRawRow({ completionTime: '28/08/2026' }));

      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.reason).toContain('completion time');
    });

    it('rejects an unreadable balance', () => {
      const outcome = parseStatementRow(buildRawRow({ balance: 'n/a' }));

      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.reason).toContain('balance');
    });

    it('rejects a row with neither amount', () => {
      const outcome = parseStatementRow(buildRawRow({ paidIn: '', withdrawn: '' }));

      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.reason).toContain('neither');
    });

    it('rejects a row with both amounts — it means two rows were merged', () => {
      const outcome = parseStatementRow(
        buildRawRow({
          paidIn: '100.00',
          withdrawn: '-420.00'
        })
      );

      expect(outcome.ok).toBe(false);
      if (outcome.ok) return;
      expect(outcome.reason).toContain('both');
    });
  });

  describe('confidence', () => {
    it('is low when the type could not be recognised', () => {
      const outcome = parseStatementRow(
        buildRawRow({
          details: 'Some Format We Have Never Seen'
        })
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      expect(outcome.transaction.type).toBe('unknown');
      expect(outcome.transaction.confidence).toBe('low');
    });

    it('is low when the type is recognised but the counterparty is not', () => {
      const outcome = parseStatementRow(
        buildRawRow({
          details: 'Customer Transfer to somebody'
        })
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      expect(outcome.transaction.type).toBe('send_money'); // classified fine
      expect(outcome.transaction.counterpartyName).toBeNull(); // extraction failed
      expect(outcome.transaction.confidence).toBe('low'); // so the row is low
    });

    it('is low for a bundle purchase even when everything matches', () => {
      const outcome = parseStatementRow(
        buildRawRow({
          details:
            'Customer Bundle Purchase to 4093441SAFARICOM DATA BUNDLES by - 254712345678 JANE DOE',
          withdrawn: '-500.00'
        })
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      expect(outcome.transaction.counterpartyName).toBe('SAFARICOM DATA BUNDLES');
      expect(outcome.transaction.confidence).toBe('low');
    });

    it('stays high for a charge row, which has no counterparty by design', () => {
      const outcome = parseStatementRow(
        buildRawRow({
          details: 'Customer Transfer of Funds Charge',
          withdrawn: '-7.00'
        })
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      expect(outcome.transaction.type).toBe('charge');
      expect(outcome.transaction.counterpartyName).toBeNull();
      expect(outcome.transaction.confidence).toBe('high');
    });
  });

  describe('whitespace tolerance', () => {
    it('trims a padded receipt number', () => {
      const outcome = parseStatementRow(buildRawRow({ receiptNo: '  SAMPLE0A02  ' }));

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.transaction.receiptNo).toBe('SAMPLE0A02');
    });

    it('handles a details cell wrapped across lines', () => {
      const outcome = parseStatementRow(
        buildRawRow({
          details:
            'Merchant Payment to 5001234 -\nGREENFIELD UNIVERSITY\nCATERING DEPARTMENT',
          withdrawn: '-150.00'
        })
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;

      expect(outcome.transaction.type).toBe('till_payment');
      expect(outcome.transaction.counterpartyName).toBe(
        'GREENFIELD UNIVERSITY CATERING DEPARTMENT'
      );
    });

    it('keeps the raw details untouched', () => {
      const wrapped = 'Merchant Payment to 5001234 -\nGREENFIELD UNIVERSITY';
      const outcome = parseStatementRow(
        buildRawRow({ details: wrapped, withdrawn: '-150.00' })
      );

      expect(outcome.ok).toBe(true);
      if (!outcome.ok) return;
      expect(outcome.transaction.detailsRaw).toBe(wrapped);
    });
  });
});
