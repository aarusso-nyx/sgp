import { ServiceUnavailableException } from '@nestjs/common';

import { PublicTransparencyService } from './public-transparency.service';

describe('PublicTransparencyService', () => {
  it('returns public payroll transparency rows', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([
        {
          id: 'run-1',
          competence_year: 2026,
          competence_month: 4,
          branch_code: null,
          payroll_type: 'MENSAL',
          employee_count: 10,
          total_earnings: '1000.00',
          total_deductions: '150.00',
          total_net: '850.00',
        },
      ]);
    const service = new PublicTransparencyService({
      configured: true,
      query,
    } as never);

    const result = await service.payrollTransparency('tenant-a', {
      page: 2,
      pageSize: 5,
    });

    expect(result).toMatchObject({
      page: 2,
      pageSize: 5,
      total: 1,
      totalPages: 1,
    });
    expect(result.items[0]).toMatchObject({
      tenant: 'tenant-a',
      id: 'run-1',
      branchCode: null,
      payrollType: 'MENSAL',
    });
    expect(query).toHaveBeenNthCalledWith(2, expect.any(String), [
      'tenant-a',
      5,
      5,
    ]);
  });

  it('returns empty transparency pages with default pagination', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const service = new PublicTransparencyService({
      configured: true,
      query,
    } as never);

    await expect(
      service.payrollTransparency('tenant-a', {}),
    ).resolves.toMatchObject({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('requires a configured database', async () => {
    const service = new PublicTransparencyService({
      configured: false,
    } as never);

    await expect(
      service.payrollTransparency('tenant-a', {}),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
