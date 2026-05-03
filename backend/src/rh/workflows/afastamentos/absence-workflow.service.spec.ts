import { AbsenceWorkflowService } from './absence-workflow.service';

describe('AbsenceWorkflowService', () => {
  const employeeId = '11111111-1111-4111-8111-111111111111';

  function service(overlap = '0') {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('daterange(')) return [{ total: overlap }];
      return [];
    });
    const workflow = new AbsenceWorkflowService({
      databaseService: { query },
      require: (value: unknown, field: string) => {
        if (value === undefined || value === null || value === '') {
          throw new Error(`${field} is required`);
        }
      },
      resolveWorkedDays: jest.fn().mockResolvedValue('20'),
      ensureFunctionalStatus: jest.fn().mockResolvedValue('status-1'),
    } as never);
    return { query, workflow };
  }

  it('defaults frequency worked days through the mutation context', async () => {
    const { query, workflow } = service();

    await workflow.insertFrequency({ year: 2026, month: 4 }, employeeId);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.employee_frequency'),
      expect.arrayContaining([employeeId, 2026, 4, '0', '20']),
    );
  });

  it('rejects overlapping leave periods before writes', async () => {
    const { query, workflow } = service('1');

    await expect(
      workflow.insertLeave({ startsOn: '2026-01-01' }, employeeId),
    ).rejects.toThrow('already has an active leave');
    expect(query).toHaveBeenCalledTimes(1);
  });
});
