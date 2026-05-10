import { BadRequestException } from '@nestjs/common';

import { MinhaEquipeService } from './minha-equipe.service';

describe('MinhaEquipeService', () => {
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
    branch_id: '00000000-0000-4000-8000-000000000010',
    work_location_id: '00000000-0000-4000-8000-000000000020',
    cost_center_id: '00000000-0000-4000-8000-000000000030',
  };
  const meusDadosService = {
    loadEmployee: jest.fn(),
    toDate: (value: Date | string) =>
      (value instanceof Date
        ? value.toISOString()
        : new Date(value).toISOString()
      ).slice(0, 10),
    toIso: (value: Date | string) =>
      value instanceof Date
        ? value.toISOString()
        : new Date(value).toISOString(),
  };

  beforeEach(() => {
    meusDadosService.loadEmployee.mockReset();
  });

  it('loads the manager approval queue', async () => {
    meusDadosService.loadEmployee.mockResolvedValue(employee);
    const query = jest.fn().mockResolvedValueOnce([
      {
        kind: 'leave',
        id: 'leave-1',
        employee_id: 'employee-2',
        employee_registration: 'MAT-2',
        employee_name: 'Servidor Dois',
        title: 'Licenca premio',
        starts_on: '2026-05-01',
        ends_on: '2026-05-10',
        days: 10,
        status: 'ACTIVE',
        requested_at: '2026-04-20T12:00:00.000Z',
      },
    ]);
    const service = new MinhaEquipeService(
      { query } as never,
      meusDadosService as never,
      {} as never,
      {} as never,
    );

    await expect(service.approvalQueue(actor)).resolves.toMatchObject([
      {
        kind: 'leave',
        id: 'leave-1',
        employeeName: 'Servidor Dois',
        startsOn: '2026-05-01',
      },
    ]);
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      'employee-1',
      '00000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000020',
      '00000000-0000-4000-8000-000000000030',
    ]);
  });

  it('delegates approval transitions to leave and vacation collaborators', async () => {
    meusDadosService.loadEmployee.mockResolvedValue(employee);
    const licencasService = {
      transitionLeave: jest.fn().mockResolvedValue({ kind: 'leave' }),
    };
    const feriasService = {
      transitionVacation: jest.fn().mockResolvedValue({ kind: 'vacation' }),
    };
    const service = new MinhaEquipeService(
      {} as never,
      meusDadosService as never,
      licencasService as never,
      feriasService as never,
    );

    await expect(
      service.transitionApproval(actor, 'leave', 'leave-1', 'approve'),
    ).resolves.toEqual({ kind: 'leave' });
    await expect(
      service.transitionApproval(actor, 'vacation', 'vac-1', 'cancel'),
    ).resolves.toEqual({ kind: 'vacation' });
    await expect(
      service.transitionApproval(actor, 'unknown', 'item-1', 'approve'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(licencasService.transitionLeave).toHaveBeenCalledWith(
      'leave-1',
      true,
    );
    expect(feriasService.transitionVacation).toHaveBeenCalledWith(
      'vac-1',
      false,
    );
  });
});
