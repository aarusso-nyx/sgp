import { NotFoundException } from '@nestjs/common';

import { FeriasService } from './ferias.service';

describe('FeriasService', () => {
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

  it('transitions vacation approval rows', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: 'vac-1',
        employee_id: 'employee-2',
        starts_on: '2026-06-01',
        ends_on: '2026-06-15',
        days: 15,
        status: 'aprovado',
        created_at: '2026-05-01T12:00:00.000Z',
        updated_at: '2026-05-02T12:00:00.000Z',
      },
    ]);
    const service = new FeriasService(
      { query } as never,
      meusDadosService as never,
    );

    await expect(service.transitionVacation('vac-1', true)).resolves.toEqual({
      kind: 'vacation',
      id: 'vac-1',
      employeeId: 'employee-2',
      startsOn: '2026-06-01',
      endsOn: '2026-06-15',
      days: 15,
      status: 'aprovado',
      requestedAt: '2026-05-01T12:00:00.000Z',
      updatedAt: '2026-05-02T12:00:00.000Z',
    });
    expect(query).toHaveBeenCalledWith(expect.any(String), [
      'vac-1',
      'aprovado',
    ]);
  });

  it('rejects missing vacation approval rows', async () => {
    const service = new FeriasService(
      { query: jest.fn().mockResolvedValueOnce([]) } as never,
      meusDadosService as never,
    );

    await expect(
      service.transitionVacation('missing', false),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
