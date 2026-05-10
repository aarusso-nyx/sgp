import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import {
  TEST_INSTANT_2026_04_01T10_00_00_000Z,
  TEST_INSTANT_2026_05_02T10_00_00_000Z,
} from '../../../../tests/backend/helpers/date-fixtures';
import { ContrachequeService } from './contracheque.service';

describe('ContrachequeService', () => {
  const actor = {
    sub: 'sub-1',
    username: 'portal.user',
    tenantId: '00000000-0000-0000-0000-000000000100',
    groups: [],
    permissions: [],
    claims: { cpf: '00011122233', email: 'portal@example.test' },
  };
  const employee = { id: 'employee-1' };
  const meusDadosService = {
    loadEmployee: jest.fn(),
    toDate: (value: Date | string) =>
      (value instanceof Date
        ? value.toISOString()
        : new Date(value).toISOString()
      ).slice(0, 10),
    toIso: (value: Date | string) =>
      value instanceof Date
        ? value.toISOString()
        : new Date(value).toISOString(),
  };

  beforeEach(() => {
    meusDadosService.loadEmployee.mockReset();
  });

  it('maps payroll summary rows with paging defaults and search', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '3' }])
      .mockResolvedValueOnce([
        {
          id: 'run-1',
          competence_year: 2026,
          competence_month: 4,
          status: 'OPEN',
          branch_code: '001',
          branch_name: 'Matriz',
          payroll_type_code: 'MENSAL',
          processing_type_code: 'NORMAL',
          employee_count: 12,
          total_earnings: '1000.00',
          total_deductions: '100.00',
          total_net: '900.00',
          created_at: new Date(TEST_INSTANT_2026_04_01T10_00_00_000Z),
          closed_at: '2026-04-30T20:00:00.000Z',
        },
      ]);
    const service = new ContrachequeService(
      { configured: true, query } as never,
      meusDadosService as never,
    );

    const result = await service.payrollSummary({
      page: 2,
      pageSize: 2,
      search: 'Matriz',
    });

    expect(result).toMatchObject({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });
    expect(result.items[0]).toMatchObject({
      id: 'run-1',
      competenceYear: 2026,
      branchCode: '001',
      closedAt: '2026-04-30T20:00:00.000Z',
    });
    expect(query).toHaveBeenNthCalledWith(1, expect.any(String), ['%matriz%']);
    expect(query).toHaveBeenNthCalledWith(2, expect.any(String), [
      '%matriz%',
      2,
      2,
    ]);
  });

  it('returns an empty page when no payroll summary rows exist', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const service = new ContrachequeService(
      { configured: true, query } as never,
      meusDadosService as never,
    );

    await expect(service.payrollSummary({})).resolves.toMatchObject({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('requires a configured database for portal payroll operations', async () => {
    const service = new ContrachequeService(
      { configured: false } as never,
      meusDadosService as never,
    );

    await expect(service.payrollSummary({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('maps vacation, termination, and paystub flows', async () => {
    meusDadosService.loadEmployee.mockResolvedValue(employee);
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          payroll_run_id: 'run-ferias',
          vacation_record_id: 'vac-1',
          competence_year: 2026,
          competence_month: 1,
          status: 'PAID',
          total_earnings: '1000.00',
          total_deductions: '0.00',
          total_net: '1000.00',
        },
      ])
      .mockResolvedValueOnce([
        {
          payroll_run_id: 'run-resc',
          competence_year: 2026,
          competence_month: 2,
          status: 'GENERATED',
          termination_date: '2026-02-15',
          total_earnings: '2000.00',
          total_deductions: '100.00',
          total_net: '1900.00',
          components: [{ code: 'RESC_SALDO' }],
        },
      ])
      .mockResolvedValueOnce([
        {
          payroll_run_id: 'run-pay',
          competence_year: 2026,
          competence_month: 5,
          payroll_status: 'CLOSED',
          competence_status: 'AVAILABLE',
          registration: 'MAT-1',
          employee_name: '<Servidor>',
          total_earnings: '3000.00',
          total_deductions: '500.00',
          net_amount: '2500.00',
          generated_at: TEST_INSTANT_2026_05_02T10_00_00_000Z,
          lines: [
            {
              code: '100',
              description: 'Base & salario',
              kind: 'EARNING',
              amount: '3000.00',
            },
          ],
        },
      ]);
    const service = new ContrachequeService(
      { configured: true, query } as never,
      meusDadosService as never,
    );

    await expect(service.vacationPayslips(actor)).resolves.toMatchObject([
      { payrollRunId: 'run-ferias', totalNet: '1000.00' },
    ]);
    await expect(service.terminationTerms(actor)).resolves.toMatchObject([
      {
        payrollRunId: 'run-resc',
        terminationDate: '2026-02-15',
        components: [{ code: 'RESC_SALDO' }],
      },
    ]);
    await expect(service.getPaystub(actor, '2026-05')).resolves.toMatchObject({
      payrollRunId: 'run-pay',
      competence: '2026-05',
      html: expect.stringContaining('&lt;Servidor&gt;'),
    });
  });

  it('rejects invalid and missing paystub competences', async () => {
    meusDadosService.loadEmployee.mockResolvedValue(employee);
    const service = new ContrachequeService(
      { configured: true, query: jest.fn().mockResolvedValue([]) } as never,
      meusDadosService as never,
    );

    await expect(service.getPaystub(actor, '2026-13')).rejects.toThrow(
      'Paystub competence is invalid',
    );
    await expect(service.getPaystub(actor, 'bad')).rejects.toThrow(
      'Paystub competence must use YYYY-MM',
    );
    await expect(service.getPaystub(actor, '2026-05')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
