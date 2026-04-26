import { ESocialService } from './esocial.service';

describe('ESocialService', () => {
  it('creates an event and queues a worker request', async () => {
    const query = jest.fn();
    query
      .mockResolvedValueOnce([{ id: 'def-1' }])
      .mockResolvedValueOnce([
        {
          id: 'evt-1',
          event_type: 'S-2299',
          reference: 'funcionario/emp-1',
          competence: '2026-04',
          status: 'PENDENTE',
          created_at: '2026-04-25T00:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([]);

    const service = new ESocialService({ configured: true, query } as never);

    const result = await service.createEvent({
      tipo: 'S-2299',
      referencia: 'funcionario/emp-1',
      competencia: '2026-04',
      dados: { motivo: 'DESLIGAMENTO' },
    });

    expect(result).toEqual({
      id: 'evt-1',
      tipo: 'S-2299',
      referencia: 'funcionario/emp-1',
      competencia: '2026-04',
      status: 'PENDENTE_ENVIO',
      createdAt: '2026-04-25T00:00:00.000Z',
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.report_request'),
      expect.arrayContaining(['def-1', 2026, 4, expect.any(String)]),
    );
  });
});
