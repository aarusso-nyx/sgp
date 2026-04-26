import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const row = {
    id: 'req-1',
    definition_code: 'RELATORIO',
    definition_name: 'Relatorio',
    status: 'COMPLETED',
    requested_at: new Date('2026-04-25T10:00:00.000Z'),
    completed_at: '2026-04-25T10:05:00.000Z',
    files_count: '2',
    error_message: null,
  };

  it('lists and reads report requests', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('count(*)::text AS total')) return [{ total: '1' }];
      return [row];
    });
    const service = new ReportsService({ configured: true, query } as never);

    await expect(
      service.listRequests({
        page: 1,
        pageSize: 5,
        search: 'relatorio',
        status: 'COMPLETED',
        definitionCode: 'RELATORIO',
      }),
    ).resolves.toMatchObject({
      total: 1,
      totalPages: 1,
      items: [{ filesCount: 2, completedAt: '2026-04-25T10:05:00.000Z' }],
    });
    await expect(service.listRequests({})).resolves.toHaveProperty(
      'items.0.id',
      'req-1',
    );
    await expect(service.getRequestById('req-1')).resolves.toMatchObject({
      definitionCode: 'RELATORIO',
      requestedAt: '2026-04-25T10:00:00.000Z',
    });
  });

  it('handles empty and unavailable report request states', async () => {
    await expect(
      new ReportsService({
        configured: true,
        query: jest.fn(async (sql: string) =>
          sql.includes('count(*)::text AS total') ? [{ total: '0' }] : [],
        ),
      } as never).listRequests({ pageSize: 10 }),
    ).resolves.toMatchObject({ total: 0, totalPages: 0 });
    await expect(
      new ReportsService({
        configured: true,
        query: jest.fn(async () => []),
      } as never).getRequestById('missing'),
    ).rejects.toThrow('Report request not found');
    await expect(
      new ReportsService({ configured: false } as never).listRequests({}),
    ).rejects.toThrow('DATABASE_URL is required');
  });
});
