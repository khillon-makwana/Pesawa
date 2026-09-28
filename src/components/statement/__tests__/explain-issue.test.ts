import { describe, it, expect } from 'vitest';
import { ISSUE_CODES, type ParseIssue } from '@/lib/parser/types';
import { parseStatementRows } from '@/lib/parser/parse-statement-rows';
import { generateSampleStatement } from '@/lib/sample/generate-sample-statement-rows';
import { explainIssue, explainIssues, severityOf } from '../explain-issue';

function buildIssue(overrides: Partial<ParseIssue> = {}): ParseIssue {
  return {
    type: 'balance_break',
    page: 3,
    // Real row text, which carries a name and a phone number. It must never
    // reach an explanation.
    rawText: 'Customer Transfer to - 254712345678 ASHA WAMBUI',
    detail: 'technical detail',
    ...overrides
  };
}

const FALLBACK_HEADLINE = 'Something in this statement needs checking.';

describe('explainIssue — needs attention', () => {
  it('explains a balance mismatch with the exact figures', () => {
    const explained = explainIssue(
      buildIssue({
        code: 'balance_mismatch',
        receiptNo: 'SAMPLE0A01',
        expectedBalanceInCents: 435000,
        printedBalanceInCents: 395000
      })
    );

    expect(explained.severity).toBe('attention');
    expect(explained.headline).toBe("The balance doesn't add up at receipt SAMPLE0A01.");
    expect(explained.explanation).toContain('KSh 4,350.00');
    expect(explained.explanation).toContain('KSh 3,950.00');
    expect(explained.explanation).toContain('KSh 400.00 apart');
  });

  it('names both possible causes rather than guessing one', () => {
    const { explanation } = explainIssue(
      buildIssue({
        code: 'balance_mismatch',
        expectedBalanceInCents: 100,
        printedBalanceInCents: 200
      })
    );

    expect(explanation).toMatch(/missing from the statement or one was misread/);
  });

  it('reports the gap the same way whichever figure is larger', () => {
    const { explanation } = explainIssue(
      buildIssue({
        code: 'balance_mismatch',
        expectedBalanceInCents: 395000,
        printedBalanceInCents: 435000
      })
    );

    expect(explanation).toContain('KSh 400.00 apart');
    expect(explanation).not.toContain('-');
  });

  it('never rounds money', () => {
    const { explanation } = explainIssue(
      buildIssue({
        code: 'balance_mismatch',
        expectedBalanceInCents: 12345,
        printedBalanceInCents: 12346
      })
    );

    expect(explanation).toContain('KSh 123.45');
    expect(explanation).toContain('KSh 0.01 apart');
  });

  it('explains a fee with no matching payment', () => {
    const explained = explainIssue(
      buildIssue({
        type: 'unparsed_row',
        code: 'charge_without_payment',
        receiptNo: 'SAMPLE0A04',
        amountInCents: 700
      })
    );

    expect(explained.severity).toBe('attention');
    expect(explained.headline).toBe(
      'A KSh 7.00 fee (receipt SAMPLE0A04) has no matching payment here.'
    );
    expect(explained.explanation).toMatch(/last month's statement/);
  });

  it.each([
    ['row_unreadable_time', "Its date couldn't be read."],
    ['row_unreadable_balance', "Its balance couldn't be read."],
    ['row_missing_amount', 'It showed no amount coming in or going out.'],
    ['row_both_amounts', 'It showed money both coming in and going out']
  ] as const)('explains an unreadable row: %s', (code, reason) => {
    const explained = explainIssue(buildIssue({ type: 'unparsed_row', code }));

    expect(explained.severity).toBe('attention');
    expect(explained.headline).toBe(
      "One transaction on page 3 couldn't be read, so it isn't counted."
    );
    expect(explained.explanation).toContain(reason);
    expect(explained.explanation).toContain('Totals may be missing this transaction.');
  });

  it('leaves the page out when it is not known', () => {
    const { headline } = explainIssue(
      buildIssue({ type: 'unparsed_row', code: 'row_unreadable_time', page: null })
    );

    expect(headline).toBe("One transaction couldn't be read, so it isn't counted.");
  });

  it('explains entries that add up in no order', () => {
    const explained = explainIssue(
      buildIssue({ code: 'no_consistent_order', receiptNo: 'X1' })
    );

    expect(explained.severity).toBe('attention');
    expect(explained.headline).toBe(
      "The entries for receipt X1 don't add up in any order."
    );
  });
});

describe('explainIssue — for information', () => {
  it('explains a skipped Failed transaction, and treats it as information', () => {
    const explained = explainIssue(
      buildIssue({ type: 'unparsed_row', code: 'row_skipped_status', status: 'Failed' })
    );

    expect(explained.severity).toBe('info');
    expect(explained.headline).toBe('A transaction marked "Failed" wasn\'t counted.');
  });

  it('explains an ambiguous order as not affecting totals', () => {
    const explained = explainIssue(
      buildIssue({ code: 'ambiguous_order', receiptNo: 'X1' })
    );

    expect(explained.severity).toBe('info');
    expect(explained.explanation).toContain("Totals aren't affected.");
  });

  it('explains a group too large to reorder', () => {
    const explained = explainIssue(
      buildIssue({ code: 'group_too_large', receiptNo: 'X1', rowCount: 4 })
    );

    expect(explained.severity).toBe('info');
    expect(explained.headline).toBe(
      'Receipt X1 has 4 entries, shown in the order printed.'
    );
  });
});

describe('explainIssue — safety rules', () => {
  it('gives every issue code its own wording', () => {
    // Adding a code to the parser without wording here would fall back to the
    // generic sentence, and this fails.
    for (const code of ISSUE_CODES) {
      expect(explainIssue(buildIssue({ code })).headline, code).not.toBe(
        FALLBACK_HEADLINE
      );
    }
  });

  it('never shows a name or phone number from the raw row text', () => {
    for (const code of ISSUE_CODES) {
      const { headline, explanation } = explainIssue(
        buildIssue({ code, receiptNo: 'R1' })
      );
      const shown = `${headline} ${explanation}`;

      expect(shown, code).not.toContain('ASHA');
      expect(shown, code).not.toContain('254712345678');
    }
  });

  it('treats an issue saved before codes existed as needing attention', () => {
    const legacy = buildIssue({
      detail: 'Balance break at receipt X: expected 1, statement 2'
    });

    expect(severityOf(legacy)).toBe('attention');
    // With no code there is nothing to translate, so the original text is
    // shown rather than an invented explanation.
    expect(explainIssue(legacy).explanation).toBe(legacy.detail);
  });

  it('only ever calls three codes informational', () => {
    const informational = ISSUE_CODES.filter(
      code => severityOf(buildIssue({ code })) === 'info'
    );

    expect(informational.sort()).toEqual([
      'ambiguous_order',
      'group_too_large',
      'row_skipped_status'
    ]);
  });
});

describe('explainIssues — reading issues together', () => {
  const fee = buildIssue({
    type: 'unparsed_row',
    code: 'charge_without_payment',
    receiptNo: 'WPS4MHQCQP',
    amountInCents: 1300
  });

  it("points to last month's statement when only the fee is unmatched", () => {
    const [explained] = explainIssues([fee]);

    expect(explained.explanation).toMatch(/last month's statement/);
  });

  it('says the payment is missing when the same receipt also fails to add up', () => {
    const [explainedFee] = explainIssues([
      fee,
      buildIssue({
        code: 'balance_mismatch',
        receiptNo: 'WPS4MHQCQP',
        expectedBalanceInCents: 8720774,
        printedBalanceInCents: 8426474
      })
    ]);

    expect(explainedFee.severity).toBe('attention');
    expect(explainedFee.explanation).toMatch(/missing from this statement/);
    // The advice that would send someone looking for a statement that does
    // not have the payment in it.
    expect(explainedFee.explanation).not.toMatch(/save that one/);
  });

  it('keeps the usual advice when the mismatch is at a different receipt', () => {
    const [explainedFee] = explainIssues([
      fee,
      buildIssue({ code: 'balance_mismatch', receiptNo: 'SOMEWHERE_ELSE' })
    ]);

    expect(explainedFee.explanation).toMatch(/last month's statement/);
  });

  it('returns one explanation per issue, in the same order', () => {
    const issues = [
      buildIssue({ code: 'ambiguous_order', receiptNo: 'A' }),
      fee,
      buildIssue({ code: 'row_skipped_status', status: 'Failed' })
    ];

    expect(explainIssues(issues).map(item => item.headline)).toEqual(
      issues.map(issue => explainIssue(issue).headline)
    );
  });
});

describe('explainIssue — against a real parse', () => {
  it('explains the sample statement with a missing transaction', () => {
    const sample = generateSampleStatement({ seedMissingTransaction: true });
    const { issues } = parseStatementRows(sample.rows, sample.openingBalanceInCents);

    const mismatches = issues
      .filter(issue => issue.code === 'balance_mismatch')
      .map(explainIssue);

    expect(mismatches.length).toBeGreaterThan(0);
    expect(mismatches[0].severity).toBe('attention');
    expect(mismatches[0].explanation).toMatch(/KSh [\d,]+\.\d{2} apart/);
  });

  it('does not send anyone to last month for the payment this sample is missing', () => {
    // This sample removes a payment and leaves its fee behind. The fee's
    // advice must say the payment is missing here, not somewhere else.
    const sample = generateSampleStatement({ seedMissingTransaction: true });
    const { issues } = parseStatementRows(sample.rows, sample.openingBalanceInCents);

    const explained = explainIssues(issues);
    const feeIndex = issues.findIndex(issue => issue.code === 'charge_without_payment');

    expect(feeIndex).toBeGreaterThanOrEqual(0);
    expect(explained[feeIndex].explanation).toMatch(/missing from this statement/);
    expect(explained[feeIndex].explanation).not.toMatch(/save that one/);
  });
});
