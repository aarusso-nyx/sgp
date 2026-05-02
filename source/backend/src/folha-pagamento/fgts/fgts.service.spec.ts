import { FgtsService } from './fgts.service';

describe('FgtsService', () => {
  it('accrues monthly deposits through the idempotent database function', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [
          {
            fgts_account_id: 'account-1',
            fgts_movement_id: 'movement-1',
            employee_id: 'employee-1',
            base_amount: '1000.00',
            amount: '80.00',
          },
        ],
      }),
    };
    const service = new FgtsService({ configured: true } as never);

    await expect(
      service.accrueMonthly('run-1', client as never),
    ).resolves.toEqual([
      {
        accountId: 'account-1',
        movementId: 'movement-1',
        employeeId: 'employee-1',
        baseAmount: '1000.00',
        amount: '80.00',
      },
    ]);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('payment.compute_fgts_monthly'),
      ['run-1'],
    );
  });

  it('computes a termination fine from the account balance function', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [
          {
            fgts_account_id: 'account-1',
            fgts_movement_id: 'movement-2',
            employee_id: 'employee-1',
            base_amount: '12000.00',
            amount: '4800.00',
          },
        ],
      }),
    };
    const service = new FgtsService({ configured: true } as never);

    await expect(
      service.computeTerminationFine(
        'run-1',
        'link-1',
        'WITHOUT_CAUSE',
        client as never,
      ),
    ).resolves.toMatchObject([{ amount: '4800.00' }]);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('payment.compute_fgts_termination_fine'),
      ['run-1', 'link-1', 'WITHOUT_CAUSE'],
    );
  });

  it('rejects operations when DATABASE_URL is unavailable', async () => {
    const service = new FgtsService({ configured: false } as never);

    await expect(service.accrueMonthly('run-1')).rejects.toThrow(
      'DATABASE_URL is required for FGTS operations',
    );
  });
});
