import { BadRequestException } from '@nestjs/common';

import { TransparencyQueryService } from './transparency-query.service';

describe('TransparencyQueryService', () => {
  it('applies the hard pagination ceiling', async () => {
    const service = new TransparencyQueryService({
      configured: true,
      query: jest.fn(),
    } as never);

    await expect(
      service.list('00000000-0000-4000-8000-000000000001', {
        page: 51,
        pageSize: 20,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns only the public snapshot columns', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([
        {
          tenant_id: 'tenant-1',
          competence: '2026-04-01',
          employee_public_id: 'pub-1',
          full_name: 'Ana Silva',
          registration_number: 'MAT-1',
          position_name: 'Analista',
          organizational_unit: 'Administracao',
          gross_total: '1000.00',
          deductions_total: '100.00',
          net_total: '900.00',
          snapshot_taken_at: '2026-05-02 00:00:00+00',
          cpf: '00000000000',
          bank_account: '123',
        },
      ]);
    const service = new TransparencyQueryService({
      configured: true,
      query,
    } as never);

    const result = await service.list(
      '00000000-0000-4000-8000-000000000001',
      {},
    );

    expect(result.items[0]).toEqual({
      tenantId: 'tenant-1',
      competence: '2026-04-01',
      employeePublicId: 'pub-1',
      fullName: 'Ana Silva',
      registrationNumber: 'MAT-1',
      positionName: 'Analista',
      organizationalUnit: 'Administracao',
      grossTotal: '1000.00',
      deductionsTotal: '100.00',
      netTotal: '900.00',
      snapshotTakenAt: '2026-05-02 00:00:00+00',
    });
  });
});
