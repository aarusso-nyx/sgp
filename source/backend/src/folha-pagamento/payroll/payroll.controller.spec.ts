import { PayrollController } from './payroll.controller';

describe('PayrollController', () => {
  it('delegates payroll calculation', async () => {
    const calculateRun = jest.fn().mockResolvedValue({ id: 'run-1' });
    const appendMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new PayrollController(
      { calculateRun } as never,
      { appendMutation } as never,
    );

    const result = await controller.calculateRun(
      { actor: { username: 'folha-user' } } as never,
      { folha_id: 'run-1' },
      { mode: 'TOTAL' },
    );

    expect(calculateRun).toHaveBeenCalledWith('run-1', { mode: 'TOTAL' });
    expect(result).toEqual({ id: 'run-1' });
  });

  it('delegates payroll mass population', async () => {
    const populateRun = jest.fn().mockResolvedValue({ id: 'run-1' });
    const appendMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new PayrollController(
      { populateRun } as never,
      { appendMutation } as never,
    );

    const result = await controller.populateRun(
      { actor: { username: 'folha-user' } } as never,
      'run-1',
      { replaceCalculatedItems: true },
    );

    expect(populateRun).toHaveBeenCalledWith('run-1', {
      replaceCalculatedItems: true,
    });
    expect(result).toEqual({ id: 'run-1' });
  });

  it('delegates advance payment creation', async () => {
    const createAdvancePayment = jest
      .fn()
      .mockResolvedValue({ paymentId: 'adv-1' });
    const appendMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new PayrollController(
      { createAdvancePayment } as never,
      { appendMutation } as never,
    );

    const result = await controller.createAdvancePayment(
      { actor: { username: 'folha-user' } } as never,
      'run-1',
      { employeeId: 'emp-1', requestedAmount: '500.00' },
    );

    expect(createAdvancePayment).toHaveBeenCalledWith('run-1', {
      employeeId: 'emp-1',
      requestedAmount: '500.00',
    });
    expect(result).toEqual({ paymentId: 'adv-1' });
  });
});
