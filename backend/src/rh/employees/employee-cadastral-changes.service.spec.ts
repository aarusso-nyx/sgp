import { EmployeeCadastralChangesService } from './employee-cadastral-changes.service';
import { TEST_INSTANT_2026_01_01T00_00_00_000Z } from '../../../../tests/backend/helpers/date-fixtures';

describe('EmployeeCadastralChangesService', () => {
  it('lists cadastral changes using the requested status', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      {
        id: 'change-1',
        employee_id: 'emp-1',
        registration: 'MAT-001',
        employee_name: 'Servidor',
        section: 'contato',
        status: 'PENDING',
        previous_payload: { email: 'old@example.test' },
        requested_payload: { email: 'new@example.test' },
        decision_notes: null,
        requested_by_sub: 'sub-1',
        requested_by_login: 'login-1',
        decided_by_sub: null,
        decided_by_login: null,
        requested_at: new Date(TEST_INSTANT_2026_01_01T00_00_00_000Z),
        decided_at: null,
      },
    ]);
    const service = new EmployeeCadastralChangesService({
      configured: true,
      query,
    } as never);

    const result = await service.listCadastralChanges('pending');

    expect(query).toHaveBeenCalledWith(expect.any(String), ['PENDING']);
    expect(result[0]).toMatchObject({
      id: 'change-1',
      employeeId: 'emp-1',
      requestedPayload: { email: 'new@example.test' },
    });
  });
});
