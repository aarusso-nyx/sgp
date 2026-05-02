import { RubricaController } from './rubrica.controller';

describe('RubricaController', () => {
  it('creates rubricas and appends the required audit event', async () => {
    const createRubrica = jest.fn().mockResolvedValue({
      id: 'rubrica-1',
      code: 'VENC',
    });
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new RubricaController(
      { createRubrica } as never,
      { auditMutation } as never,
    );

    const result = await controller.createRubrica(
      { actor: { username: 'folha-user' } } as never,
      {
        code: 'VENC',
        description: 'Vencimento basico',
        type: 'provento',
      },
    );

    expect(createRubrica).toHaveBeenCalledWith({
      code: 'VENC',
      description: 'Vencimento basico',
      type: 'provento',
    });
    expect(auditMutation).toHaveBeenCalledWith(
      expect.anything(),
      'CREATE',
      'folha.rubrica',
      expect.objectContaining({
        metadata: expect.objectContaining({ event: 'folha.rubrica.created' }),
      }),
    );
    expect(result).toEqual({ id: 'rubrica-1', code: 'VENC' });
  });

  it('delegates preview requests and records preview audit metadata', async () => {
    const previewRubrica = jest.fn().mockResolvedValue({
      rubricaId: 'rubrica-1',
      employeeId: 'employee-1',
      competence: '2026-05',
      amount: '1234.56',
      attributes: {},
    });
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new RubricaController(
      { previewRubrica } as never,
      { auditMutation } as never,
    );

    await expect(
      controller.previewRubrica(
        { actor: { username: 'folha-user' } } as never,
        'rubrica-1',
        {
          employeeId: '22222222-2222-4222-8222-222222222222',
          competenceMonth: 5,
          competenceYear: 2026,
        },
      ),
    ).resolves.toMatchObject({ amount: '1234.56' });

    expect(previewRubrica).toHaveBeenCalledWith('rubrica-1', {
      employeeId: '22222222-2222-4222-8222-222222222222',
      competenceMonth: 5,
      competenceYear: 2026,
    });
    expect(auditMutation).toHaveBeenCalledWith(
      expect.anything(),
      'PROCESS',
      'folha.rubrica.preview',
      expect.objectContaining({
        metadata: expect.objectContaining({
          event: 'folha.rubrica.previewed',
          competence: '2026-05',
        }),
      }),
    );
  });
});
