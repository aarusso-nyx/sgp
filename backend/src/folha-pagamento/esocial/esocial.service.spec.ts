import { ESocialService } from './esocial.service';
import { RequestContextStore } from '../../common/request-context/request-context.store';

describe('ESocialService', () => {
  it('creates an event and queues a worker request', async () => {
    const stynx = {
      enqueue: jest.fn(async () => ({
        messageId: 'evt-1',
        eventClass: 'S-2299',
        sourceRef: {
          reference: 'funcionario/emp-1',
          competence: '2026-04',
        },
        status: 'PENDING',
        createdAt: '2026-04-25T00:00:00.000Z',
      })),
    };
    const service = new ESocialService(stynx as never);

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
    expect(stynx.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: '00000000-0000-0000-0000-000000000100',
        kind: 'submit',
        eventClass: 'S-2299',
      }),
    );
  });
});
