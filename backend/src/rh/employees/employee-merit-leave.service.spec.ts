import { BadRequestException, NotFoundException } from '@nestjs/common';

import { EmployeeMeritLeaveService } from './employee-merit-leave.service';

const employeeId = '00000000-0000-4000-8000-000000000051';
const tenantId = '00000000-0000-0000-0000-000000000100';

function database(row?: Record<string, unknown>) {
  return {
    configured: true,
    query: jest.fn().mockResolvedValue(
      row === undefined
        ? []
        : [
            {
              employee_id: employeeId,
              tenant_id: tenantId,
              ...row,
            },
          ],
    ),
  };
}

describe('EmployeeMeritLeaveService', () => {
  it('computes statutory merit leave entitlement after five-year cycles', async () => {
    const db = database({
      credited_service_days: 3_650,
      consumed_days: 30,
    });
    const service = new EmployeeMeritLeaveService(db as never);

    await expect(
      service.balance(employeeId, '2026-05-04'),
    ).resolves.toMatchObject({
      employeeId,
      tenantId,
      thresholdDays: 1_825,
      entitlementDaysPerCycle: 90,
      creditedServiceDays: 3_650,
      completedCycles: 2,
      accruedDays: 180,
      consumedDays: 30,
      availableDays: 150,
      eligible: true,
      nextEligibilityDaysRemaining: 0,
    });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('hr.service_time_record'),
      [employeeId, '2026-05-04'],
    );
  });

  it('reports remaining service days before the first entitlement cycle', async () => {
    const service = new EmployeeMeritLeaveService(
      database({
        credited_service_days: 1_000,
        consumed_days: 0,
      }) as never,
    );

    await expect(
      service.balance(employeeId, '2026-05-04'),
    ).resolves.toMatchObject({
      completedCycles: 0,
      accruedDays: 0,
      availableDays: 0,
      eligible: false,
      nextEligibilityDaysRemaining: 825,
    });
  });

  it('rejects invalid balance dates', async () => {
    const service = new EmployeeMeritLeaveService(database({}) as never);

    await expect(service.balance(employeeId, '04/05/2026')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('requires an active current-tenant employee', async () => {
    const service = new EmployeeMeritLeaveService(database() as never);

    await expect(service.balance(employeeId, '2026-05-04')).rejects.toThrow(
      NotFoundException,
    );
  });
});
