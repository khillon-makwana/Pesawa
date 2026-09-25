import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import type { SampleStatement } from './generate-sample-statement-rows';

/**
 * Renders sample rows into a PDF laid out like a Safaricom statement.
 *
 * Column positions match those measured from a real statement, so the output
 * exercises the same extraction path as the real thing rather than a simplified
 * version of it. If the parser reads this correctly, that is meaningful.
 */

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

/** Left edges for text columns, right edges for the right-aligned amounts. */
const COLUMN_LEFT = { receipt: 38, time: 108, details: 177, status: 282 };
const COLUMN_RIGHT = { paidIn: 418, withdrawn: 487, balance: 557 };

const ROW_HEIGHT = 16;
const CONTINUATION_OFFSET = 6;
const FONT_SIZE = 7;
const TOP_Y = 775;
const BOTTOM_LIMIT = 140;

/** Details cells wrap at roughly this width on a real statement. */
const DETAILS_MAX_CHARS = 30;

function wrapDetails(details: string): string[] {
  const words = details.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current === '') {
      current = word;
    } else if (`${current} ${word}`.length <= DETAILS_MAX_CHARS) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current !== '') {
    lines.push(current);
  }

  return lines;
}

function drawRightAligned(
  page: PDFPage,
  text: string,
  rightEdge: number,
  y: number,
  font: PDFFont
) {
  const width = font.widthOfTextAtSize(text, FONT_SIZE);
  page.drawText(text, { x: rightEdge - width, y, size: FONT_SIZE, font });
}

function drawTableHeader(page: PDFPage, font: PDFFont) {
  const headerY = TOP_Y + 10;
  page.drawText('Receipt No.', { x: 51, y: headerY, size: FONT_SIZE, font });
  page.drawText('Completion Time', { x: 111, y: headerY, size: FONT_SIZE, font });
  page.drawText('Details', { x: 216, y: headerY, size: FONT_SIZE, font });
  page.drawText('Transaction Status', { x: 282, y: headerY, size: FONT_SIZE, font });
  page.drawText('Paid In', { x: 373, y: headerY, size: FONT_SIZE, font });
  page.drawText('Withdrawn', { x: 436, y: headerY, size: FONT_SIZE, font });
  page.drawText('Balance', { x: 510, y: headerY, size: FONT_SIZE, font });
}

function drawPageFurniture(
  page: PDFPage,
  font: PDFFont,
  pageNumber: number,
  total: number
) {
  page.drawText(`Page ${pageNumber} of ${total}`, {
    x: 525,
    y: 804,
    size: FONT_SIZE,
    font
  });

  page.drawText(
    'Disclaimer: Any personal information shared with you should be handled in accordance with the Data Protection Act',
    { x: 39, y: 118, size: 6, font, color: rgb(0.3, 0.3, 0.3) }
  );

  page.drawText('SAMPLE STATEMENT - FICTIONAL DATA', {
    x: 39,
    y: 100,
    size: 8,
    font,
    color: rgb(0.6, 0.1, 0.1)
  });
}

export async function renderSampleStatementPdf(
  sample: SampleStatement,
  password: string
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);

  // Lay out rows across pages first, so the page count is known before drawing
  const pages: Array<Array<{ row: (typeof sample.rows)[0]; detailLines: string[] }>> = [];
  let currentPage: Array<{ row: (typeof sample.rows)[0]; detailLines: string[] }> = [];
  let y = TOP_Y;

  for (const row of sample.rows) {
    const detailLines = wrapDetails(row.details);
    const heightNeeded = ROW_HEIGHT + (detailLines.length - 1) * CONTINUATION_OFFSET;

    if (y - heightNeeded < BOTTOM_LIMIT) {
      pages.push(currentPage);
      currentPage = [];
      y = TOP_Y;
    }

    currentPage.push({ row, detailLines });
    y -= heightNeeded;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  pages.forEach((pageRows, index) => {
    const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawTableHeader(page, font);
    drawPageFurniture(page, font, index + 1, pages.length);

    let rowY = TOP_Y;

    for (const { row, detailLines } of pageRows) {
      page.drawText(row.receiptNo, {
        x: COLUMN_LEFT.receipt,
        y: rowY,
        size: FONT_SIZE,
        font
      });
      page.drawText(row.completionTime, {
        x: COLUMN_LEFT.time,
        y: rowY,
        size: FONT_SIZE,
        font
      });
      page.drawText(row.status, {
        x: COLUMN_LEFT.status,
        y: rowY,
        size: FONT_SIZE,
        font
      });

      if (row.paidIn !== '') {
        drawRightAligned(page, row.paidIn, COLUMN_RIGHT.paidIn, rowY, font);
      }
      if (row.withdrawn !== '') {
        drawRightAligned(page, row.withdrawn, COLUMN_RIGHT.withdrawn, rowY, font);
      }
      drawRightAligned(page, row.balance, COLUMN_RIGHT.balance, rowY, font);

      detailLines.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: COLUMN_LEFT.details,
          y: rowY - lineIndex * CONTINUATION_OFFSET,
          size: FONT_SIZE,
          font
        });
      });

      rowY -= ROW_HEIGHT + (detailLines.length - 1) * CONTINUATION_OFFSET;
    }
  });

  document.setTitle('Sample M-PESA Statement');

  return document.save({
    // pdf-lib encrypts with the user password, matching how Safaricom ships them
    userPassword: password,
    ownerPassword: password
  } as Parameters<typeof document.save>[0]);
}
