import { VacationController } from './vacation.controller';

describe('VacationController', () => {
  it('routes balance, schedule, approval, and cancellation to the service', async () => {
    const service = {
      getBalance: jest.fn().mockResolvedValue([]),
      schedule: jest.fn().mockResolvedValue([{ id: 'vac-1' }]),
      approve: jest.fn().mockResolvedValue({ id: 'vac-1', status: 'aprovado' }),
      cancel: jest.fn().mockResolvedValue({ id: 'vac-1', status: 'cancelado' }),
    };
    const controller = new VacationController(service as never);

    await expect(controller.balance('emp-1')).resolves.toEqual([]);
    await expect(
      controller.schedule({
        employeeId: 'emp-1',
        accrualPeriodStart: '2025-01-01',
        accrualPeriodEnd: '2025-12-31',
        installments: [{ startsOn: '2026-01-01', endsOn: '2026-01-30' }],
      }),
    ).resolves.toEqual([{ id: 'vac-1' }]);
    await expect(controller.approve('vac-1')).resolves.toMatchObject({
      status: 'aprovado',
    });
    await expect(controller.cancel('vac-1')).resolves.toMatchObject({
      status: 'cancelado',
    });
  });
});
