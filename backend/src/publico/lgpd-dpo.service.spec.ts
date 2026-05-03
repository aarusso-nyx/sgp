import { LgpdDpoService, LGPD_DPO_PARAMETER_KEY } from './lgpd-dpo.service';

describe('LgpdDpoService', () => {
  it('returns configured DPO contact from system parameters', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        value: {
          name: 'Maria Encarregada',
          email: 'dpo@ente.gov.br',
          phone: '(11) 4000-0000',
          channelUrl: 'https://ente.gov.br/lgpd',
          officeHours: 'Segunda a sexta, 8h as 17h',
          postalAddress: 'Praca Central, 1',
        },
        updated_at: '2026-05-02T10:00:00.000Z',
      },
    ]);
    const service = new LgpdDpoService({
      configured: true,
      query,
    } as never);

    await expect(
      service.getPublicContact('00000000-0000-0000-0000-000000000100'),
    ).resolves.toEqual({
      name: 'Maria Encarregada',
      contact: {
        email: 'dpo@ente.gov.br',
        phone: '(11) 4000-0000',
        channelUrl: 'https://ente.gov.br/lgpd',
        officeHours: 'Segunda a sexta, 8h as 17h',
        postalAddress: 'Praca Central, 1',
      },
      updatedAt: '2026-05-02T10:00:00.000Z',
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id = $2::uuid'),
      [LGPD_DPO_PARAMETER_KEY, '00000000-0000-0000-0000-000000000100'],
    );
  });

  it('uses explicit public defaults when the row is not configured', async () => {
    const service = new LgpdDpoService({
      configured: true,
      query: jest.fn().mockResolvedValueOnce([]),
    } as never);

    await expect(service.getPublicContact()).resolves.toMatchObject({
      name: 'Encarregado pelo Tratamento de Dados Pessoais',
      contact: {
        email: 'dpo@example.invalid',
        channelUrl: '/lgpd/encarregado',
      },
      updatedAt: null,
    });
  });

  it('does not require database configuration for portal rendering', async () => {
    const service = new LgpdDpoService({ configured: false } as never);

    await expect(service.getPublicContact()).resolves.toHaveProperty(
      'contact.email',
      'dpo@example.invalid',
    );
  });
});
