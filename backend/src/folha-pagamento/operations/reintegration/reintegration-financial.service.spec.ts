import { ReintegrationFinancialService } from './reintegration-financial.service';

type QueryCall = { sql: string; values: unknown[] | undefined };

describe('ReintegrationFinancialService branch behavior', () => {
  it('reuses or creates retro payroll runs and persists nullable link dimensions', async () => {
    const service = new ReintegrationFinancialService();
    const updateCalls: QueryCall[] = [];
    await expect(
      service.ensureRetroRun(
        {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'run-existing' }] })
            .mockImplementation(async (sql: string, values?: unknown[]) => {
              updateCalls.push({ sql, values });
              return { rows: [] };
            }),
        } as never,
        'tenant',
        { branch_id: null } as never,
        {
          payroll_type_id: 'payroll-type',
          processing_type_id: 'processing-type',
        },
        2026,
        5,
      ),
    ).resolves.toBe('run-existing');
    expect(updateCalls[0]?.values).toEqual(['tenant', 'run-existing']);

    await expect(
      service.ensureRetroRun(
        {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'run-inserted' }] }),
        } as never,
        'tenant',
        { branch_id: 'branch' } as never,
        {
          payroll_type_id: 'payroll-type',
          processing_type_id: 'processing-type',
        },
        2026,
        5,
      ),
    ).resolves.toBe('run-inserted');

    const calls: QueryCall[] = [];
    await service.refreshRunTotals(
      {
        query: jest.fn(async (sql: string, values?: unknown[]) => {
          calls.push({ sql, values });
          if (sql.includes('count(DISTINCT')) {
            return {
              rows: [
                {
                  employee_count: '1',
                  total_earnings: '100.00',
                  total_deductions: '10.00',
                  total_net: '90.00',
                },
              ],
            };
          }
          return { rows: [] };
        }),
      } as never,
      'tenant',
      'run',
      {
        employee_id: 'employee',
        branch_id: null,
        work_location_id: undefined,
        functional_status_id: 'status',
      } as never,
      '2026-05',
    );
    expect(
      calls.find((call) =>
        call.sql.includes('INSERT INTO payroll.payroll_financial_record'),
      )?.values,
    ).toEqual([
      'tenant',
      'employee',
      'run',
      '',
      '',
      'status',
      2026,
      5,
      '100.00',
      '10.00',
      '90.00',
      JSON.stringify({ cause: 'REINSTATEMENT_RETRO' }),
    ]);
  });
});
