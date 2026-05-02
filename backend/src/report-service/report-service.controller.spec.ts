import { ReportServiceController } from './report-service.controller';

describe('ReportServiceController', () => {
  it('delegates report-service runtime endpoints', async () => {
    const service = {
      health: jest.fn().mockReturnValue({ ok: true }),
      status: jest.fn().mockReturnValue({ queues: {} }),
      queueReport: jest.fn().mockResolvedValue({ id: 'request-1' }),
      pollOnce: jest.fn().mockResolvedValue({ processed: 1 }),
    };
    const controller = new ReportServiceController(service as never);

    expect(controller.health()).toEqual({ ok: true });
    expect(controller.status()).toEqual({ queues: {} });
    await expect(
      controller.queueReport({
        tenantId: '22222222-2222-4222-8222-222222222222',
        definitionCode: 'AVALIACAO_RELATORIO_CICLO',
      }),
    ).resolves.toEqual({ id: 'request-1' });
    await expect(controller.pollOnce({ limit: 1 })).resolves.toEqual({
      processed: 1,
    });
  });
});
