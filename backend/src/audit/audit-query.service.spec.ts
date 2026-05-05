import { AuditQueryService } from './audit-query.service';
import {
  TEST_INSTANT_2026_01_02T03_04_05_000Z,
  TEST_INSTANT_2026_01_02T03_05_05_000Z,
} from '../../../tests/backend/helpers/date-fixtures';

describe('AuditQueryService', () => {
  const eventRow = {
    id: 'evt-1',
    occurred_at: new Date(TEST_INSTANT_2026_01_02T03_04_05_000Z),
    actor_login: 'tester',
    actor_sub: 'sub-1',
    action: 'CREATE',
    resource_type: 'employee',
    resource_id: 'emp-1',
    table_name: 'employee',
    request_id: 'req-1',
    ip_address: '127.0.0.1',
    user_agent: 'agent',
    metadata: { key: 'value', statusCode: 201 },
  };

  it('lists paged events with explicit filters', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([eventRow]);
    const service = new AuditQueryService({ configured: true, query } as never);

    const result = await service.list({
      page: 1,
      pageSize: 20,
      actor: 'tester',
      action: 'CREATE',
      tableName: 'employee',
    });

    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: 'evt-1',
        action: 'CREATE',
        resourceType: 'employee',
        statusCode: 201,
      }),
    );
    const listCall = query.mock.calls[0] as [string, unknown[]];
    expect(listCall[0]).toContain('ae.action =');
  });

  it('uses all list filters and handles empty result totals', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const service = new AuditQueryService({ configured: true, query } as never);

    const result = await service.list({
      search: 'Servidor',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      actor: 'tester',
      action: 'UPDATE',
      tableName: 'employee',
      resourceType: 'employee',
      resourceId: 'emp-1',
      requestId: 'req-1',
      statusCode: 200,
    });

    expect(result).toMatchObject({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
    const values = query.mock.calls[0][1] as unknown[];
    expect(values).toHaveLength(10);
  });

  it('gets events and facets by id and filtered dimensions', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ ...eventRow, metadata: { statusCode: '201' } }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { value: 'CREATE', label: 'CREATE', count: '2' },
        { value: '', label: 'EMPTY', count: '1' },
      ])
      .mockResolvedValueOnce([
        { value: 'employee', label: 'employee', count: '3' },
      ])
      .mockResolvedValueOnce([
        { value: 'tester', label: 'tester', count: '4' },
      ]);
    const service = new AuditQueryService({ configured: true, query } as never);

    await expect(service.getById('evt-1')).resolves.toMatchObject({
      id: 'evt-1',
      statusCode: null,
    });
    await expect(service.getById('missing')).resolves.toBeNull();
    await expect(service.actionFacets({})).resolves.toEqual([
      { value: 'CREATE', label: 'CREATE', count: 2 },
    ]);
    await expect(
      service.tableFacets({ resourceType: 'employee' }),
    ).resolves.toEqual([{ value: 'employee', label: 'employee', count: 3 }]);
    await expect(service.userFacets({ actor: 'tester' })).resolves.toEqual([
      { value: 'tester', label: 'tester', count: 4 },
    ]);
  });

  it('creates audit report requests with redacted parameters', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: 'report-1',
        status: 'REQUESTED',
        requested_at: new Date(TEST_INSTANT_2026_01_02T03_04_05_000Z),
      },
    ]);
    const service = new AuditQueryService({ configured: true, query } as never);

    const result = await service.createReportRequest({
      actor: 'tester',
      parameters: { ['password']: 'redacted-input' },
    });

    const reportCall = query.mock.calls[0] as [string, string[]];
    const parameters = JSON.parse(reportCall[1][0]) as Record<string, unknown>;
    expect(parameters['password']).toBe('[REDACTED]');
    expect(result.id).toBe('report-1');
  });

  it('reads report request status and requires a configured database', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'report-1',
          status: 'COMPLETED',
          requested_at: '2026-01-02T03:04:05.000Z',
          completed_at: new Date(TEST_INSTANT_2026_01_02T03_05_05_000Z),
          error_message: null,
        },
      ])
      .mockResolvedValueOnce([]);
    const service = new AuditQueryService({ configured: true, query } as never);

    await expect(
      service.getReportRequestStatus('report-1'),
    ).resolves.toMatchObject({
      id: 'report-1',
      status: 'COMPLETED',
      completedAt: '2026-01-02T03:05:05.000Z',
    });
    await expect(service.getReportRequestStatus('missing')).resolves.toBeNull();
    await expect(
      new AuditQueryService({ configured: false } as never).list({}),
    ).rejects.toThrow('DATABASE_URL is required');
  });
});
