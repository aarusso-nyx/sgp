import { EmployeeLifecycleService } from './employee-lifecycle.service';
import { TEST_INSTANT_2026_01_01T00_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

describe('EmployeeLifecycleService', () => {
  it('admits an employee and returns the created contract id', async () => {
    const query = jest.fn().mockResolvedValueOnce({
      rows: [
        {
          id: 'emp-1',
          registration: 'MAT-001',
          name: 'Servidor',
          cpf: null,
          email: null,
          lifecycle_status: 'ACTIVE',
          functional_status: 'Em exercicio',
          branch_name: null,
          active: true,
          created_at: new Date(TEST_INSTANT_2026_01_01T00_00_00_000Z),
          updated_at: new Date(TEST_INSTANT_2026_01_01T00_00_00_000Z),
          contract_id: 'contract-1',
        },
      ],
    });
    const database = {
      configured: true,
      transaction: (
        callback: (client: { query: jest.Mock }) => Promise<unknown>,
      ) => callback({ query }),
    };
    const referenceData = {
      ensureFunctionalStatus: jest.fn().mockResolvedValue('status-1'),
      ensureEmploymentLink: jest.fn().mockResolvedValue('link-1'),
      ensureContractType: jest.fn().mockResolvedValue('type-1'),
    };
    const service = new EmployeeLifecycleService(
      database as never,
      referenceData as never,
    );

    await expect(
      service.admit({
        registration: ' MAT-001 ',
        name: ' Servidor ',
        hiredOn: '2026-01-01',
      }),
    ).resolves.toMatchObject({
      employeeId: 'emp-1',
      employmentContractId: 'contract-1',
    });
  });
});
