import { BancoTalentosController } from './banco-talentos.controller';

describe('BancoTalentosController', () => {
  const request = { actor: { username: 'rh-user' } } as never;
  const candidate = { id: 'candidate-1', status: 'ACTIVE' };

  const createController = () => {
    const service = {
      list: jest.fn().mockResolvedValue({ items: [] }),
      findById: jest.fn().mockResolvedValue(candidate),
      create: jest.fn().mockResolvedValue(candidate),
      update: jest.fn().mockResolvedValue(candidate),
      archive: jest
        .fn()
        .mockResolvedValue({ ...candidate, status: 'ARCHIVED' }),
    };
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new BancoTalentosController(
      service as never,
      {
        auditMutation,
      } as never,
    );
    return { controller, service, auditMutation };
  };

  it('delegates read handlers to the service', async () => {
    const { controller, service } = createController();

    await expect(controller.list({ search: 'ana' })).resolves.toEqual({
      items: [],
    });
    await expect(controller.findById('candidate-1')).resolves.toEqual(
      candidate,
    );

    expect(service.list).toHaveBeenCalledWith({ search: 'ana' });
    expect(service.findById).toHaveBeenCalledWith('candidate-1');
  });

  it('audits create, update, and archive mutations', async () => {
    const { controller, service, auditMutation } = createController();

    await expect(
      controller.create(request, {
        cpf: '12345678901',
        fullName: 'Ana Silva',
        birthDate: '1990-01-15',
        email: 'ana@example.com',
        phone: '+5511999999999',
        lgpdConsentAt: '2026-05-03T10:00:00.000Z',
        lgpdConsentVersion: 'v1',
      }),
    ).resolves.toEqual(candidate);
    await expect(
      controller.update(request, 'candidate-1', { profileSummary: 'Revisado' }),
    ).resolves.toEqual(candidate);
    await expect(controller.archive(request, 'candidate-1')).resolves.toEqual({
      ...candidate,
      status: 'ARCHIVED',
    });

    expect(service.create).toHaveBeenCalled();
    expect(service.update).toHaveBeenCalledWith('candidate-1', {
      profileSummary: 'Revisado',
    });
    expect(service.archive).toHaveBeenCalledWith('candidate-1');
    expect(auditMutation).toHaveBeenCalledWith(
      request,
      'CREATE',
      'recrutamento.candidato',
      expect.objectContaining({ tableName: 'recrutamento.candidato' }),
    );
    expect(auditMutation).toHaveBeenCalledWith(
      request,
      'UPDATE',
      'recrutamento.candidato',
      expect.objectContaining({ resourceId: 'candidate-1' }),
    );
    expect(auditMutation).toHaveBeenCalledWith(
      request,
      'DELETE',
      'recrutamento.candidato',
      expect.objectContaining({ resourceId: 'candidate-1' }),
    );
  });
});
