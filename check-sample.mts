// check-sample.mts
import { generateSampleStatement } from './src/lib/sample/generate-sample-statement-rows.js';
import { parseStatementRows } from './src/lib/parser/parse-statement-rows.js';

const sample = generateSampleStatement();
const result = parseStatementRows(sample.rows, sample.openingBalanceInCents);

console.log('rows:', sample.rows.length);
console.log('transactions:', result.transactions.length);
console.log('verified:', result.isBalanceVerified);
console.log('issues:', result.issues.length);
result.issues.slice(0, 5).forEach(i => console.log(' ', i.detail));

console.log('\n--- with a missing transaction ---');
const defective = generateSampleStatement({ seedMissingTransaction: true });
const defectiveResult = parseStatementRows(
  defective.rows,
  defective.openingBalanceInCents
);

console.log('transactions:', defectiveResult.transactions.length);
console.log('verified:', defectiveResult.isBalanceVerified);
defectiveResult.issues.forEach(i => console.log(' ', i.detail));
