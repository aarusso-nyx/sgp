import { EmployeeRegistryService } from './employee-registry.service';
import { EmployeeVersionService } from './employee-version.service';
import {
  TEST_INSTANT_2026_01_01T00_00_00_000Z,
  TEST_INSTANT_2026_01_02T00_00_00_000Z,
} from '../../../../tests/backend/helpers/date-fixtures';

describe('EmployeeRegistryService', () => {
  it('lists paged employees through the registry surface', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([
        {
          id: 'emp-1',
          registration: 'MAT-001',
          name: 'Servidor',
          cpf: null,
          email: null,
          lifecycle_status: 'ACTIVE',
          functional_status: 'Ativo',
          branch_name: 'Matriz',
          active: true,
          created_at: new Date(TEST_INSTANT_2026_01_01T00_00_00_000Z),
          updated_at: new Date(TEST_INSTANT_2026_01_02T00_00_00_000Z),
        },
      ]);
    const database = { configured: true, query };
    const service = new EmployeeRegistryService(
      database as never,
      new EmployeeVersionService(database as never),
    );

    const result = await service.list({ page: 1, pageSize: 20 });

    expect(result).toMatchObject({
      total: 1,
      items: [{ id: 'emp-1', registration: 'MAT-001' }],
    });
  });
});
