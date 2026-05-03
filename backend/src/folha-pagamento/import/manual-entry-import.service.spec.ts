import { ManualEntryImportService } from './manual-entry-import.service';
import { buildSimpleXlsx } from '../../../../tests/backend/helpers/simple-xlsx-fixture';

describe('ManualEntryImportService', () => {
  const payrollRun = {
    id: '11111111-1111-4111-8111-111111111111',
    tenant_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    competence_year: 2026,
    competence_month: 5,
    status: 'DRAFT',
  };

  it('imports accepted manual entry XLSX rows and records folha-scoped history', async () => {
    const xlsx = buildSimpleXlsx([
      ['matricula', 'verba_codigo', 'valor', 'quantidade', 'observacao'],
      ['MAT-001', 'PLANTAO', '1.234,56', '2', 'Plantao manual'],
      ['MAT-404', 'PLANTAO', '100,00', '1', 'Missing employee'],
    ]);
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM payroll.payroll_run'))
        return { rows: [payrollRun] };
      if (sql.includes('FROM hr.employee')) {
        return {
          rows: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              registration: 'MAT-001',
            },
          ],
        };
      }
      if (sql.includes('FROM payroll.payroll_earning_deduction')) {
        return {
          rows: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              code: 'PLANTAO',
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
    const service = new ManualEntryImportService({
      configured: true,
      transaction,
    } as never);

    const result = await service.importFile(payrollRun.id, {
      buffer: xlsx,
      originalname: 'lancamentos-manuais.xlsx',
      size: xlsx.length,
    });

    expect(result).toMatchObject({
      payrollRunId: payrollRun.id,
      folhaPagamentoId: payrollRun.id,
      totalRows: 2,
      acceptedRows: 1,
      rejectedRows: 1,
    });
    expect(result.accepted[0]).toMatchObject({
      rowNumber: 2,
      amount: '1234.56',
      idempotencyKey:
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:2026:05:11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222:33333333-3333-4333-8333-333333333333:IMPORTED',
    });
    expect(result.errors[0]?.message).toContain('not found');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('\'IMPORTED\'::"PayrollEntrySource"'),
      expect.arrayContaining(['1234.56', 'Plantao manual']),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO payroll.payroll_run_status_history'),
      expect.arrayContaining([
        expect.stringContaining('MANUAL_ENTRY_XLSX_IMPORT'),
      ]),
    );
  });

  it('blocks manual entry imports into generated or closed payroll runs', async () => {
    const xlsx = buildSimpleXlsx([
      ['matricula', 'verba_codigo', 'valor'],
      ['MAT-001', 'PLANTAO', '10.00'],
    ]);
    const query = jest.fn().mockResolvedValueOnce({
      rows: [{ ...payrollRun, status: 'GENERATED' }],
    });
    const service = new ManualEntryImportService({
      configured: true,
      transaction: (callback: (client: { query: typeof query }) => unknown) =>
        callback({ query }),
    } as never);

    await expect(
      service.importFile(payrollRun.id, {
        buffer: xlsx,
        originalname: 'lancamentos-manuais.xlsx',
      }),
    ).rejects.toThrow('cannot receive manual entry imports');
  });

  it('validates required XLSX file and positive amount before persistence', async () => {
    const service = new ManualEntryImportService({
      configured: true,
      transaction: jest.fn(),
    } as never);

    await expect(service.importFile(payrollRun.id, undefined)).rejects.toThrow(
      'XLSX file is required',
    );
    await expect(
      service.importFile(payrollRun.id, {
        buffer: buildSimpleXlsx([
          ['matricula', 'verba_codigo', 'valor'],
          ['MAT-001', 'PLANTAO', '0'],
        ]),
        originalname: 'lancamentos-manuais.xlsx',
      }),
    ).rejects.toThrow('valor must be positive');
  });
});
