import { NotFoundException } from '@nestjs/common';

import { LicencasService } from './licencas.service';

describe('LicencasService', () => {
  const meusDadosService = {
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

  it('transitions leave approval rows', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: 'leave-1',
        employee_id: 'employee-2',
        starts_on: '2026-05-01',
        ends_on: '2026-05-10',
        days: 10,
        status: 'ACTIVE',
        requested_at: '2026-04-20T12:00:00.000Z',
        approved_at: '2026-04-21T12:00:00.000Z',
        approved_by: 'portal.user',
      },
    ]);
    const service = new LicencasService(
      { query } as never,
      meusDadosService as never,
    );

    await expect(service.transitionLeave('leave-1', true)).resolves.toEqual({
      kind: 'leave',
      id: 'leave-1',
      employeeId: 'employee-2',
      startsOn: '2026-05-01',
      endsOn: '2026-05-10',
      days: 10,
      status: 'ACTIVE',
      requestedAt: '2026-04-20T12:00:00.000Z',
      approvedAt: '2026-04-21T12:00:00.000Z',
      approvedBy: 'portal.user',
    });
    expect(query).toHaveBeenCalledWith(expect.any(String), ['leave-1', true]);
  });

  it('rejects missing leave approval rows', async () => {
    const service = new LicencasService(
      { query: jest.fn().mockResolvedValueOnce([]) } as never,
      meusDadosService as never,
    );

    await expect(
      service.transitionLeave('missing', false),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
