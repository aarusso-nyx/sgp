import { UnionWorkflowService } from './union-workflow.service';

describe('UnionWorkflowService', () => {
  it('syncs the employee union after contribution creation', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const syncEmployeeUnion = jest.fn();
    const workflow = new UnionWorkflowService({
      databaseService: { query },
      require: (value: unknown, field: string) => {
        if (!value) throw new Error(`${field} is required`);
      },
      syncEmployeeUnion,
    } as never);

    await workflow.insert(
      { unionId: 'union-1', startsOn: '2026-01-01' },
      'employee-1',
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.employee_union_contribution'),
      ['employee-1', 'union-1', '', '', '2026-01-01', '', ''],
    );
    expect(syncEmployeeUnion).toHaveBeenCalledWith('employee-1', 'union-1');
  });
});
