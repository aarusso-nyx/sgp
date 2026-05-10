import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { MeusDadosService } from './meus-dados.service';

describe('MeusDadosService', () => {
  const actor = {
    sub: 'sub-1',
    username: 'portal.user',
    tenantId: '00000000-0000-0000-0000-000000000100',
    groups: [],
    permissions: [],
    claims: { cpf: '00011122233', email: 'portal@example.test' },
  };
  const employee = {
    id: 'employee-1',
    registration: 'MAT-1',
    name: 'Servidor Teste',
    social_name: 'Servidor Social',
    cpf: '00011122233',
    birth_date: new Date('1990-01-02T00:00:00.000Z'),
    email: 'portal@example.test',
    phone: '11999999999',
    branch_id: '00000000-0000-4000-8000-000000000010',
    work_location_id: '00000000-0000-4000-8000-000000000020',
    cost_center_id: '00000000-0000-4000-8000-000000000030',
    pis_pasep: '123',
    rg: 'MG-1',
    rg_issuer: 'SSP',
    mother_name: 'Mae',
    father_name: 'Pai',
    address: { street: 'Rua A' },
  };

  it('maps personal, contact, dependents, and job data', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([
        {
          id: 'dep-1',
          name: 'Dependente',
          cpf: null,
          birth_date: '2020-01-01',
          relationship: 'CHILD',
          income_tax_dependent: true,
          active: true,
        },
      ])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([
        {
          job_position_code: 'ANL',
          job_position_name: 'Analista',
          class_number: 1,
          level_number: 2,
          base_salary: '5000.00',
        },
      ]);
    const service = new MeusDadosService(
      { configured: true, query } as never,
      {} as never,
      {} as never,
    );

    await expect(service.getPersonalData(actor)).resolves.toMatchObject({
      id: 'employee-1',
      socialName: 'Servidor Social',
      birthDate: '1990-01-02',
    });
    await expect(service.getAddress(actor)).resolves.toEqual({
      street: 'Rua A',
    });
    await expect(service.getContact(actor)).resolves.toEqual({
      email: 'portal@example.test',
      phone: '11999999999',
    });
    await expect(service.getDependents(actor)).resolves.toMatchObject([
      { id: 'dep-1', birthDate: '2020-01-01', incomeTaxDependent: true },
    ]);
    await expect(service.getMyJob(actor)).resolves.toEqual({
      cargo: 'Analista',
      codigoCargo: 'ANL',
      classe: 1,
      nivel: 2,
      vencimentoBasico: '5000.00',
    });
  });

  it('maps career and change request flows', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([{ motivo: 'Progressao' }])
      .mockResolvedValueOnce([employee])
      .mockResolvedValueOnce([{ id: 'change-1' }]);
    const service = new MeusDadosService(
      { configured: true, query } as never,
      { trailForActor: jest.fn().mockResolvedValue({ trail: 'ok' }) } as never,
      {
        checkInterstice: jest.fn().mockRejectedValue(new Error('not eligible')),
      } as never,
    );

    await expect(service.getMyCareer(actor)).resolves.toEqual({
      trail: 'ok',
      salaryHistory: [{ motivo: 'Progressao' }],
      nextProgression: null,
    });
    await expect(
      service.requestProfileChange(actor, 'contato', { phone: '11000000000' }),
    ).resolves.toMatchObject({
      id: 'change-1',
      previousPayload: { email: 'portal@example.test', phone: '11999999999' },
    });
  });

  it('rejects missing employees and unavailable database access', async () => {
    const service = new MeusDadosService(
      { configured: true, query: jest.fn().mockResolvedValueOnce([]) } as never,
      {} as never,
      {} as never,
    );

    await expect(service.getPersonalData(actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const unavailable = new MeusDadosService(
      { configured: false } as never,
      {} as never,
      {} as never,
    );
    await expect(unavailable.getPersonalData(actor)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
