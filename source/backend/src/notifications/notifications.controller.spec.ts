import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  it('delegates listing and serves stream metadata', async () => {
    const list = jest.fn().mockResolvedValue({ items: [] });
    const unreadCount = jest.fn().mockResolvedValue({ unread: 3 });
    const controller = new NotificationsController({
      list,
      unreadCount,
    } as never);

    await controller.list({ page: 1, pageSize: 20 });
    const streamResult = controller.stream();
    const unreadResult = await controller.unreadCount();

    expect(list).toHaveBeenCalled();
    expect(unreadCount).toHaveBeenCalled();
    expect(unreadResult).toEqual({ unread: 3 });
    expect(streamResult).toEqual(
      expect.objectContaining({
        channel: 'notificacoes',
        mode: 'sse',
        status: 'connected',
      }),
    );
  });
});
