import type { IssueCode, ParseIssue } from '@/lib/parser/types';
import { formatKsh } from './format';

/**
 * 'attention' means money may be missing or misread. 'info' means nothing is
 * wrong — the parser is just saying what it did.
 */
export type IssueSeverity = 'attention' | 'info';

export interface IssueExplanation {
  severity: IssueSeverity;
  headline: string;
  explanation: string;
}

/*
 * The only codes that mean nothing is wrong. Everything else — including an
 * issue with no code at all, saved before codes existed — needs attention.
 *
 * Defaulting to 'attention' is deliberate. A problem shown too loudly costs
 * someone a moment; one shown too quietly can hide missing money.
 *
 * Calling a skipped row 'info' is safe rather than hopeful: if a row that was
 * left out had actually moved money, the balance check would raise its own
 * 'balance_mismatch' right after it.
 */
const INFORMATIONAL_CODES: ReadonlySet<IssueCode> = new Set([
  'row_skipped_status',
  'ambiguous_order',
  'group_too_large'
]);

export function severityOf(issue: ParseIssue): IssueSeverity {
  if (issue.code !== undefined && INFORMATIONAL_CODES.has(issue.code)) {
    return 'info';
  }
  return 'attention';
}

/**
 * Turns a parser issue into plain words.
 *
 * Two rules hold for every case:
 *   - It names receipts, pages and amounts, which are already on screen, and
 *     never the counterparty names or phone numbers in the raw row text.
 *   - Where the cause cannot be known — a missing transaction and a misread
 *     one look the same to the balance check — it says so rather than guess.
 */
export function explainIssue(issue: ParseIssue): IssueExplanation {
  return { severity: severityOf(issue), ...describe(issue) };
}

/**
 * Explains a statement's issues together, because one can change what another
 * means.
 *
 * A fee with no payment usually means the payment is in last month's
 * statement. But if the balance also fails at that same receipt, the payment
 * is missing from this statement instead — and telling someone to go and find
 * last month's would send them after something that is not there.
 *
 * The two cases really are different, not just told apart by a guess: a fee
 * whose payment is last month's sits at the very start of the statement, where
 * the opening balance is worked out from it, so it can never fail the balance
 * check. A fee whose own receipt does fail it has lost money mid-statement.
 */
export function explainIssues(issues: ParseIssue[]): IssueExplanation[] {
  const receiptsThatDoNotAddUp = new Set(
    issues
      .filter(issue => issue.code === 'balance_mismatch' && issue.receiptNo !== undefined)
      .map(issue => issue.receiptNo)
  );

  return issues.map(issue => {
    const paymentMissingHere =
      issue.code === 'charge_without_payment' &&
      issue.receiptNo !== undefined &&
      receiptsThatDoNotAddUp.has(issue.receiptNo);

    if (!paymentMissingHere) {
      return explainIssue(issue);
    }

    return {
      severity: 'attention',
      headline: describe(issue).headline,
      explanation:
        "The balance doesn't add up at this receipt either, so the payment is most " +
        "likely missing from this statement or misread, rather than in last month's."
    };
  });
}

function describe(issue: ParseIssue): { headline: string; explanation: string } {
  const receipt = issue.receiptNo ?? 'this receipt';

  switch (issue.code) {
    case 'balance_mismatch':
      return describeBalanceMismatch(issue, receipt);

    case 'charge_without_payment':
      return {
        headline:
          issue.amountInCents === undefined
            ? `A fee (receipt ${receipt}) has no matching payment here.`
            : `A ${formatKsh(issue.amountInCents)} fee (receipt ${receipt}) has no matching payment here.`,
        explanation:
          "The payment may be in last month's statement — save that one, open this one " +
          "again, and they'll be matched. If not, the payment is missing from this statement."
      };

    case 'row_unreadable_time':
      return describeUnreadableRow(issue, "Its date couldn't be read.");

    case 'row_unreadable_balance':
      return describeUnreadableRow(issue, "Its balance couldn't be read.");

    case 'row_missing_amount':
      return describeUnreadableRow(issue, 'It showed no amount coming in or going out.');

    case 'row_both_amounts':
      return describeUnreadableRow(
        issue,
        "It showed money both coming in and going out, which one transaction can't do."
      );

    case 'no_consistent_order':
      return {
        headline: `The entries for receipt ${receipt} don't add up in any order.`,
        explanation: 'One of them is probably missing or misread.'
      };

    case 'row_skipped_status':
      return {
        headline: `A transaction marked "${issue.status ?? 'not completed'}" wasn't counted.`,
        explanation: 'Only completed transactions are counted.'
      };

    case 'ambiguous_order':
      return {
        headline: `The entries for receipt ${receipt} could have happened in more than one order.`,
        explanation: "They're shown in the order printed. Totals aren't affected."
      };

    case 'group_too_large':
      return {
        headline:
          issue.rowCount === undefined
            ? `Receipt ${receipt} has several entries, shown in the order printed.`
            : `Receipt ${receipt} has ${issue.rowCount} entries, shown in the order printed.`,
        explanation: "Totals aren't affected."
      };

    // Saved before codes existed. The technical text is the best there is,
    // so show it rather than invent an explanation.
    default:
      return {
        headline: 'Something in this statement needs checking.',
        explanation: issue.detail
      };
  }
}

function describeBalanceMismatch(
  issue: ParseIssue,
  receipt: string
): { headline: string; explanation: string } {
  const headline = `The balance doesn't add up at receipt ${receipt}.`;
  const cause =
    'Either a transaction is missing from the statement or one was misread. ' +
    'The gap is often exactly the missing amount.';

  if (
    issue.expectedBalanceInCents === undefined ||
    issue.printedBalanceInCents === undefined
  ) {
    return { headline, explanation: cause };
  }

  const gap = Math.abs(issue.printedBalanceInCents - issue.expectedBalanceInCents);

  return {
    headline,
    explanation:
      `The transactions come to ${formatKsh(issue.expectedBalanceInCents)}, but the ` +
      `statement says ${formatKsh(issue.printedBalanceInCents)} — ` +
      `${formatKsh(gap)} apart. ${cause}`
  };
}

function describeUnreadableRow(
  issue: ParseIssue,
  reason: string
): { headline: string; explanation: string } {
  const where = issue.page === null ? '' : ` on page ${issue.page}`;

  return {
    headline: `One transaction${where} couldn't be read, so it isn't counted.`,
    explanation: `${reason} Totals may be missing this transaction.`
  };
}
