import { describe, it, expect } from 'vitest';
import { generateSampleStatement } from '../generate-sample-statement-rows';

const SAMPLES = [
  ['the clean sample', generateSampleStatement()],
  [
    'the sample with a missing transaction',
    generateSampleStatement({ seedMissingTransaction: true })
  ]
] as const;

describe('generateSampleStatement', () => {
  it.each(SAMPLES)('prints no full phone number in %s', (_, sample) => {
    // A made-up full 2547 number could be someone's real line, and the
    // samples are served publicly.
    const allText = sample.rows.map(row => row.details).join('\n');

    expect(allText).not.toMatch(/2547\d{8}/);
  });

  it.each(SAMPLES)('masks numbers the way Safaricom does in %s', (_, sample) => {
    const numbers = sample.rows
      .map(row => row.details.match(/2547[\d*]{8}/)?.[0])
      .filter((number): number is string => number !== undefined);

    expect(numbers.length).toBeGreaterThan(0);
    for (const number of numbers) {
      expect(number).toMatch(/^2547\d{2}\*{3}\d{3}$/);
    }
  });
});
