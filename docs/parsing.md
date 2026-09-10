# Parsing M-PESA statements

How the parser reads a Safaricom M-PESA statement PDF, what it can and cannot
handle, and what it found when run against a real one.

## Pipeline

    PDF + password
          ↓  decrypt-and-extract-text-items
    PositionedTextItem[]        text fragments with page coordinates
          ↓  group-text-items-into-rows
    RawRow[]                    one entry per statement line, all strings
          ↓  parse-statement-row
    Transaction[]               typed, classified, amounts in cents
          ↓  order-transactions-chronologically
          ↓  link-charges-to-parent-transactions
          ↓  verify-balance
    ParseResult                 transactions + issues + verification status

Only the first stage knows pdf.js exists. Everything after it operates on plain
data, which is why the whole pipeline is testable without a PDF.

## Reading the table

Statements print rows newest-first. Row geometry is not reliable for finding
where one row ends and the next begins: adjacent rows can be 10 units apart
while a wrapped continuation line sits 6 units below its parent.

A line starts a new row only if it carries **both** a receipt number in the
leftmost column **and** a completion time in the second. Position alone is not
enough — the Data Protection Act disclaimer's second line also begins in the
receipt column.

Amount columns are right-aligned, so they are identified by right edge
(Paid In 418, Withdrawn 487, Balance 557) rather than left. Text columns are
left-aligned and identified by `x`.

Detail cells wrap across up to three lines. Continuation lines contain only
details-column text and are appended to the row above.

Line grouping keys on page as well as `y`, because `y` restarts at the top of
every page.

## Verified transaction formats

Confirmed against a real statement. Matched with high confidence.

| Type | Details format |
|---|---|
| `payment_received` | `Funds received from - {phone} {NAME}` |
| `send_money` | `Customer Transfer to - {phone} {NAME}` |
| `paybill_payment` | `Pay Bill to {shortcode} - {NAME} Acc. {account}` |
| `paybill_payment` | `Pay Bill Online to {shortcode} - {NAME} Acc. {account}` |
| `till_payment` | `Merchant Payment to {till} - {MERCHANT}` |
| `pochi_payment` | `Customer Payment to Small Business to - {phone} {NAME}` |
| `unit_trust_investment` | `Unit Trust Invest To {shortcode} - {FUND} by M-PESA\UnitTrust` |
| `bundle_purchase` | `Customer Bundle Purchase to {shortcode}{PRODUCT} by - {phone} {NAME}` |
| `airtime` | `Airtime Purchase` |
| `charge` | `Customer Transfer of Funds Charge` |
| `charge` | `Pay Bill Charge` |

Charge patterns are listed before the transactions they belong to. They do not
currently collide, but the ordering guards against a future pattern being
loosened.

`Customer Payment to Small Business` must precede the generic transfer pattern:
it also contains `to -` followed by a phone number and name.

## Provisional transaction formats

Matched on keywords and always returned with **low** confidence. These formats
have not been seen on a real statement, so the patterns are guesses:
`agent_deposit`, `agent_withdrawal`, `fuliza_loan`, `fuliza_repayment`,
`reversal`.

Move a pattern into the verified set once a real example confirms it.

## Charges

A charge shares its parent transaction's receipt number and timestamp. It is
therefore linked by adjacency once rows are chronologically ordered.

The charge usually follows its parent, but Safaricom deducts some paybill fees
**before** the payment itself, putting the parent after. Both sides are checked.

## Settlement bundles

When a transaction and its charge settle together, Safaricom prints the balance
after **both** on both rows:

    SAMPLE0A01   Customer Transfer to ...   -400.00   3,950.00
    SAMPLE0A01   Customer Transfer Charge     -7.00   3,950.00

Balance verification therefore groups adjacent rows sharing a receipt number
**and** an identical printed balance, and checks the group's combined effect
against that shared figure.

Not all charges bundle. Transfers frequently settle row by row
(`2,811.00` then `2,804.00`), so the grouping keys on the shared balance rather
than the receipt number alone.

Within a bundle, both orderings satisfy the arithmetic. The statement does not
say which came first, and it does not matter, so the printed order is kept
without reporting ambiguity.

## Balance verification

Every row prints the balance after it was applied, so each settlement event's
balance must equal the previous balance plus that event's combined effect. A
break means a row was dropped, misread, or misclassified as in/out.

After a break the walk resumes from the **statement's** figure rather than the
computed one, so a single problem produces one issue instead of cascading
through every row after it. The reported discrepancy is often the exact amount
of the missing transaction.

This is the strongest correctness check available, because Safaricom supplies
the answer.

## Known limitations

**Bundle purchases.** The shortcode and product name are printed with no
separator (`4093441SAFARICOM DATA BUNDLES`). The parser splits on the leading
run of digits. This is correct in every observed case, but a product name
beginning with a digit would break it, so these rows are always marked low
confidence rather than trusted.

**Charges at a statement boundary.** A charge in the first rows of a statement
may have its parent in the previous month's file. It is reported as unlinked.
Planned: an optional lookup callback so the import service can resolve these
against already-stored transactions, keeping the parser free of database
imports.

**Unit trust counterparty.** The `by M-PESA\UnitTrust` suffix is included in the
extracted fund name. Stripping it would need a rule invented from a single
example.

**Inconsistent source data.** Statements can be internally inconsistent. The
parser reports this and marks the statement unverified rather than guessing.

## Environment notes

Safari does not implement async iteration over `ReadableStream`, which pdf.js's
`getTextContent()` uses internally. Text is extracted via
`page.streamTextContent().getReader()` instead, pulling from the stream
manually. `getReader()` and `read()` are supported everywhere, so no polyfill
or alternative build is needed.

pdf.js is loaded from its default build in the browser and its legacy build
under Node. The default build resolves its worker relative to the importing
module, which works under a bundler but fails outside one. The worker file is
copied into `public/` by a postinstall script and referenced by URL — the main
build and the worker must come from the same variant or pdf.js reports a
version mismatch.

## Results against a real statement

Four pages, August–September 2026, password protected.

| | |
|---|---|
| Transactions parsed | 138 |
| Unclassified (`unknown`) | 0 |
| Low confidence | 7 (all bundle purchases, low by design) |
| Issues | 2 |
| Balance verified | No |

Both issues trace to the same cause: a transaction that Safaricom **omitted
from its own statement**. A charge appears with no parent, and the closing
balance is 400.00 lower than the transaction list accounts for. The balance
walk located it and named the amount.

`balance verified: false` is the correct result for this statement. A parser
that reported otherwise would be hiding a defect in the source data.