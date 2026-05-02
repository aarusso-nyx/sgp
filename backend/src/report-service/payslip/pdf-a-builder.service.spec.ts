import { PdfABuilderService } from './pdf-a-builder.service';
import { PayslipDocument } from './payslip-template';

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

  it('creates binary PDF output with PDF/A-style validation metadata', async () => {
    const service = new PdfABuilderService();
    const buffer = await service.buildPayslip(document);

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
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
});
