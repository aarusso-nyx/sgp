import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NoopPdfAValidator } from '@stynx-nyx/pdf-a';
import type {
  PdfAValidateOptions,
  PdfAValidationResult,
  PdfAValidator,
} from '@stynx-nyx/pdf-a';

import { PdfABuilderService } from './pdf-a-builder.service';
import { PayslipDocument } from './payslip-template';
import { PDF_A_VALIDATOR } from '../pdf-a/pdf-a-validator.provider';

const updateGoldens = process.env.SGP_UPDATE_R3_016_GOLDENS === '1';

class SpyPdfAValidator implements PdfAValidator {
  readonly calls: Array<{
    pdf: Uint8Array;
    opts: PdfAValidateOptions | undefined;
  }> = [];

  constructor(private readonly response: PdfAValidationResult) {}

  validate(
    pdf: Uint8Array,
    opts?: PdfAValidateOptions,
  ): Promise<PdfAValidationResult> {
    this.calls.push({ pdf, opts });
    return Promise.resolve(this.response);
  }
}

function validResult(): PdfAValidationResult {
  return {
    valid: true,
    declared: { version: 'A-2', conformance: 'b' },
    rulesetVersion: 'spy-valid',
    validatedAt: new Date().toISOString(),
    durationMs: 1,
    errors: [],
  };
}

function invalidResult(): PdfAValidationResult {
  return {
    valid: false,
    declared: { version: 'A-2', conformance: 'b' },
    rulesetVersion: 'spy-invalid',
    validatedAt: new Date().toISOString(),
    durationMs: 2,
    errors: [
      {
        ruleId: '6.6.4-1',
        severity: 'error',
        clause: 'PDF/A-2:6.6.4',
        message: 'XMP PDF/A part metadata is missing.',
      },
    ],
  };
}

async function buildService(
  validator: PdfAValidator,
): Promise<PdfABuilderService> {
  const module = await Test.createTestingModule({
    providers: [
      PdfABuilderService,
      { provide: PDF_A_VALIDATOR, useValue: validator },
    ],
  }).compile();
  return module.get(PdfABuilderService);
}

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
    const service = await buildService(new NoopPdfAValidator());
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
    const service = await buildService(new NoopPdfAValidator());
    const first = await service.buildPayslip(document);
    const second = await service.buildPayslip(document);

    expect(first.equals(second)).toBe(true);
  });

  it('matches the payslip PDF/A PAdES golden fixture byte-for-byte', async () => {
    const service = await buildService(new NoopPdfAValidator());
    const input = JSON.parse(
      readFileSync(join(goldenDir, 'input.json'), 'utf8'),
    ) as PayslipDocument;

    const actual = await service.buildPayslip(input);

    expect(
      actual.equals(expectedBuffer(join(goldenDir, 'expected.pdf'), actual)),
    ).toBe(true);
  });

  it('calls validator on generated PDF and attaches result to audit record', async () => {
    const spy = new SpyPdfAValidator(validResult());
    const service = await buildService(spy);

    const audit = await service.buildPayslipWithAudit(document);

    expect(spy.calls).toHaveLength(1);
    const [call] = spy.calls;
    expect(call.pdf).toBeInstanceOf(Uint8Array);
    expect(call.pdf.length).toBeGreaterThan(0);
    expect(call.opts).toEqual({ version: 'A-2', conformance: 'b' });
    expect(audit.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(audit.pdfAValidation).toEqual(spy['response']);
    expect(audit.pdfAValidation.valid).toBe(true);
  });

  it('non-conformant validator result does not throw and logs a warning', async () => {
    const spy = new SpyPdfAValidator(invalidResult());
    const service = await buildService(spy);
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    try {
      const audit = await service.buildPayslipWithAudit(document);

      expect(audit.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(audit.pdfAValidation.valid).toBe(false);
      expect(audit.pdfAValidation.errors[0]?.ruleId).toBe('6.6.4-1');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = warnSpy.mock.calls[0]![0] as string;
      expect(message).toContain('PDF/A validation reported non-conformance');
      expect(message).toContain('6.6.4-1');
    } finally {
      warnSpy.mockRestore();
    }
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
