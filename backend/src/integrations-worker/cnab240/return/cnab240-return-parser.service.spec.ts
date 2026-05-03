import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Cnab240ReturnParserService } from './cnab240-return-parser.service';

interface Cnab240ReturnGoldenCase {
  slug: string;
  bankCode: string;
}

interface SerializedCnab240ReturnFixture {
  bankCode: string;
  expectedHash: string;
  details: Array<{
    bankCode: string;
    sequence: number;
    employeeId: string;
    amount: string;
    occurrenceCode: string;
  }>;
}

const GOLDEN_ROOT = join(
  __dirname,
  '../../../../../tests/backend/golden/cnab240/return',
);

const GOLDEN_CASES: Cnab240ReturnGoldenCase[] = [
  { slug: 'bb', bankCode: '001' },
  { slug: 'caixa', bankCode: '104' },
  { slug: 'itau', bankCode: '341' },
  { slug: 'bradesco', bankCode: '237' },
  { slug: 'santander', bankCode: '033' },
];

describe('Cnab240ReturnParserService', () => {
  const parser = new Cnab240ReturnParserService();

  it.each(GOLDEN_CASES)(
    'parses the validated retorno byte fixture for $slug',
    ({ slug, bankCode }) => {
      const fixture = readGoldenFixture(slug);
      const result = parser.parse(fixture.expected);

      expect(fixture.input.bankCode).toBe(bankCode);
      expect(result.bankCode).toBe(bankCode);
      expect(result.details).toEqual(fixture.input.details);
      expect(result.fileHash).toBe(fixture.input.expectedHash);
      expect(fixture.expected.byteLength).toBe(
        (fixture.input.details.length + 3) * 240,
      );
    },
  );
});

function readGoldenFixture(slug: string): {
  input: SerializedCnab240ReturnFixture;
  expected: Buffer;
} {
  const dir = join(GOLDEN_ROOT, slug);
  const input = JSON.parse(
    readFileSync(join(dir, 'input.json'), 'utf8'),
  ) as SerializedCnab240ReturnFixture;

  return {
    input,
    expected: readFileSync(join(dir, 'expected.ret')),
  };
}
