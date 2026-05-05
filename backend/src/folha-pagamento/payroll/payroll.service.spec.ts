import { PayrollService } from './payroll.service';
import {
  TEST_INSTANT_2024_01_01T00_00_00_000Z,
  TEST_INSTANT_2026_04_01T00_00_00_000Z,
  TEST_INSTANT_2026_04_15T00_00_00_000Z,
  TEST_INSTANT_2026_04_25T00_00_00_000Z,
} from '../../../../tests/backend/helpers/date-fixtures';

describe('PayrollService', () => {
  const runRow = {
    id: 'run-1',
    competence_year: 2026,
    competence_month: 4,
    processing_type: 'Mensal',
    payroll_type: 'Normal',
    branch_name: 'Matriz',
    payment_date: '2026-04-30',
    status: 'DRAFT',
    employee_count: 0,
    total_net: '0.00',
    created_at: new Date(TEST_INSTANT_2026_04_01T00_00_00_000Z),
    updated_at: '2026-04-25T00:00:00.000Z',
    branch_id: null,
    payroll_type_id: 'type-1',
    payroll_type_code: 'MENSAL',
    processing_type_id: 'proc-1',
    processing_type_code: 'MENSAL',
  };

  it('returns paged payroll runs', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([
        {
          id: 'run-1',
          competence_year: 2026,
          competence_month: 4,
          processing_type: 'Mensal',
          payroll_type: 'Normal',
          branch_name: 'Matriz',
          payment_date: null,
          status: 'DRAFT',
          employee_count: 2,
          total_net: '1000.00',
          created_at: new Date(TEST_INSTANT_2026_04_01T00_00_00_000Z),
          updated_at: new Date(TEST_INSTANT_2026_04_01T00_00_00_000Z),
        },
      ]);
    const service = new PayrollService({ configured: true, query } as never);

    const result = await service.listRuns({ page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.items[0]?.status).toBe('DRAFT');
  });

  it('creates and updates payroll runs with default branch handling', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([runRow])
      .mockResolvedValueOnce([{ ...runRow, status: 'CLOSED' }]);
    const service = new PayrollService({ configured: true, query } as never);

    await expect(
      service.createRun({
        competenceYear: 2026,
        competenceMonth: 4,
        payrollTypeId: 'type-1',
        processingTypeId: 'proc-1',
      }),
    ).resolves.toMatchObject({
      id: 'run-1',
      paymentDate: '2026-04-30T00:00:00.000Z',
    });
    expect(query).toHaveBeenNthCalledWith(1, expect.any(String), [
      2026,
      4,
      'type-1',
      'proc-1',
      '',
    ]);
    await expect(
      service.updateRunStatus('run-1', { status: 'CLOSED' }),
    ).resolves.toHaveProperty('status', 'CLOSED');
  });

  it('handles payroll run conflicts, missing runs, and unavailable databases', async () => {
    await expect(
      new PayrollService({
        configured: true,
        query: jest.fn().mockRejectedValueOnce({ code: '23505' }),
      } as never).createRun({
        competenceYear: 2026,
        competenceMonth: 4,
        payrollTypeId: 'type-1',
        processingTypeId: 'proc-1',
        branchId: 'branch-1',
      }),
    ).rejects.toThrow('already exists');
    await expect(
      new PayrollService({
        configured: true,
        query: jest.fn().mockResolvedValueOnce([]),
      } as never).updateRunStatus('missing', { status: 'CLOSED' }),
    ).rejects.toThrow('Payroll run not found');
    await expect(
      new PayrollService({ configured: false } as never).listRuns({}),
    ).rejects.toThrow('DATABASE_URL is required');
  });

  it('calculates a termination payroll run', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'run-1',
          competence_year: 2026,
          competence_month: 4,
          processing_type: 'Rescisao',
          payroll_type: 'Rescisao',
          branch_name: 'Matriz',
          payment_date: null,
          status: 'DRAFT',
          employee_count: 0,
          total_net: '0.00',
          created_at: new Date(TEST_INSTANT_2026_04_01T00_00_00_000Z),
          updated_at: new Date(TEST_INSTANT_2026_04_01T00_00_00_000Z),
          branch_id: null,
          payroll_type_id: 'type-1',
          payroll_type_code: 'RESCISAO',
          processing_type_id: 'proc-1',
          processing_type_code: 'RESCISAO',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'earning-1' }])
      .mockResolvedValueOnce([{ id: 'earning-2' }])
      .mockResolvedValueOnce([{ id: 'earning-3' }])
      .mockResolvedValueOnce([{ id: 'earning-4' }])
      .mockResolvedValueOnce([
        {
          employee_id: 'emp-1',
          functional_status_id: 'status-1',
          branch_id: null,
          salary_amount: '5800.00',
          hired_on: new Date(TEST_INSTANT_2024_01_01T00_00_00_000Z),
          terminated_on: new Date(TEST_INSTANT_2026_04_15T00_00_00_000Z),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          employee_count: '1',
          total_earnings: '6766.67',
          total_deductions: '0.00',
          total_net: '6766.67',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'run-1',
          competence_year: 2026,
          competence_month: 4,
          processing_type: null,
          payroll_type: null,
          branch_name: null,
          payment_date: null,
          status: 'GENERATED',
          employee_count: 1,
          total_net: '6766.67',
          created_at: new Date(TEST_INSTANT_2026_04_01T00_00_00_000Z),
          updated_at: new Date(TEST_INSTANT_2026_04_25T00_00_00_000Z),
        },
      ])
      .mockResolvedValueOnce([]);
    const service = new PayrollService({ configured: true, query } as never);

    const result = await service.calculateRun('run-1', { mode: 'TOTAL' });

    expect(result.status).toBe('GENERATED');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE payroll.employee_payroll_item'),
      ['run-1', 'payroll.run.reprocessed'],
    );
  });

  it('populates a payroll run from configured mappings', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'run-1',
          competence_year: 2026,
          competence_month: 4,
          processing_type: 'Mensal',
          payroll_type: 'Normal',
          branch_name: 'Matriz',
          payment_date: null,
          status: 'DRAFT',
          employee_count: 0,
          total_net: '0.00',
          created_at: new Date(TEST_INSTANT_2026_04_01T00_00_00_000Z),
          updated_at: new Date(TEST_INSTANT_2026_04_01T00_00_00_000Z),
          branch_id: null,
          payroll_type_id: 'type-1',
          payroll_type_code: 'MENSAL',
          processing_type_id: 'proc-1',
          processing_type_code: 'MENSAL',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          employee_id: 'emp-1',
          branch_id: null,
          work_location_id: 'loc-1',
          functional_status_id: 'status-1',
          job_position_id: 'job-1',
          employment_link_id: 'link-1',
          salary_amount: '5800.00',
        },
      ])
      .mockResolvedValueOnce([
        {
          earning_deduction_id: 'ed-1',
          code: 'SALARIO_BASE',
          description: 'Salario base',
          kind: 'EARNING',
          formula_expression: 'MONTHLY_SALARY',
          default_amount: null,
          default_quantity: '1',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          employee_count: '1',
          total_earnings: '5800.00',
          total_deductions: '0.00',
          total_net: '5800.00',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'run-1',
          competence_year: 2026,
          competence_month: 4,
          processing_type: 'Mensal',
          payroll_type: 'Normal',
          branch_name: 'Matriz',
          payment_date: null,
          status: 'DRAFT',
          employee_count: 1,
          total_net: '5800.00',
          created_at: new Date(TEST_INSTANT_2026_04_01T00_00_00_000Z),
          updated_at: new Date(TEST_INSTANT_2026_04_25T00_00_00_000Z),
        },
      ]);
    const service = new PayrollService({ configured: true, query } as never);

    const result = await service.populateRun('run-1', {
      replaceCalculatedItems: true,
    });

    expect(result.totalNet).toBe('5800.00');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO payroll.employee_payroll_item'),
      expect.arrayContaining(['emp-1', 'run-1', 'ed-1']),
    );
  });

  it('populates mapped formulas, skips zero-value mappings, and uses aggregate defaults', async () => {
    const query = jest.fn(async (sql: string) => {
      if (
        sql.includes('SELECT') &&
        sql.includes('FROM payroll.payroll_run pr')
      ) {
        return [runRow];
      }
      if (
        sql.includes('FROM hr.employee e') &&
        sql.includes('salary_reference')
      ) {
        return [
          {
            employee_id: 'emp-1',
            branch_id: null,
            work_location_id: 'loc-1',
            functional_status_id: 'status-1',
            job_position_id: 'job-1',
            employment_link_id: 'link-1',
            salary_amount: '1200.00',
          },
        ];
      }
      if (sql.includes('SELECT DISTINCT ON')) {
        return [
          {
            earning_deduction_id: 'ed-fixed',
            code: 'FIXED',
            description: 'Fixo',
            kind: 'EARNING',
            formula_expression: null,
            default_amount: '100.00',
            default_quantity: null,
          },
          {
            earning_deduction_id: 'ed-empty',
            code: 'EMPTY',
            description: 'Vazio',
            kind: 'EARNING',
            formula_expression: '',
            default_amount: null,
            default_quantity: '1',
          },
          {
            earning_deduction_id: 'ed-half',
            code: 'HALF',
            description: 'Metade',
            kind: 'EARNING',
            formula_expression: 'MONTHLY_SALARY / 2',
            default_amount: null,
            default_quantity: '2',
          },
          {
            earning_deduction_id: 'ed-twelfth',
            code: 'TWELFTH',
            description: 'Doze avos',
            kind: 'EARNING',
            formula_expression: 'MONTHLY_SALARY / 12',
            default_amount: null,
            default_quantity: '1',
          },
          {
            earning_deduction_id: 'ed-monthly',
            code: 'MONTHLY',
            description: 'Mensal',
            kind: 'EARNING',
            formula_expression: 'MONTHLY_SALARY',
            default_amount: null,
            default_quantity: '1',
          },
          {
            earning_deduction_id: 'ed-reference',
            code: 'REFERENCE',
            description: 'Referencia',
            kind: 'EARNING',
            formula_expression: 'REFERENCE_VALUE',
            default_amount: null,
            default_quantity: '1',
          },
          {
            earning_deduction_id: 'ed-zero',
            code: 'ZERO',
            description: 'Zero',
            kind: 'EARNING',
            formula_expression: 'UNKNOWN',
            default_amount: null,
            default_quantity: '1',
          },
        ];
      }
      if (sql.includes('count(DISTINCT employee_id)::text')) return [];
      return [];
    });
    const service = new PayrollService({ configured: true, query } as never);

    await expect(
      service.populateRun('run-1', { replaceCalculatedItems: false }),
    ).resolves.toMatchObject({ id: 'run-1' });

    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE payroll.employee_payroll_item'),
      ['run-1'],
    );
    expect(
      query.mock.calls.filter(([sql]) =>
        String(sql).includes('INSERT INTO payroll.employee_payroll_item'),
      ),
    ).toHaveLength(5);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE payroll.payroll_run'),
      ['run-1', '0', '0', '0', '0'],
    );
  });

  it('creates and processes an advance payment', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'run-1',
          competence_year: 2026,
          competence_month: 4,
          processing_type: 'Mensal',
          payroll_type: 'Normal',
          branch_name: 'Matriz',
          payment_date: null,
          status: 'DRAFT',
          employee_count: 0,
          total_net: '0.00',
          created_at: new Date(TEST_INSTANT_2026_04_01T00_00_00_000Z),
          updated_at: new Date(TEST_INSTANT_2026_04_01T00_00_00_000Z),
          branch_id: null,
          payroll_type_id: 'type-1',
          payroll_type_code: 'MENSAL',
          processing_type_id: 'proc-1',
          processing_type_code: 'MENSAL',
        },
      ])
      .mockResolvedValueOnce([{ id: 'req-1' }])
      .mockResolvedValueOnce([{ id: 'pay-1' }])
      .mockResolvedValueOnce([{ id: 'earning-1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          employee_count: '1',
          total_earnings: '500.00',
          total_deductions: '0.00',
          total_net: '500.00',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const service = new PayrollService({ configured: true, query } as never);

    const result = await service.createAdvancePayment('run-1', {
      employeeId: 'emp-1',
      requestedAmount: '500.00',
    });

    expect(result.paymentId).toBe('pay-1');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO payroll.advance_payment'),
      ['req-1', 'emp-1', 'run-1', '500.00', expect.any(String), ''],
    );
  });

  it('calculates non-total runs with empty totals and missing summaries', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([runRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...runRow, status: 'GENERATED' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const service = new PayrollService({ configured: true, query } as never);

    await expect(
      service.calculateRun('run-1', { mode: 'PARCIAL' as never }),
    ).resolves.toMatchObject({
      id: 'run-1',
      status: 'GENERATED',
    });
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE payroll.employee_payroll_item'),
      ['run-1'],
    );
    await expect(
      new PayrollService({
        configured: true,
        query: jest.fn().mockResolvedValueOnce([]),
      } as never).calculateRun('missing', {}),
    ).rejects.toThrow('Payroll run not found');
  });
});
