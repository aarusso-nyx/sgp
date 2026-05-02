import { BadRequestException } from '@nestjs/common';

import { PayrollEngineService } from './payroll-engine.service';

describe('PayrollEngineService', () => {
  const payrollRunId = '11111111-1111-4111-8111-111111111111';
  const tenantId = '22222222-2222-4222-8222-222222222222';

  it('validates calculation requests deterministically', () => {
    const service = new PayrollEngineService({ configured: false } as never);

    expect(() =>
      service.validateCalculationRequest({
        payrollRunId: 'not-a-uuid',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      service.validateCalculationRequest({
        payrollRunId,
        competenceYear: 2026,
      }),
    ).toThrow(BadRequestException);

    expect(
      service.validateCalculationRequest({
        payrollRunId,
        mode: 'RETROACTIVE',
        competenceYear: 2026,
        competenceMonth: 4,
      }),
    ).toEqual({
      payrollRunId,
      mode: 'RETROACTIVE',
      competenceYear: 2026,
      competenceMonth: 4,
      dryRun: false,
      requestedBy: undefined,
    });
  });

  it('returns a dry-run calculation acceptance without requiring a database', async () => {
    const service = new PayrollEngineService({ configured: false } as never);

    await expect(
      service.requestCalculation({
        payrollRunId,
        dryRun: true,
      }),
    ).resolves.toMatchObject({
      accepted: true,
      dryRun: true,
      payrollRunId,
      mode: 'TOTAL',
      formulaEngine: {
        schema: 'payroll_calc',
        cacheTable: 'payroll_calc.formula_cache',
      },
    });
  });

  it('executes the formula-backed calculation path and records generated status', async () => {
    const query = jest.fn();
    query
      .mockResolvedValueOnce([
        {
          id: payrollRunId,
          tenant_id: tenantId,
          competence_year: 2026,
          competence_month: 4,
          status: 'DRAFT',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'item-1' }, { id: 'item-2' }])
      .mockResolvedValueOnce([
        {
          id: payrollRunId,
          status: 'GENERATED',
          employee_count: 2,
          total_earnings: '5000.00',
          total_deductions: '750.00',
          total_net: '4250.00',
          updated_at: '2026-04-25T12:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([]);

    const service = new PayrollEngineService({
      configured: true,
      query,
    } as never);

    await expect(
      service.requestCalculation({
        payrollRunId,
        competenceYear: 2026,
        competenceMonth: 4,
      }),
    ).resolves.toMatchObject({
      accepted: true,
      dryRun: false,
      payrollRunId,
      status: 'GENERATED',
      formulaItemsUpdated: 2,
      totals: {
        earnings: '5000.00',
        deductions: '750.00',
        net: '4250.00',
      },
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('payroll_calc.evaluate_earning_deduction'),
      [payrollRunId],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO payroll.payroll_run_status_history'),
      expect.arrayContaining([payrollRunId]),
    );
  });

  it('reports runtime status with and without database checks', async () => {
    await expect(
      new PayrollEngineService({ configured: false } as never).status(),
    ).resolves.toMatchObject({
      checks: {
        database: 'not_configured',
        formulaDefinitions: null,
      },
    });

    const query = jest.fn().mockResolvedValueOnce([]);
    await expect(
      new PayrollEngineService({ configured: true, query } as never).status(),
    ).resolves.toMatchObject({
      checks: {
        database: 'configured',
        formulaDefinitions: {
          total: 0,
          ready: 0,
          errored: 0,
        },
      },
    });
  });

  it('rejects invalid modes, competence ranges, and missing runtime database', async () => {
    const service = new PayrollEngineService({ configured: false } as never);

    expect(() =>
      service.validateCalculationRequest({
        payrollRunId,
        mode: 'BAD' as never,
      }),
    ).toThrow('mode must be one of');
    expect(() =>
      service.validateCalculationRequest({
        payrollRunId,
        competenceYear: 1999,
        competenceMonth: 4,
      }),
    ).toThrow('competenceYear must be between 2000 and 2100');
    expect(() =>
      service.validateCalculationRequest({
        payrollRunId,
        competenceYear: 2026,
        competenceMonth: 13,
      }),
    ).toThrow('competenceMonth must be between 1 and 12');
    await expect(service.requestCalculation({ payrollRunId })).rejects.toThrow(
      'DATABASE_URL is required',
    );
  });

  it('handles missing runs, competence mismatch, and calculation failure marking', async () => {
    await expect(
      new PayrollEngineService({
        configured: true,
        query: jest.fn().mockResolvedValueOnce([]),
      } as never).requestCalculation({ payrollRunId }),
    ).rejects.toThrow('Payroll run not found');

    await expect(
      new PayrollEngineService({
        configured: true,
        query: jest.fn().mockResolvedValueOnce([
          {
            id: payrollRunId,
            tenant_id: tenantId,
            competence_year: 2026,
            competence_month: 4,
            status: 'DRAFT',
          },
        ]),
      } as never).requestCalculation({
        payrollRunId,
        competenceYear: 2026,
        competenceMonth: 5,
      }),
    ).rejects.toThrow(
      'Requested competence does not match payroll run competence',
    );

    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: payrollRunId,
          tenant_id: tenantId,
          competence_year: 2026,
          competence_month: 4,
          status: 'DRAFT',
        },
      ])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('formula failed'))
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await expect(
      new PayrollEngineService({
        configured: true,
        query,
      } as never).requestCalculation({
        payrollRunId,
        requestedBy: ' engine.user ',
      }),
    ).rejects.toThrow('formula failed');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'FAILED'"),
      [payrollRunId],
    );
  });
});
