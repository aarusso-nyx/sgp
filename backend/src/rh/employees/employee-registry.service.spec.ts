import { EmployeeRegistryService } from './employee-registry.service';
import { EmployeeVersionService } from './employee-version.service';

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
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-02T00:00:00.000Z'),
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
