import { LGPD_DPO_PARAMETER_KEY } from '../publico/lgpd-dpo.service';
import { LgpdDpoAdminService } from './dpo.service';

const tenantId = '00000000-0000-0000-0000-000000000100';
const updatedAt = '2026-05-03T12:00:00.000Z';

describe('LgpdDpoAdminService', () => {
  it('reads the tenant DPO designation from system parameters', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      parameterRow({
        name: 'Maria Encarregada',
        email: 'dpo@ente.gov.br',
        status: 'ACTIVE',
        designationAct: 'Portaria 123/2026',
        designatedAt: '2026-05-01',
      }),
    ]);
    const service = new LgpdDpoAdminService({
      configured: true,
      query,
    } as never);

    await expect(service.getDesignation()).resolves.toMatchObject({
      key: LGPD_DPO_PARAMETER_KEY,
      tenantId,
      name: 'Maria Encarregada',
      contact: { email: 'dpo@ente.gov.br' },
      lifecycle: {
        status: 'ACTIVE',
        designationAct: 'Portaria 123/2026',
        designatedAt: '2026-05-01',
      },
      updatedAt,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE key = $1'),
      [LGPD_DPO_PARAMETER_KEY],
    );
  });

  it('creates a normalized active designation', async () => {
    const query = jest
      .fn()
      .mockImplementation(async (sql: string, values: readonly unknown[]) => {
        if (sql.includes('INSERT INTO public.system_parameter')) {
          return [parameterRow(parseParameterValue(values))];
        }
        return [];
      });
    const service = new LgpdDpoAdminService({
      configured: true,
      query,
    } as never);

    await expect(
      service.createDesignation({
        name: 'Maria Encarregada',
        email: 'dpo@ente.gov.br',
        designationAct: 'Portaria 123/2026',
        designatedAt: '2026-05-01',
      }),
    ).resolves.toMatchObject({
      name: 'Maria Encarregada',
      contact: {
        email: 'dpo@ente.gov.br',
        channelUrl: '/lgpd/encarregado',
      },
      lifecycle: {
        status: 'ACTIVE',
        designationAct: 'Portaria 123/2026',
      },
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (tenant_id, key) DO UPDATE'),
      expect.arrayContaining([LGPD_DPO_PARAMETER_KEY]),
    );
  });

  it('patches the existing designation without losing public contact fields', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        parameterRow({
          name: 'Maria Encarregada',
          email: 'dpo@ente.gov.br',
          phone: '(11) 4000-0000',
          channelUrl: 'https://ente.gov.br/lgpd',
          officeHours: 'Segunda a sexta, 8h as 17h',
          postalAddress: 'Praca Central, 1',
          status: 'ACTIVE',
        }),
      ])
      .mockImplementationOnce(
        async (_sql: string, values: readonly unknown[]) => [
          parameterRow(parseParameterValue(values)),
        ],
      );
    const service = new LgpdDpoAdminService({
      configured: true,
      query,
    } as never);

    await expect(
      service.updateDesignation({ notes: 'Revisao anual concluida.' }),
    ).resolves.toMatchObject({
      contact: {
        email: 'dpo@ente.gov.br',
        phone: '(11) 4000-0000',
      },
      lifecycle: {
        status: 'ACTIVE',
        notes: 'Revisao anual concluida.',
      },
    });
  });
});

function parameterRow(value: Record<string, unknown>) {
  return {
    id: '00000000-0000-4000-8000-000000000501',
    tenant_id: tenantId,
    key: LGPD_DPO_PARAMETER_KEY,
    value,
    updated_at: updatedAt,
  };
}

function parseParameterValue(
  values: readonly unknown[],
): Record<string, unknown> {
  return JSON.parse(String(values[1])) as Record<string, unknown>;
}
