import type { PositionedTextItem } from './types';

export type PdfExtractionOutcome =
  | { ok: true; items: PositionedTextItem[]; pageCount: number }
  | { ok: false; reason: 'wrong_password' | 'password_required' | 'invalid_pdf'; detail: string };

/**
 * Opens a (possibly encrypted) PDF and returns every text fragment with its
 * position on the page.
 *
 * The password is used here and nowhere else. It is never stored, logged, or
 * sent anywhere — the whole point of decrypting in the browser.
 *
 * This is the only file in the parser that knows pdf.js exists. Everything
 * downstream works on PositionedTextItem[], which is why it can all be tested
 * without a PDF.
 */
export async function decryptAndExtractTextItems(
  fileBytes: ArrayBuffer,
  password?: string
): Promise<PdfExtractionOutcome> {
  const isBrowser = typeof window !== 'undefined';

  // pdf.js ships two builds, and each environment needs a different one.
  // The browser gets the default build, whose worker is served from public/.
  // Node gets the legacy build, because the default build resolves its worker
  // relative to the importing module, which only works under a bundler.
  // Both must come from the same variant as the worker file, or pdf.js
  // reports a version mismatch.
  const pdfjs = isBrowser
    ? await import('pdfjs-dist')
    : await import('pdfjs-dist/legacy/build/pdf.mjs');

  if (isBrowser) {
    // Served from public/ — copied there by the postinstall script.
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  // Named for what it is, so it does not read as the browser's `document`.
  let pdfDocument;
  try {
    pdfDocument = await pdfjs.getDocument({
      data: new Uint8Array(fileBytes),
      password: password ?? ''
    }).promise;
  } catch (error) {
    return mapExtractionError(error);
  }

  const items: PositionedTextItem[] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);

    // Safari does not support async iteration over ReadableStream, which
    // getTextContent() uses internally. Reading the stream manually avoids it.
    const reader = page.streamTextContent().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      for (const item of value.items) {
        if (!('str' in item) || item.str.trim() === '') {
          continue;
        }

        const [, , , , x, y] = item.transform;

        items.push({
          text: item.str,
          x: Math.round(x),
          right: Math.round(x + item.width),
          y: Math.round(y),
          page: pageNumber
        });
      }
    }
  }

  return { ok: true, items, pageCount: pdfDocument.numPages };
}

function mapExtractionError(error: unknown): PdfExtractionOutcome {
  const name = (error as { name?: string })?.name;
  const code = (error as { code?: number })?.code;

  if (name === 'PasswordException') {
    // pdf.js: 1 = password needed, 2 = password incorrect
    return code === 1
      ? { ok: false, reason: 'password_required', detail: 'This statement is password protected.' }
      : { ok: false, reason: 'wrong_password', detail: 'That password did not work.' };
  }

  return {
    ok: false,
    reason: 'invalid_pdf',
    detail: error instanceof Error ? error.message : 'The file could not be read as a PDF.'
  };
}