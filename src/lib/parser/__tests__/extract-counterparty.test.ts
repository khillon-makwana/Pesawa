import { describe, it, expect } from 'vitest';
import { extractCounterparty } from '../extract-counterparty';

describe('extractCounterparty', () => {
  it('extracts phone and name from received funds', () => {
    expect(extractCounterparty(
      'Funds received from - 254712345678 JANE DOE',
      'payment_received'
    )).toEqual({ name: 'JANE DOE', phone: '254712345678', confidence: 'high' });
  });

  it('extracts phone and name from a transfer out', () => {
    expect(extractCounterparty(
      'Customer Transfer to - 254798765432 JOHN DOE',
      'send_money'
    )).toEqual({ name: 'JOHN DOE', phone: '254798765432', confidence: 'high' });
  });

  it('handles masked phone numbers', () => {
    const result = extractCounterparty(
      'Funds received from - 25470****106 JANE DOE',
      'payment_received'
    );
    expect(result.phone).toBe('25470****106');
    expect(result.name).toBe('JANE DOE');
  });

  it('extracts the biller and discards the account number', () => {
    expect(extractCounterparty(
      'Pay Bill to 888880 - KPLC PREPAID Acc. 12345',
      'paybill_payment'
    )).toEqual({ name: 'KPLC PREPAID', phone: null, confidence: 'high' });
  });

  it('handles Pay Bill Online', () => {
    expect(extractCounterparty(
      'Pay Bill Online to 247247 - EQUITY PAYBILL Acc. 5501',
      'paybill_payment'
    ).name).toBe('EQUITY PAYBILL');
  });

  it('extracts a multi-word merchant name', () => {
    expect(extractCounterparty(
      'Merchant Payment to 5001234 - GREENFIELD UNIVERSITY CATERING DEPARTMENT',
      'till_payment'
    )).toEqual({
      name: 'GREENFIELD UNIVERSITY CATERING DEPARTMENT',
      phone: null,
      confidence: 'high'
    });
  });

  it('handles a merchant name wrapped across PDF lines', () => {
    expect(extractCounterparty(
      'Merchant Payment to 5001234 -\nGREENFIELD UNIVERSITY\nCATERING DEPARTMENT',
      'till_payment'
    ).name).toBe('GREENFIELD UNIVERSITY CATERING DEPARTMENT');
  });

  it('splits the bundle shortcode from the product, with low confidence', () => {
    expect(extractCounterparty(
      'Customer Bundle Purchase to 4093441SAFARICOM DATA BUNDLES by - 254712345678 JANE DOE',
      'bundle_purchase'
    )).toEqual({
      name: 'SAFARICOM DATA BUNDLES',
      phone: '254712345678',
      confidence: 'low'
    });
  });

  it('returns nothing, confidently, for charges and airtime', () => {
    expect(extractCounterparty('Customer Transfer of Funds Charge', 'charge'))
      .toEqual({ name: null, phone: null, confidence: 'high' });

    expect(extractCounterparty('Airtime Purchase', 'airtime'))
      .toEqual({ name: null, phone: null, confidence: 'high' });
  });

  it('flags a malformed transfer instead of guessing', () => {
    const result = extractCounterparty('Funds received from somebody', 'payment_received');
    expect(result.name).toBeNull();
    expect(result.confidence).toBe('low');
  });

  it('returns low confidence for unknown types', () => {
    expect(extractCounterparty('Some Format We Have Never Seen', 'unknown').confidence)
      .toBe('low');
  });
});