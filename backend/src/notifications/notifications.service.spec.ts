import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('returns paged notifications', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([
        {
          id: 'n-1',
          title: 'Aviso',
          body: 'Mensagem',
          module_key: 'rh',
          read_at: null,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          metadata: {},
        },
      ]);
    const service = new NotificationsService({
      configured: true,
      query,
    } as never);

    const result = await service.list({ page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(Object.keys(result)).toEqual([
      'items',
      'page',
      'pageSize',
      'total',
      'totalPages',
    ]);
    expect(result.items[0]).toEqual(expect.objectContaining({ id: 'n-1' }));
  });

  it('uses the shared pagination boundary values for notification lists', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '101' }])
      .mockResolvedValueOnce([]);
    const service = new NotificationsService({
      configured: true,
      query,
    } as never);

    await expect(service.list({ page: 3, pageSize: 50 })).resolves.toEqual({
      items: [],
      page: 3,
      pageSize: 50,
      total: 101,
      totalPages: 3,
    });

    expect(query).toHaveBeenLastCalledWith(expect.any(String), ['%%', 50, 100]);
  });

  it('handles empty pages, unread counts, read updates, and preferences', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: '3' }])
      .mockResolvedValueOnce([
        { id: 'n-1', read_at: '2026-01-01T00:00:00.000Z' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: '2' }]);
    const service = new NotificationsService({
      configured: true,
      query,
    } as never);

    await expect(service.list({ search: 'Aviso' })).resolves.toMatchObject({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
    await expect(service.unreadCount()).resolves.toEqual({ unread: 3 });
    await expect(service.markRead('n-1')).resolves.toEqual({
      id: 'n-1',
      readAt: '2026-01-01T00:00:00.000Z',
    });
    await expect(service.markRead('n-2', false)).resolves.toEqual({
      id: 'n-2',
      readAt: null,
    });
    await expect(service.markAllRead()).resolves.toEqual({ updated: 2 });
    expect(service.getUserPreferences()).toMatchObject({
      canais: { email: true, push: true, sms: false },
    });
    expect(
      service.updateUserPreferences({ canais: { email: false } }),
    ).toMatchObject({
      canais: { email: false },
    });
  });

  it('requires a configured database for mutable notification operations', async () => {
    const service = new NotificationsService({ configured: false } as never);

    await expect(service.list({})).rejects.toThrow('DATABASE_URL is required');
    await expect(service.unreadCount()).rejects.toThrow(
      'DATABASE_URL is required',
    );
    await expect(service.markRead('n-1')).rejects.toThrow(
      'DATABASE_URL is required',
    );
    await expect(service.markAllRead()).rejects.toThrow(
      'DATABASE_URL is required',
    );
  });
});
