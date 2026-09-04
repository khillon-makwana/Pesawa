import type { TransactionType, Confidence } from './types';

export interface ExtractedCounterparty {
  name: string | null;
  phone: string | null;
  confidence: Confidence;
}

const NO_COUNTERPARTY: ExtractedCounterparty = {
  name: null,
  phone: null,
  confidence: 'high'
};

function normaliseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Person-to-person formats: a dash, then the phone number, then the name.
 *   "Funds received from - 254712345678 JANE DOE"
 *   "Customer Transfer to - 254798765432 JOHN DOE"
 */
function extractFromPersonTransfer(details: string): ExtractedCounterparty {
  const match = details.match(/-\s*(\d[\d*\s]{6,})\s+(.+)$/);
  if (!match) {
    return { name: null, phone: null, confidence: 'low' };
  }
  return {
    phone: match[1].replace(/\s/g, ''),
    name: normaliseWhitespace(match[2]),
    confidence: 'high'
  };
}

/**
 * Paybill: shortcode, dash, biller name, then an account number we discard.
 *   "Pay Bill to 888880 - KPLC PREPAID Acc. 12345"
 */
function extractFromPayBill(details: string): ExtractedCounterparty {
  const match = details.match(/-\s*(.+?)\s+Acc\.\s*\S*\s*$/i);
  if (match) {
    return { name: normaliseWhitespace(match[1]), phone: null, confidence: 'high' };
  }

  // Some paybills carry no account number.
  const withoutAccount = details.match(/-\s*(.+)$/);
  if (withoutAccount) {
    return { name: normaliseWhitespace(withoutAccount[1]), phone: null, confidence: 'high' };
  }

  return { name: null, phone: null, confidence: 'low' };
}

/**
 * Merchant: till number, dash, merchant name running to the end.
 *   "Merchant Payment to 5001234 - GREENFIELD UNIVERSITY CATERING DEPARTMENT"
 */
function extractFromMerchantPayment(details: string): ExtractedCounterparty {
  const match = details.match(/-\s*(.+)$/);
  if (!match) {
    return { name: null, phone: null, confidence: 'low' };
  }
  return { name: normaliseWhitespace(match[1]), phone: null, confidence: 'high' };
}

/**
 * Bundle purchase — the awkward one. There is NO separator between the
 * shortcode and the product name:
 *   "Customer Bundle Purchase to 4093441SAFARICOM DATA BUNDLES by - 2547... JANE DOE"
 *
 * We split on the leading run of digits. That is a guess: if a product name
 * ever begins with a digit, the split lands in the wrong place. Hence 'low'.
 * The counterparty here is the product, not a person — the phone belongs to
 * the account holder.
 */
function extractFromBundlePurchase(details: string): ExtractedCounterparty {
  const match = details.match(/Bundle Purchase to\s*(\d+)([^]*?)\s+by\s*-\s*(\d[\d*\s]{6,})/i);
  if (!match) {
    return { name: null, phone: null, confidence: 'low' };
  }
  return {
    name: normaliseWhitespace(match[2]) || null,
    phone: match[3].replace(/\s/g, ''),
    confidence: 'low'
  };
}

/**
 * Pulls the other party out of a transaction's details text. Which shape to
 * expect depends on the transaction type, so classification must run first.
 *
 * Returns nulls with high confidence for types that legitimately have no
 * counterparty (charges, airtime) — absence is not a failure there.
 */
export function extractCounterparty(
  details: string,
  type: TransactionType
): ExtractedCounterparty {
  const normalised = normaliseWhitespace(details);

  switch (type) {
    case 'payment_received':
    case 'send_money':
      return extractFromPersonTransfer(normalised);

    case 'paybill_payment':
      return extractFromPayBill(normalised);

    case 'till_payment':
      return extractFromMerchantPayment(normalised);

    case 'bundle_purchase':
      return extractFromBundlePurchase(normalised);

    case 'pochi_payment':
      return extractFromPersonTransfer(normalised);   // "to - 254700***101 JAMES KIPTOO"

    case 'unit_trust_investment':
      return extractFromPayBill(normalised);          // "To 4145555 - ZIIDI MMF by ..."

    case 'charge':
    case 'airtime':
      return NO_COUNTERPARTY;

    default:
      return { name: null, phone: null, confidence: 'low' };
  }
}