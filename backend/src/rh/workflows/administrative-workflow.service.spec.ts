import { AdministrativeWorkflowService } from './administrative-workflow.service';

describe('AdministrativeWorkflowService', () => {
  function service() {
    const query = jest.fn().mockResolvedValue([]);
    const syncEmployeeExercise = jest.fn();
    const workflow = new AdministrativeWorkflowService({
      databaseService: { query },
      require: (value: unknown, field: string) => {
        if (value === undefined || value === null || value === '') {
          throw new Error(`${field} is required`);
        }
      },
      syncEmployeeExercise,
      findEmployeeIdByRecord: jest.fn().mockResolvedValue('employee-1'),
    } as never);
    return { query, syncEmployeeExercise, workflow };
  }

  it('validates organic definition vacancy totals', async () => {
    const { workflow } = service();

    await expect(
      workflow.insertOrganicDefinition({
        name: 'Organico',
        workLocationId: 'work-location-1',
        jobPositionId: 'job-position-1',
        vacanciesTotal: 1,
        vacanciesFilled: 2,
      }),
    ).rejects.toThrow('vacanciesFilled cannot exceed vacanciesTotal');
  });

  it('syncs employee exercise assignments after insert', async () => {
    const { query, syncEmployeeExercise, workflow } = service();

    await workflow.insertExercise(
      {
        startsOn: '2026-01-01',
        toBranchId: 'branch-1',
        toWorkLocationId: 'work-location-1',
        jobFunctionId: 'job-function-1',
      },
      'employee-1',
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.employee_exercise'),
      expect.any(Array),
    );
    expect(syncEmployeeExercise).toHaveBeenCalledWith(
      'employee-1',
      'branch-1',
      'work-location-1',
      'job-function-1',
    );
  });
});
