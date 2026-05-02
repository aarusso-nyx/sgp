import { ReportCatalogService } from './report-catalog.service';

describe('ReportCatalogService', () => {
  it('returns paged report definitions', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([
        {
          id: 'def-1',
          code: 'REL-1',
          name: 'Relatorio',
          description: '',
          module_key: 'relatorio',
          status: 'ACTIVE',
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);
    const service = new ReportCatalogService({
      configured: true,
      query,
    } as never);

    const result = await service.list({ page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.items[0]?.code).toBe('REL-1');
  });

  it('returns empty report pages and queues report generation requests', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'request-1',
          status: 'REQUESTED',
          requested_at: '2026-04-25T12:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'request-2',
          status: 'REQUESTED',
          requested_at: new Date('2026-04-25T12:00:00.000Z'),
        },
      ]);
    const service = new ReportCatalogService({
      configured: true,
      query,
    } as never);

    await expect(service.list({ search: 'Folha' })).resolves.toMatchObject({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
    await expect(
      service.generateRequest({
        definitionId: 'def-1',
      }),
    ).resolves.toEqual({
      id: 'request-1',
      status: 'REQUESTED',
      requestedAt: '2026-04-25T12:00:00.000Z',
    });
    await expect(
      service.generateRequest({
        definitionId: 'def-2',
        branchId: 'branch-1',
        payrollRunId: 'run-1',
        processingTypeId: 'proc-1',
        competenceYear: 2026,
        competenceMonth: 4,
      }),
    ).resolves.toHaveProperty('id', 'request-2');
    expect(query).toHaveBeenNthCalledWith(3, expect.any(String), [
      'def-1',
      '',
      '',
      '',
      null,
      null,
    ]);
    expect(query).toHaveBeenNthCalledWith(4, expect.any(String), [
      'def-2',
      'branch-1',
      'run-1',
      'proc-1',
      2026,
      4,
    ]);
  });

  it('requires a configured database', async () => {
    const service = new ReportCatalogService({ configured: false } as never);

    await expect(service.list({})).rejects.toThrow('DATABASE_URL is required');
  });
});
