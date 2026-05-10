import { TEST_INSTANT_2026_05_01T00_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';
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

  it('uses a database transaction when no client is supplied', async () => {
    const tx = {
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
    const transaction = jest.fn(async (callback) => callback(tx));
    const service = new FgtsService({
      configured: true,
      transaction,
    } as never);

    await expect(service.accrueMonthly('run-1')).resolves.toEqual([
      {
        accountId: 'account-1',
        movementId: 'movement-1',
        employeeId: 'employee-1',
        baseAmount: '1000.00',
        amount: '80.00',
      },
    ]);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('lists account details with normalized date text and empty movement fallback', async () => {
    const service = new FgtsService({
      configured: true,
      query: jest.fn().mockResolvedValueOnce([
        {
          fgts_account_id: 'account-1',
          employee_id: 'employee-1',
          employment_link_id: 'link-1',
          status: 'ACTIVE',
          opened_at: new Date(TEST_INSTANT_2026_05_01T00_00_00_000Z),
          closed_at: null,
          deposit_balance: '80.00',
          rescission_fine_total: '0.00',
          movements: null,
        },
        {
          fgts_account_id: 'account-2',
          employee_id: 'employee-1',
          employment_link_id: 'link-2',
          status: 'CLOSED',
          opened_at: '2025-01-01',
          closed_at: '2025-12-31',
          deposit_balance: '1200.00',
          rescission_fine_total: '480.00',
          movements: [
            {
              id: 'movement-2',
              competence: '2025-12',
              kind: 'MONTHLY',
              baseAmount: '1000.00',
              rate: '0.08',
              amount: '80.00',
              payrollRunId: 'run-2',
              sourceEvent: 'payroll',
              createdAt: '2025-12-31T00:00:00.000Z',
            },
          ],
        },
      ]),
    } as never);

    await expect(service.accountByEmployee('employee-1')).resolves.toEqual([
      {
        accountId: 'account-1',
        employeeId: 'employee-1',
        employmentLinkId: 'link-1',
        status: 'ACTIVE',
        openedAt: '2026-05-01',
        closedAt: null,
        depositBalance: '80.00',
        rescissionFineTotal: '0.00',
        movements: [],
      },
      {
        accountId: 'account-2',
        employeeId: 'employee-1',
        employmentLinkId: 'link-2',
        status: 'CLOSED',
        openedAt: '2025-01-01',
        closedAt: '2025-12-31',
        depositBalance: '1200.00',
        rescissionFineTotal: '480.00',
        movements: [
          {
            id: 'movement-2',
            competence: '2025-12',
            kind: 'MONTHLY',
            baseAmount: '1000.00',
            rate: '0.08',
            amount: '80.00',
            payrollRunId: 'run-2',
            sourceEvent: 'payroll',
            createdAt: '2025-12-31T00:00:00.000Z',
          },
        ],
      },
    ]);
  });
});
