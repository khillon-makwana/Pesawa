import { describe, it, expect } from 'vitest';
import { groupTextItemsIntoRows } from '../group-text-items-into-rows';
import type { PositionedTextItem } from '../types';

function item(text: string, x: number, right: number, y: number): PositionedTextItem {
  return { text, x, right, y, page: 2 };
}

describe('groupTextItemsIntoRows', () => {
  it('builds a row with a wrapped details cell', () => {
    const rows = groupTextItemsIntoRows([
      item('SAMPLE0A02', 38, 78, 775),
      item('2026-06-04 18:25:10', 108, 171, 775),
      item('Customer Transfer to -', 177, 245, 775),
      item('Completed', 282, 315, 775),
      item('-420.00', 464, 487, 775),
      item('2,811.00', 530, 557, 775),
      item('254700***105 JANE DOE', 177, 271, 769)
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      receiptNo: 'SAMPLE0A02',
      completionTime: '2026-06-04 18:25:10',
      details: 'Customer Transfer to - 254700***105 JANE DOE',
      status: 'Completed',
      paidIn: '',
      withdrawn: '-420.00',
      balance: '2,811.00',
      page: 2
    });
  });

  it('puts an incoming amount in paidIn, not withdrawn', () => {
    const rows = groupTextItemsIntoRows([
      item('SAMPLE0A07', 38, 80, 427),
      item('2026-06-02 10:05:40', 108, 171, 427),
      item('Funds received from -', 177, 243, 427),
      item('Completed', 282, 315, 427),
      item('10,000.00', 387, 418, 427),
      item('15,640.00', 526, 557, 427)
    ]);

    expect(rows[0].paidIn).toBe('10,000.00');
    expect(rows[0].withdrawn).toBe('');
  });

  it('joins three continuation lines', () => {
    const rows = groupTextItemsIntoRows([
      item('SAMPLE0A08', 38, 81, 637),
      item('2026-06-03 13:40:20', 108, 171, 637),
      item('Customer Bundle Purchase to', 177, 267, 637),
      item('Completed', 282, 315, 637),
      item('-500.00', 464, 487, 637),
      item('5,881.00', 530, 557, 637),
      item('4093441SAFARICOM DATA', 177, 258, 631),
      item('BUNDLES by - 254700***103', 177, 265, 625),
      item('JANE DOE', 177, 237, 619)
    ]);

    expect(rows[0].details).toBe(
      'Customer Bundle Purchase to 4093441SAFARICOM DATA BUNDLES by - 254700***103 JANE DOE'
    );
  });

  it('ignores the table header', () => {
    const rows = groupTextItemsIntoRows([
      item('Receipt No.', 51, 91, 785),
      item('Completion Time', 111, 170, 785),
      item('Details', 216, 240, 785),
      item('SAMPLE0A02', 38, 78, 775),
      item('2026-06-04 18:25:10', 108, 171, 775),
      item('Customer Transfer to -', 177, 245, 775),
      item('Completed', 282, 315, 775),
      item('-420.00', 464, 487, 775),
      item('2,811.00', 530, 557, 775)
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].receiptNo).toBe('SAMPLE0A02');
  });

  it('does not treat the disclaimer as a row despite its position', () => {
    const rows = groupTextItemsIntoRows([
      item('SAMPLE0A02', 38, 78, 775),
      item('2026-06-04 18:25:10', 108, 171, 775),
      item('Customer Transfer to -', 177, 245, 775),
      item('Completed', 282, 315, 775),
      item('-420.00', 464, 487, 775),
      item('2,811.00', 530, 557, 775),
      item('D iscl a i m e r: A n y p e rso n a l', 39, 556, 118),
      item('for w hic h it w a s p ro v id e d', 38, 126, 107) // starts in the receipt column
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].details).toBe('Customer Transfer to -');
  });

  it('stops collecting continuations at the page footer', () => {
    const rows = groupTextItemsIntoRows([
      item('SAMPLE0A07', 38, 80, 427),
      item('2026-06-02 10:05:40', 108, 171, 427),
      item('Funds received from -', 177, 243, 427),
      item('Completed', 282, 315, 427),
      item('10,000.00', 387, 418, 427),
      item('15,640.00', 526, 557, 427),
      item('254700***104 JANE DOE', 177, 272, 421),
      item('D iscl a i m e r: A n y p e rso n a l', 39, 556, 118),
      item('F or s e lf-h e lp di a l *2 3 4 # | W e b : w w w', 57, 183, 22)
    ]);

    expect(rows[0].details).toBe('Funds received from - 254700***104 JANE DOE');
  });

  it('separates two adjacent rows only 10 units apart', () => {
    const rows = groupTextItemsIntoRows([
      item('SAMPLE0A06', 38, 78, 727),
      item('2026-06-04 12:10:05', 108, 171, 727),
      item('Pay Bill Charge', 177, 223, 727),
      item('Completed', 282, 315, 727),
      item('-20.00', 468, 487, 727),
      item('3,531.00', 530, 557, 727),
      item('SAMPLE0A06', 38, 78, 717),
      item('2026-06-04 12:10:05', 108, 171, 717),
      item('Pay Bill Online to 4000321 -', 177, 261, 717),
      item('Completed', 282, 315, 717),
      item('-1,566.00', 458, 487, 717),
      item('3,551.00', 530, 557, 717)
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].details).toBe('Pay Bill Charge');
    expect(rows[1].details).toBe('Pay Bill Online to 4000321 -');
  });

  it('returns nothing for a page with no transaction rows', () => {
    expect(groupTextItemsIntoRows([item('Page 2 of 4', 525, 559, 804)])).toEqual([]);
  });

  it('keeps pages in order and does not merge lines across them', () => {
    const onPage = (text: string, x: number, right: number, y: number, page: number) => ({
      text,
      x,
      right,
      y,
      page
    });

    const rows = groupTextItemsIntoRows([
      // page 4, low on the page
      onPage('UHDDDDDDDD', 38, 78, 200, 4),
      onPage('2026-08-01 10:00:00', 108, 171, 200, 4),
      onPage('Airtime Purchase', 177, 223, 200, 4),
      onPage('Completed', 282, 315, 200, 4),
      onPage('-50.00', 468, 487, 200, 4),
      onPage('1,000.00', 530, 557, 200, 4),
      // page 2, high on the page — higher y, but a later page
      onPage('UHBBBBBBBB', 38, 78, 775, 2),
      onPage('2026-06-04 18:25:10', 108, 171, 775, 2),
      onPage('Customer Transfer to -', 177, 245, 775, 2),
      onPage('Completed', 282, 315, 775, 2),
      onPage('-420.00', 464, 487, 775, 2),
      onPage('2,811.00', 530, 557, 775, 2)
    ]);

    expect(rows.map(r => r.receiptNo)).toEqual(['UHBBBBBBBB', 'UHDDDDDDDD']);
  });
});
