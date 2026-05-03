import { RecadastramentoService } from './recadastramento.service';

describe('RecadastramentoService', () => {
  it('queues SIPREV export report requests', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('public.report_definition')) {
        return [{ id: 'definition-1' }];
      }
      return [
        {
          id: 'request-1',
          status: 'REQUESTED',
          requested_at: '2026-04-25T10:00:00.000Z',
        },
      ];
    });
    const service = new RecadastramentoService({
      configured: true,
      query,
    } as never);

    await expect(
      service.requestSiprevExport({ competencia: '2026-04' }),
    ).resolves.toMatchObject({
      id: 'request-1',
      status: 'REQUESTED',
      requestedAt: '2026-04-25T10:00:00.000Z',
    });
  });
});
