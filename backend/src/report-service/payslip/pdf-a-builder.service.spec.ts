import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { PdfABuilderService } from './pdf-a-builder.service';
import { PayslipDocument } from './payslip-template';

const updateGoldens = process.env.SGP_UPDATE_R3_016_GOLDENS === '1';

describe('PdfABuilderService', () => {
  const document: PayslipDocument = {
    tenantName: 'Municipio de Teste',
    legalReference: 'Lei municipal de remuneracao.',
    employee: {
      id: '00000000-0000-4000-8000-000000000001',
      registration: '123',
      name: 'Servidor Teste',
      cpf: '00000000000',
      employmentLink: 'Efetivo',
      bankAgency: '0001',
      bankAccount: '12345-6',
    },
    payrollRunId: '00000000-0000-4000-8000-000000000901',
    competence: '2026-05-01',
    totals: {
      earnings: '5000.00',
      deductions: '750.00',
      net: '4250.00',
      irrfBase: '5000.00',
      inssBase: '5000.00',
      fgtsDeposit: '0.00',
    },
    lines: [
      {
        code: '100',
        description: 'Vencimento basico',
        reference: '30',
        earning: '5000.00',
        deduction: '',
      },
    ],
  };
  const goldenDir = join(
    __dirname,
    '../../../../tests/backend/golden/payslip-pdf-a-v01',
  );

  it('creates binary PDF output with PDF/A-style validation metadata', async () => {
    const service = new PdfABuilderService();
    const buffer = await service.buildPayslip(document);

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(decodeSignatureBlock(buffer)).toMatchObject({
      format: 'PAdES',
      profile: 'PAdES-B-B',
      signerName: 'Municipio de Teste',
      signedAt: '2026-05-01T00:00:00.000Z',
      reason: 'Contracheque 2026-05',
      verifyUrl:
        '/v1/portal/payslips/00000000-0000-4000-8000-000000000001/2026-05/pdf',
    });
    expect(service.validatePdfA1b(buffer)).toEqual({
      valid: true,
      reasons: [],
    });
  });

  it('is deterministic for the same payload', async () => {
    const service = new PdfABuilderService();
    const first = await service.buildPayslip(document);
    const second = await service.buildPayslip(document);

    expect(first.equals(second)).toBe(true);
  });

  it('matches the payslip PDF/A PAdES golden fixture byte-for-byte', async () => {
    const service = new PdfABuilderService();
    const input = JSON.parse(
      readFileSync(join(goldenDir, 'input.json'), 'utf8'),
    ) as PayslipDocument;

    const actual = await service.buildPayslip(input);

    expect(
      actual.equals(expectedBuffer(join(goldenDir, 'expected.pdf'), actual)),
    ).toBe(true);
  });
});

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
