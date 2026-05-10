import { BadRequestException } from '@nestjs/common';

import { RequestContextStore } from '../../backend/src/common/request-context/request-context.store';
import { ReintegrationOrderService } from '../../backend/src/folha-pagamento/operations/reintegration/reintegration-order.service';

type QueryCall = { sql: string; values: unknown[] | undefined };

const FIXTURE_SYSTEM_NOW = new Date(Date.UTC(2026, 4, 8, 12, 0, 0));
const FIXTURE_REINSTATEMENT_AT = new Date(Date.UTC(2026, 4, 2, 3, 0, 0));

describe('ReintegrationOrderService branch behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(FIXTURE_SYSTEM_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses actor tenant context, summaries optional dates, and validates required dates', () => {
    const service = serviceWithClient();
    const runtime = service as unknown as {
      currentTenantId(): string;
      toSummary(row: Record<string, unknown>): unknown;
      dateOnly(value: Date | string | null): string;
    };

    RequestContextStore.run(
      {
        actor: {
          tenantId: 'tenant-from-actor',
          id: 'actor',
          type: 'user',
          roles: [],
          permissions: [],
        },
        tenantId: 'tenant-from-root',
        permissions: [],
      },
      () => {
        expect(runtime.currentTenantId()).toBe('tenant-from-actor');
      },
    );
    expect(() => runtime.currentTenantId()).toThrow(
      'Tenant context is required',
    );
    expect(() => runtime.dateOnly(null)).toThrow(BadRequestException);
    expect(
      runtime.toSummary({
        id: 'order',
        employment_link_id: 'link',
        original_termination_event_id: 'event',
        reinstatement_date: FIXTURE_REINSTATEMENT_AT,
        kind: 'JUDICIAL',
        process_number: null,
        court: null,
        decision_date: '2026-05-03',
        attachment_uri: null,
        status: 'REGISTERED',
        applied_at: null,
        created_at: '2026-05-04T00:00:00.000Z',
        original_s2299_receipt: null,
      }),
    ).toMatchObject({
      reinstatementDate: '2026-05-02',
      appliedAt: null,
      createdAt: '2026-05-04T00:00:00.000Z',
    });
  });

  it('resolves active status from link or database and rejects missing active status', async () => {
    const service = serviceWithClient();
    const runtime = service as unknown as {
      resolveActiveStatusId(
        client: unknown,
        tenantId: string,
        link: Record<string, unknown>,
      ): Promise<string>;
    };

    await expect(
      runtime.resolveActiveStatusId({ query: jest.fn() }, 'tenant', {
        functional_status_id: 'status-from-link',
      }),
    ).resolves.toBe('status-from-link');
    await expect(
      runtime.resolveActiveStatusId(
        {
          query: jest.fn(async () => ({
            rows: [{ id: 'active-status' }],
          })),
        },
        'tenant',
        { functional_status_id: null },
      ),
    ).resolves.toBe('active-status');
    await expect(
      runtime.resolveActiveStatusId(
        {
          query: jest.fn(async () => ({ rows: [] })),
        },
        'tenant',
        { functional_status_id: null },
      ),
    ).rejects.toThrow('Active functional status not found');
  });

  it('resolves termination events by explicit id, fallback lookup, and missing evidence', async () => {
    const service = serviceWithClient();
    const runtime = service as unknown as {
      resolveTerminationEvent(
        client: unknown,
        tenantId: string,
        employmentLinkId: string,
        input: Record<string, unknown>,
      ): Promise<unknown>;
    };
    const explicitClient = {
      query: jest.fn(async () => ({
        rows: [{ id: 'explicit', receipt: 'R1' }],
      })),
    };
    await expect(
      runtime.resolveTerminationEvent(explicitClient, 'tenant', 'link', {
        originalTerminationEventId: 'event',
      }),
    ).resolves.toEqual({ id: 'explicit', receipt: 'R1' });

    const fallbackClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'fallback', receipt: 'R2' }] }),
    };
    await expect(
      runtime.resolveTerminationEvent(fallbackClient, 'tenant', 'link', {
        originalTerminationEventId: 'missing',
        originalS2299Receipt: 'manual-receipt',
      }),
    ).resolves.toEqual({ id: 'fallback', receipt: 'R2' });
    await expect(
      runtime.resolveTerminationEvent(
        { query: jest.fn(async () => ({ rows: [] })) },
        'tenant',
        'link',
        {},
      ),
    ).rejects.toThrow('Original S-2299 event not found');
  });

  it('reuses or creates retro payroll runs and persists nullable link dimensions', async () => {
    const service = serviceWithClient();
    const runtime = service as unknown as {
      ensureRetroRun(
        client: unknown,
        tenantId: string,
        link: Record<string, unknown>,
        payrollTypes: Record<string, unknown>,
        year: number,
        month: number,
      ): Promise<string>;
      refreshRunTotals(
        client: unknown,
        tenantId: string,
        runId: string,
        link: Record<string, unknown>,
        competence: string,
      ): Promise<void>;
    };
    const updateCalls: QueryCall[] = [];
    await expect(
      runtime.ensureRetroRun(
        {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'run-existing' }] })
            .mockImplementation(async (sql: string, values?: unknown[]) => {
              updateCalls.push({ sql, values });
              return { rows: [] };
            }),
        },
        'tenant',
        { branch_id: null },
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
      runtime.ensureRetroRun(
        {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'run-inserted' }] }),
        },
        'tenant',
        { branch_id: 'branch' },
        {
          payroll_type_id: 'payroll-type',
          processing_type_id: 'processing-type',
        },
        2026,
        5,
      ),
    ).resolves.toBe('run-inserted');

    const calls: QueryCall[] = [];
    await runtime.refreshRunTotals(
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
      },
      'tenant',
      'run',
      {
        employee_id: 'employee',
        branch_id: null,
        work_location_id: undefined,
        functional_status_id: 'status',
      },
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

function serviceWithClient(): ReintegrationOrderService {
  return new ReintegrationOrderService({
    transaction: async (callback: (client: unknown) => Promise<unknown>) =>
      callback({ query: jest.fn(async () => ({ rows: [] })) }),
  } as never);
}
