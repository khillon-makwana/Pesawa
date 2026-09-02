import { describe, it, expect } from 'vitest';
import { parseAmountToCents } from '../parse-amount-to-cents';

describe('parseAmountToCents', () => {
  it('parses a thousands-separated amount', () => {
    expect(parseAmountToCents('1,500.00')).toBe(150000);
  });

  it('parses millions', () => {
    expect(parseAmountToCents('1,234,567.89')).toBe(123456789);
  });

  it('drops the negative sign', () => {
    expect(parseAmountToCents('-7.00')).toBe(700);
  });

  it('returns null for a blank cell', () => {
    expect(parseAmountToCents('')).toBeNull();
    expect(parseAmountToCents('   ')).toBeNull();
  });

  it('handles a single decimal place', () => {
    expect(parseAmountToCents('10.5')).toBe(1050);
  });

  it('handles no decimal point', () => {
    expect(parseAmountToCents('400')).toBe(40000);
  });

  it('rejects junk rather than guessing', () => {
    expect(parseAmountToCents('abc')).toBeNull();
    expect(parseAmountToCents('1.2.3')).toBeNull();
  });

  it('stays exact where floats would not', () => {
    // parseFloat('1842.50') * 100 === 184250.00000000003
    expect(parseAmountToCents('1,842.50')).toBe(184250);
    expect(Number.isInteger(parseAmountToCents('1,842.50'))).toBe(true);
  });
});