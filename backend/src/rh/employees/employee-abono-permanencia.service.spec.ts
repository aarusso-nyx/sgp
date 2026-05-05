import { EmployeeAbonoPermanenciaService } from './employee-abono-permanencia.service';
import { EmployeeVersionService } from './employee-version.service';
import { TEST_INSTANT_2026_01_02T00_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

describe('EmployeeAbonoPermanenciaService', () => {
  it('returns the permanence allowance state', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: 'emp-1',
        active: true,
        starts_on: '2026-01-01',
        legal_basis: 'EC 103/2019',
        version: 7,
        updated_at: new Date(TEST_INSTANT_2026_01_02T00_00_00_000Z),
      },
    ]);
    const database = { configured: true, query };
    const service = new EmployeeAbonoPermanenciaService(
      database as never,
      new EmployeeVersionService(database as never),
    );

    await expect(service.getAbonoPermanencia('emp-1')).resolves.toMatchObject({
      employeeId: 'emp-1',
      active: true,
      startsOn: '2026-01-01',
      version: 7,
    });
  });

  it('rejects active permanence allowance without a start date', async () => {
    const database = { configured: true };
    const service = new EmployeeAbonoPermanenciaService(
      database as never,
      new EmployeeVersionService(database as never),
    );

    await expect(
      service.updateAbonoPermanencia('emp-1', {
        active: true,
        legalBasis: 'EC 103/2019',
      }),
    ).rejects.toThrow('startsOn is required when abono is active');
  });
});
