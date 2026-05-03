import { PensionistaImportService } from './pensionista-import.service';
import { buildSimpleXlsx } from '../../../../tests/backend/helpers/simple-xlsx-fixture';

describe('PensionistaImportService', () => {
  const payrollRun = {
    id: '11111111-1111-4111-8111-111111111111',
    tenant_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    competence_year: 2026,
    competence_month: 5,
    status: 'DRAFT',
  };
  const pensionId = '55555555-5555-4555-8555-555555555555';
  const missingPensionId = '55555555-5555-4555-8555-555555555556';

  it('imports accepted pensionista XLSX rows and reports row-level errors', async () => {
    const xlsx = buildSimpleXlsx([
      [
        'pensao_id',
        'matricula_pensionista',
        'verba_codigo',
        'valor',
        'quantidade',
        'observacao',
      ],
      [pensionId, 'PENS-001', 'PENSAO_VAR', '1.234,56', '2', 'Ajuste'],
      [
        missingPensionId,
        'PENS-001',
        'PENSAO_VAR',
        '100,00',
        '1',
        'Missing pension',
      ],
    ]);
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM payroll.payroll_run')) {
        return { rows: [payrollRun] };
      }
      if (sql.includes('FROM hr.employee employee')) {
        return {
          rows: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              registration: 'PENS-001',
              beneficiary_id: '66666666-6666-4666-8666-666666666666',
            },
          ],
        };
      }
      if (sql.includes('FROM hr.pension_grant')) {
        return { rows: [{ id: pensionId }] };
      }
      if (sql.includes('FROM payroll.payroll_earning_deduction')) {
        return {
          rows: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              code: 'PENSAO_VAR',
            },
          ],
        };
      }
      if (sql.includes('INSERT INTO payroll.employee_payroll_item')) {
        return {
          rows: [
            {
              id: '44444444-4444-4444-8444-444444444444',
              inserted: true,
            },
          ],
        };
      }
      if (sql.includes('count(DISTINCT employee_id)::text')) {
        return {
          rows: [
            {
              employee_count: '1',
              total_earnings: '1234.56',
              total_deductions: '0.00',
              total_net: '1234.56',
            },
          ],
        };
      }
      return { rows: [] };
    });
    const transaction = jest.fn(
      (
        callback: (client: { query: typeof query }) => Promise<unknown>,
      ): Promise<unknown> => callback({ query }),
    );
    const service = new PensionistaImportService({
      configured: true,
      transaction,
    } as never);

    const result = await service.importFile(payrollRun.id, {
      buffer: xlsx,
      originalname: 'pensionistas.xlsx',
      size: xlsx.length,
    });

    expect(result).toMatchObject({
      payrollRunId: payrollRun.id,
      totalRows: 2,
      acceptedRows: 1,
      rejectedRows: 1,
    });
    expect(result.accepted[0]).toMatchObject({
      rowNumber: 2,
      pensionId,
      pensionBeneficiaryId: '66666666-6666-4666-8666-666666666666',
      pensionistaRegistration: 'PENS-001',
      amount: '1234.56',
      payrollItemIdempotencyKey:
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:2026:05:11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222:33333333-3333-4333-8333-333333333333:IMPORTED',
      pensionIdempotencyKey:
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:2026:05:11111111-1111-4111-8111-111111111111:55555555-5555-4555-8555-555555555555:22222222-2222-4222-8222-222222222222:33333333-3333-4333-8333-333333333333:PENSIONISTA_IMPORTED',
    });
    expect(result.errors[0]?.message).toContain('not found or inactive');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (idempotency_key)'),
      expect.arrayContaining(['1234.56', 'Ajuste']),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO payroll.payroll_run_status_history'),
      expect.any(Array),
    );
  });

  it('blocks imports into generated or closed payroll runs', async () => {
    const xlsx = buildSimpleXlsx([
      ['pensao_id', 'matricula_pensionista', 'verba_codigo', 'valor'],
      [pensionId, 'PENS-001', 'PENSAO_VAR', '10.00'],
    ]);
    const query = jest.fn().mockResolvedValueOnce({
      rows: [{ ...payrollRun, status: 'GENERATED' }],
    });
    const service = new PensionistaImportService({
      configured: true,
      transaction: (callback: (client: { query: typeof query }) => unknown) =>
        callback({ query }),
    } as never);

    await expect(
      service.importFile(payrollRun.id, {
        buffer: xlsx,
        originalname: 'pensionistas.xlsx',
      }),
    ).rejects.toThrow('cannot receive imported items');
  });

  it('validates required XLSX file and pension columns before persistence', async () => {
    const service = new PensionistaImportService({
      configured: true,
      transaction: jest.fn(),
    } as never);

    await expect(service.importFile(payrollRun.id, undefined)).rejects.toThrow(
      'XLSX file is required',
    );
    await expect(
      service.importFile(payrollRun.id, {
        buffer: buildSimpleXlsx([
          ['matricula_pensionista', 'verba_codigo', 'valor'],
          ['PENS-001', 'PENSAO_VAR', '10.00'],
        ]),
        originalname: 'pensionistas.xlsx',
      }),
    ).rejects.toThrow('pensao_id is required');
  });
});
