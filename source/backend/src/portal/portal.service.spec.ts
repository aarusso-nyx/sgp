import { ServiceUnavailableException } from '@nestjs/common';

import { PortalService } from './portal.service';

describe('PortalService', () => {
  const actor = {
    sub: 'sub-1',
    username: 'portal.user',
    tenantId: '00000000-0000-0000-0000-000000000100',
    groups: [],
    permissions: [],
  };

  it('returns current session and Gov.br status', () => {
    const service = new PortalService({ configured: false } as never);

    expect(service.currentSession(undefined)).toEqual({
      actor: undefined,
      authenticated: false,
    });
    expect(service.currentSession(actor).authenticated).toBe(true);
    expect(service.govBrStatus()).toMatchObject({
      provider: 'govbr',
      status: 'available',
    });
  });

  it('maps payroll summary rows with paging defaults and search', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '3' }])
      .mockResolvedValueOnce([
        {
          id: 'run-1',
          competence_year: 2026,
          competence_month: 4,
          status: 'OPEN',
          branch_code: '001',
          branch_name: 'Matriz',
          payroll_type_code: 'MENSAL',
          processing_type_code: 'NORMAL',
          employee_count: 12,
          total_earnings: '1000.00',
          total_deductions: '100.00',
          total_net: '900.00',
          created_at: new Date('2026-04-01T10:00:00.000Z'),
          closed_at: '2026-04-30T20:00:00.000Z',
        },
      ]);
    const service = new PortalService({ configured: true, query } as never);

    const result = await service.payrollSummary({
      page: 2,
      pageSize: 2,
      search: 'Matriz',
    });

    expect(result).toMatchObject({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });
    expect(result.items[0]).toMatchObject({
      id: 'run-1',
      competenceYear: 2026,
      branchCode: '001',
      closedAt: '2026-04-30T20:00:00.000Z',
    });
    expect(query).toHaveBeenNthCalledWith(1, expect.any(String), ['%matriz%']);
    expect(query).toHaveBeenNthCalledWith(2, expect.any(String), [
      '%matriz%',
      2,
      2,
    ]);
  });

  it('returns an empty page when no payroll summary rows exist', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const service = new PortalService({ configured: true, query } as never);

    await expect(service.payrollSummary({})).resolves.toMatchObject({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('requires a configured database for portal payroll operations', async () => {
    const service = new PortalService({ configured: false } as never);

    await expect(service.payrollSummary({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
