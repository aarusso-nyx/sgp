import { ESocialService } from './esocial.service';
import { RequestContextStore } from '../../common/request-context/request-context.store';

describe('ESocialService', () => {
  it('creates an event and queues a worker request', async () => {
    const query = jest.fn();
    query.mockResolvedValueOnce([{ id: 'def-1' }]).mockResolvedValueOnce([]);

    const emit = {
      emit: jest.fn(async () => ({
        id: 'evt-1',
        eventKind: 'S-2299',
        reference: 'funcionario/emp-1',
        competence: '2026-04',
        status: 'PENDENTE',
        createdAt: '2026-04-25T00:00:00.000Z',
      })),
    };
    const service = new ESocialService(
      { configured: true, query } as never,
      emit as never,
    );

    const result = await RequestContextStore.run(
      {
        tenantId: '00000000-0000-0000-0000-000000000100',
      },
      () =>
        service.createEvent({
          tipo: 'S-2299',
          referencia: 'funcionario/emp-1',
          competencia: '2026-04',
          dados: { xml: '<eSocial />' },
        }),
    );

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
    expect(emit.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: '00000000-0000-0000-0000-000000000100',
        eventKind: 'S-2299',
        xml: '<eSocial />',
      }),
    );
  });
});
