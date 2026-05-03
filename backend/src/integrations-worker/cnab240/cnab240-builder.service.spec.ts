import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  Cnab240BuilderService,
  Cnab240BuildInput,
} from './cnab240-builder.service';

interface Cnab240GoldenCase {
  slug: string;
  bankCode: string;
  expectedHash: string;
}

type SerializedCnab240BuildInput = Omit<Cnab240BuildInput, 'generatedAt'> & {
  generatedAt: string;
};

const GOLDEN_ROOT = join(__dirname, '../../../../tests/backend/golden/cnab240');

const GOLDEN_CASES: Cnab240GoldenCase[] = [
  {
    slug: 'bb',
    bankCode: '001',
    expectedHash:
      '23ddc8dab55fcd3266b802ade549aeaea9e0c9bb0a33ccca289f75bb7b573c90',
  },
  {
    slug: 'caixa',
    bankCode: '104',
    expectedHash:
      'a8883f0ba9bd768d7d05e589860c3ddff8c4596dc18d5bdd43abf3c90ecf0ddb',
  },
  {
    slug: 'itau',
    bankCode: '341',
    expectedHash:
      '25250b3c959dcbb2316b04c514ab10a3da3abe725f1de0bd53bf4aeeebe9d023',
  },
  {
    slug: 'bradesco',
    bankCode: '237',
    expectedHash:
      '0cec25036e2208970d8896eb8284881d4704c49e0228bea2b94138a32d3e8c11',
  },
  {
    slug: 'santander',
    bankCode: '033',
    expectedHash:
      '29c0c45cc23220175ec13c5fca7995819b50a2bb71842c15a805c214c1011d16',
  },
];

describe('Cnab240BuilderService', () => {
  const service = new Cnab240BuilderService();

  it.each(GOLDEN_CASES)(
    'generates the validated byte fixture for $slug',
    ({ slug, bankCode, expectedHash }) => {
      const fixture = readGoldenFixture(slug);
      const result = service.build(fixture.input);

      expect(fixture.input.bankCode).toBe(bankCode);
      expect(result.content).toEqual(fixture.expected);
      expect(result.content.byteLength).toBe(result.recordCount * 240);
      expect(result.recordCount).toBe(24);
      expect(result.totalAmount).toBe('10780.75');
      expect(result.fileHash).toBe(expectedHash);
      expect(service.validateTotals(result.content)).toBe(true);
      expect(result.details).toHaveLength(10);
      expect(
        result.details.every((detail) => detail.bankCode === Number(bankCode)),
      ).toBe(true);
    },
  );

  it('rejects trailer totals after a detail amount is mutated', () => {
    const result = service.build(readGoldenFixture('bb').input);
    const mutated = Buffer.from(result.content);
    mutated.write('9', 2 * 240 + 119, 'ascii');

    expect(service.validateTotals(mutated)).toBe(false);
  });

  it('filters unsupported banks before producing bytes', () => {
    expect(() =>
      service.build({
        bankCode: '999',
        companyName: 'Municipio Teste',
        companyRegistration: '12345678000199',
        paymentDate: '2026-04-25',
        generatedAt: new Date('2026-04-20T12:34:56.000Z'),
        remittanceNumber: 7,
        payments: readGoldenFixture('bb').input.payments.map((payment) => ({
          ...payment,
          bankCode: '999',
        })),
      }),
    ).toThrow('Unsupported CNAB 240 bank code');
  });
});

function readGoldenFixture(slug: string): {
  input: Cnab240BuildInput;
  expected: Buffer;
} {
  const dir = join(GOLDEN_ROOT, slug);
  const input = JSON.parse(
    readFileSync(join(dir, 'input.json'), 'utf8'),
  ) as SerializedCnab240BuildInput;

  return {
    input: {
      ...input,
      generatedAt: new Date(input.generatedAt),
    },
    expected: readFileSync(join(dir, 'expected.rem')),
  };
}
