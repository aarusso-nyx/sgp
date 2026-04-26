import { SystemParametersService } from './system-parameters.service';

describe('SystemParametersService', () => {
  it('persists global parameter updates from the canonical value field', async () => {
    const query = jest.fn();
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        key: 'global:salario_minimo',
        value: '1518.00',
        description: 'Global parameter salario_minimo',
        updated_at: '2026-04-25T12:00:00.000Z',
      },
    ]);
    const service = new SystemParametersService({
      configured: true,
      query,
    } as never);

    await expect(
      service.upsertGlobalParameter('salario_minimo', { value: '1518.00' }),
    ).resolves.toEqual({
      values: {
        salario_minimo: '1518.00',
      },
      updatedAt: '2026-04-25T12:00:00.000Z',
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO public.system_parameter'),
      [
        'global:salario_minimo',
        JSON.stringify('1518.00'),
        'Global parameter salario_minimo',
        'global',
      ],
    );
  });

  it('lists and updates system/global parameters and feature flags', async () => {
    const systemRows = [
      {
        key: 'system:timezone',
        value: 'America/Sao_Paulo',
        description: 'Timezone',
        updated_at: '2026-04-24T12:00:00.000Z',
      },
      {
        key: 'system:language',
        value: 'pt-BR',
        description: 'Language',
        updated_at: new Date('2026-04-25T12:00:00.000Z'),
      },
    ];
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("WHERE key LIKE 'system:%'")) return systemRows;
      if (sql.includes("WHERE key LIKE 'global:%'")) {
        return [
          {
            key: 'global:x',
            value: null,
            description: '',
            updated_at: '2026-04-25T12:00:00.000Z',
          },
        ];
      }
      if (sql.includes('WHERE key = $1')) {
        return [
          {
            key: 'feature-flag:new-ui',
            value: { active: true, owner: 'qa' },
            description: '',
            updated_at: undefined,
          },
        ];
      }
      return [];
    });
    query
      .mockResolvedValueOnce(systemRows)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(systemRows)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          key: 'global:x',
          value: null,
          description: '',
          updated_at: '2026-04-25T12:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          key: 'feature-flag:new-ui',
          value: { active: true, owner: 'qa' },
          description: '',
          updated_at: undefined,
        },
      ]);
    const service = new SystemParametersService({
      configured: true,
      query,
    } as never);

    await expect(service.listSystemParameters()).resolves.toEqual({
      values: {
        timezone: 'America/Sao_Paulo',
        language: 'pt-BR',
      },
      updatedAt: '2026-04-25T12:00:00.000Z',
    });
    await expect(
      service.upsertSystemParameters({
        values: { timezone: 'America/Sao_Paulo', language: 'pt-BR' },
      }),
    ).resolves.toHaveProperty('values.timezone', 'America/Sao_Paulo');
    await expect(
      service.upsertGlobalParameter('nullable', {}),
    ).resolves.toHaveProperty('values.x', null);
    await expect(
      service.toggleFeatureFlag('new-ui', {
        ativo: true,
        metadata: { owner: 'qa' },
      }),
    ).resolves.toMatchObject({
      chave: 'new-ui',
      ativo: true,
      value: { active: true, owner: 'qa' },
    });
  });

  it('requires a configured database', async () => {
    const service = new SystemParametersService({ configured: false } as never);

    await expect(service.listSystemParameters()).rejects.toThrow(
      'DATABASE_URL is required',
    );
  });
});
