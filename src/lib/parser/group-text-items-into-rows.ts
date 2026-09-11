import type { PositionedTextItem, RawRow } from './types';

/**
 * Column positions measured from real statements. Text columns are
 * left-aligned so they are identified by `x`; amount columns are
 * right-aligned so they are identified by `right`.
 */
const COLUMN_LEFT_EDGES = {
  receipt: 38,
  completionTime: 108,
  details: 177,
  status: 282
} as const;

const COLUMN_RIGHT_EDGES = {
  paidIn: 418,
  withdrawn: 487,
  balance: 557
} as const;

/** How far an item may sit from a column edge and still belong to it. */
const COLUMN_TOLERANCE = 20;

/** Receipt numbers are 10 uppercase alphanumeric characters, e.g. SAMPLE0A02. */
const RECEIPT_NUMBER_PATTERN = /^[A-Z0-9]{10}$/;

/** Completion times are printed as "2026-06-04 18:25:10". */
const COMPLETION_TIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function isNear(value: number, target: number): boolean {
  return Math.abs(value - target) <= COLUMN_TOLERANCE;
}

/**
 * Bucket items into printed lines. Keyed on page as well as y, because y
 * restarts at the top of every page — without the page, line 5 of page 4
 * would merge with line 5 of page 2.
 *
 * Lines come out in reading order: page ascending, then y descending.
 */
function groupItemsIntoLines(items: PositionedTextItem[]): PositionedTextItem[][] {
  const linesByPageAndY = new Map<string, PositionedTextItem[]>();

  for (const item of items) {
    const key = `${item.page}:${item.y}`;
    const existing = linesByPageAndY.get(key);
    if (existing) {
      existing.push(item);
    } else {
      linesByPageAndY.set(key, [item]);
    }
  }

  return [...linesByPageAndY.values()]
    .sort((lineA, lineB) => {
      const pageDifference = lineA[0].page - lineB[0].page;
      return pageDifference !== 0 ? pageDifference : lineB[0].y - lineA[0].y;
    })
    .map(line => [...line].sort((left, right) => left.x - right.x));
}

/**
 * A line starts a new transaction row only if it carries both a receipt number
 * and a completion time. Position alone is not enough — the disclaimer's second
 * line also begins in the receipt column.
 */
function isTransactionRowStart(line: PositionedTextItem[]): boolean {
  const hasReceipt = line.some(
    item => isNear(item.x, COLUMN_LEFT_EDGES.receipt) && RECEIPT_NUMBER_PATTERN.test(item.text.trim())
  );
  const hasTime = line.some(
    item => isNear(item.x, COLUMN_LEFT_EDGES.completionTime) && COMPLETION_TIME_PATTERN.test(item.text.trim())
  );
  return hasReceipt && hasTime;
}

/** Continuation lines carry only details-column text. */
function extractDetailsContinuation(line: PositionedTextItem[]): string | null {
  const detailsItems = line.filter(item => isNear(item.x, COLUMN_LEFT_EDGES.details));
  if (detailsItems.length === 0) {
    return null;
  }
  return detailsItems.map(item => item.text.trim()).join(' ');
}

function buildRowFromLine(line: PositionedTextItem[], page: number): RawRow {
  const row: RawRow = {
    receiptNo: '',
    completionTime: '',
    details: '',
    status: '',
    paidIn: '',
    withdrawn: '',
    balance: '',
    page
  };

  for (const item of line) {
    const text = item.text.trim();
    if (text === '') continue;

    if (isNear(item.x, COLUMN_LEFT_EDGES.receipt)) {
      row.receiptNo = text;
    } else if (isNear(item.x, COLUMN_LEFT_EDGES.completionTime)) {
      row.completionTime = text;
    } else if (isNear(item.x, COLUMN_LEFT_EDGES.status)) {
      row.status = text;
    } else if (isNear(item.x, COLUMN_LEFT_EDGES.details)) {
      row.details = row.details === '' ? text : `${row.details} ${text}`;
    } else if (isNear(item.right, COLUMN_RIGHT_EDGES.paidIn)) {
      row.paidIn = text;
    } else if (isNear(item.right, COLUMN_RIGHT_EDGES.withdrawn)) {
      row.withdrawn = text;
    } else if (isNear(item.right, COLUMN_RIGHT_EDGES.balance)) {
      row.balance = text;
    }
    // Anything else is page furniture and is dropped.
  }

  return row;
}

/**
 * Turns positioned text fragments into statement rows.
 *
 * A row begins on a line carrying both a receipt number and a completion time.
 * Lines that follow and contain only details-column text are treated as
 * continuations of that row's details cell, which wraps across up to three
 * lines on real statements.
 *
 * Rows come out in the order they appear on the page: newest first.
 */
export function groupTextItemsIntoRows(items: PositionedTextItem[]): RawRow[] {
  const rows: RawRow[] = [];
  let currentRow: RawRow | null = null;

  for (const line of groupItemsIntoLines(items)) {
    if (isTransactionRowStart(line)) {
      currentRow = buildRowFromLine(line, line[0].page);
      rows.push(currentRow);
      continue;
    }

    if (currentRow === null) {
      continue; // header row and anything above the table
    }

    // The Data Protection Act disclaimer marks the end of the table on each
    // page. Everything below it — verification code, footer, page number — is
    // page furniture, so stop extending the row above. The letters are spaced
    // out in the source PDF, hence the loose pattern.
    const lineText = line.map(item => item.text).join(' ');
    if (/D\s*iscl\s*a\s*i\s*m\s*e\s*r/i.test(lineText)) {
      currentRow = null;
      continue;
    }

    const continuation = extractDetailsContinuation(line);
    if (continuation !== null) {
      currentRow.details = `${currentRow.details} ${continuation}`;
    }
    // Footer lines carry no details-column text, so they fall through.
  }

  return rows;
}