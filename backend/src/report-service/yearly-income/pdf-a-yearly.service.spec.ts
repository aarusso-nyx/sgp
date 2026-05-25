import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { PdfABuilderService } from '../payslip/pdf-a-builder.service';
import {
  toYearlyIncomeDocument,
  YearlyIncomeAggregate,
} from './yearly-income-template';

const goldenDir = join(
  __dirname,
  '../../../../tests/backend/golden/comprovante-anual-v01',
);
const updateGoldens = process.env.SGP_UPDATE_R3_016_GOLDENS === '1';

describe('PdfABuilderService yearly income', () => {
  it('creates PDF/A-1b-style binary output with integrity-validating metadata', async () => {
    const aggregate: YearlyIncomeAggregate = {
      tenantId: '00000000-0000-4000-8000-000000000100',
      tenantName: 'Municipio de Teste',
      tenantDocument: '12345678000199',
      employeeId: '00000000-0000-4000-8000-000000000001',
      registration: 'MAT-001',
      employeeName: 'Servidor Teste',
      cpf: '00011122233',
      employmentLink: 'Efetivo',
      yearBase: 2025,
      taxableTotal: '74500.25',
      thirteenthSalary: '5000.25',
      vacationTotal: '9500.00',
      severanceTotal: '0.00',
      exemptTotal: '1200.00',
      inssRppsTotal: '8250.00',
      irrfTotal: '6100.00',
      dependentsCount: 2,
      s1210Total: '75700.25',
      s1210IrrfTotal: '6100.00',
      recomputedAt: '2026-02-28T00:00:00.000Z',
    };
    const service = new PdfABuilderService();
    const buffer = await service.buildYearlyIncome(
      toYearlyIncomeDocument(aggregate),
    );

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.toString('latin1')).toContain('%%STYNX-PADES-SIGNATURE:');
    expect(service.validatePdfA1b(buffer)).toEqual({
      valid: true,
      reasons: [],
    });
  });

  it('matches the annual comprovante PDF/A golden fixture byte-for-byte', async () => {
    const service = new PdfABuilderService();
    const input = readJson<YearlyIncomeAggregate>(
      join(goldenDir, 'input.json'),
    );
    const actual = await service.buildYearlyIncome(
      toYearlyIncomeDocument(input),
    );
    const expected = expectedBuffer(join(goldenDir, 'expected.pdf'), actual);

    expect(actual.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(decodeSignatureBlock(actual)).toMatchObject({
      format: 'PAdES',
      profile: 'PAdES-B-B',
      signerName: 'Municipio de Teste',
      signedAt: '2026-02-28T00:00:00.000Z',
      reason: 'Comprovante de Rendimentos 2025',
      verifyUrl: '/v1/portal/yearly-income/2025/pdf',
    });
    expect(actual.equals(expected)).toBe(true);
  });
});

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function expectedBuffer(path: string, actual: Buffer): Buffer {
  if (updateGoldens || !existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, actual);
  }
  return readFileSync(path);
}

function decodeSignatureBlock(buffer: Buffer): Record<string, unknown> {
  const match = buffer
    .toString('latin1')
    .match(/%%STYNX-PADES-SIGNATURE:([A-Za-z0-9+/=]+)/);
  if (!match) throw new Error('missing STYNX PAdES signature block');
  return JSON.parse(Buffer.from(match[1], 'base64').toString('utf8')) as Record<
    string,
    unknown
  >;
}
