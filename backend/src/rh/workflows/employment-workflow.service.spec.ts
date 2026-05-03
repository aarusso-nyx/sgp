import { EmploymentWorkflowService } from './employment-workflow.service';

describe('EmploymentWorkflowService', () => {
  function service() {
    const query = jest.fn().mockResolvedValue([]);
    const workflow = new EmploymentWorkflowService({
      databaseService: { query },
      require: (value: unknown, field: string) => {
        if (!value) throw new Error(`${field} is required`);
      },
    } as never);
    return { query, workflow };
  }

  it('inserts professional experience records', async () => {
    const { query, workflow } = service();

    await workflow.insertProfessionalExperience(
      { employer: 'Empresa', roleTitle: 'Analista' },
      'employee-1',
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO hr.professional_experience'),
      ['employee-1', 'Empresa', 'Analista', '', '', ''],
    );
  });

  it('updates transfers through the same employee-transfer table', async () => {
    const { query, workflow } = service();

    await workflow.updateTransfer('transfer-1', {
      fromBranchId: 'branch-1',
      toBranchId: 'branch-2',
      effectiveOn: '2026-01-01',
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE hr.employee_transfer'),
      ['transfer-1', 'branch-1', 'branch-2', '', '', '2026-01-01', ''],
    );
  });
});
