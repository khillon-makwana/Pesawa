import { writeFileSync, mkdirSync } from 'fs';
import { generateSampleStatement } from './src/lib/sample/generate-sample-statement-rows.js';
import { renderSampleStatementPdf } from './src/lib/sample/render-sample-statement-pdf.js';

mkdirSync('public/samples', { recursive: true });

const clean = generateSampleStatement({ seed: 42 });
writeFileSync(
  'public/samples/sample-statement.pdf',
  await renderSampleStatementPdf(clean, '123456')
);

const defective = generateSampleStatement({ seed: 42, seedMissingTransaction: true });
writeFileSync(
  'public/samples/sample-statement-with-defect.pdf',
  await renderSampleStatementPdf(defective, '123456')
);

console.log('written to public/samples/');
