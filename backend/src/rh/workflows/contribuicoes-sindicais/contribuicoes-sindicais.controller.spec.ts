import { PATH_METADATA } from '@nestjs/common/constants';

import { UnionContributionsWorkflowController } from './contribuicoes-sindicais.controller';

describe('UnionContributionsWorkflowController', () => {
  const request = { actor: { username: 'rh-user' } } as never;
  const body = { startsOn: '2026-04-25' };

  const createController = () => {
    const workflows = {
      listWorkflow: jest.fn().mockResolvedValue([]),
      createWorkflowRecord: jest.fn().mockResolvedValue({ id: 'union-1' }),
      updateWorkflowRecord: jest.fn().mockResolvedValue({ id: 'union-2' }),
      deleteWorkflowRecord: jest
        .fn()
        .mockResolvedValue({ id: 'union-3', deleted: true }),
    };
    const audit = { auditMutation: jest.fn().mockResolvedValue(undefined) };

    return {
      audit,
      controller: new UnionContributionsWorkflowController(
        workflows as never,
        audit as never,
      ),
      workflows,
    };
  };

  it('keeps the employee workflow route path stable', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, UnionContributionsWorkflowController),
    ).toBe('v1/employees/:employeeId/rh-workflows');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        UnionContributionsWorkflowController.prototype.listUnionContributions,
      ),
    ).toBe('contribuicoes-sindicais');
  });

  it('delegates union contribution workflow handlers and audits mutations', async () => {
    const { audit, controller, workflows } = createController();

    await controller.listUnionContributions('emp-1', { page: 1 });
    await controller.createUnionContribution(request, 'emp-1', body);
    await controller.updateUnionContribution(request, 'union-2', body);
    await controller.deleteUnionContribution(request, 'union-3');

    expect(workflows.listWorkflow).toHaveBeenCalledWith(
      'union-contributions',
      { page: 1 },
      'emp-1',
    );
    expect(workflows.createWorkflowRecord).toHaveBeenCalledWith(
      'union-contributions',
      body,
      'emp-1',
    );
    expect(workflows.updateWorkflowRecord).toHaveBeenCalledWith(
      'union-contributions',
      'union-2',
      body,
    );
    expect(workflows.deleteWorkflowRecord).toHaveBeenCalledWith(
      'union-contributions',
      'union-3',
    );
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'DELETE',
      'employee_union_contribution',
      expect.objectContaining({ resourceId: 'union-3' }),
    );
  });
});
