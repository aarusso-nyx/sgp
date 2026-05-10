import { PATH_METADATA } from '@nestjs/common/constants';

import { BenefitDependentsWorkflowController } from './dependentes-beneficio.controller';

describe('BenefitDependentsWorkflowController', () => {
  const request = { actor: { username: 'rh-user' } } as never;
  const body = { startsOn: '2026-04-25' };

  const createController = () => {
    const workflows = {
      listWorkflow: jest.fn().mockResolvedValue([]),
      createWorkflowRecord: jest.fn().mockResolvedValue({ id: 'dep-1' }),
      updateWorkflowRecord: jest.fn().mockResolvedValue({ id: 'dep-2' }),
      deleteWorkflowRecord: jest
        .fn()
        .mockResolvedValue({ id: 'dep-3', deleted: true }),
    };
    const audit = { auditMutation: jest.fn().mockResolvedValue(undefined) };

    return {
      audit,
      controller: new BenefitDependentsWorkflowController(
        workflows as never,
        audit as never,
      ),
      workflows,
    };
  };

  it('keeps the employee workflow route path stable', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, BenefitDependentsWorkflowController),
    ).toBe('v1/employees/:employeeId/rh-workflows');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        BenefitDependentsWorkflowController.prototype.listBenefitDependents,
      ),
    ).toBe('dependentes-beneficio');
  });

  it('delegates benefit-dependent workflow handlers and audits mutations', async () => {
    const { audit, controller, workflows } = createController();

    await controller.listBenefitDependents('emp-1', { page: 1 });
    await controller.createBenefitDependent(request, 'emp-1', body);
    await controller.updateBenefitDependent(request, 'dep-2', body);
    await controller.deleteBenefitDependent(request, 'dep-3');

    expect(workflows.listWorkflow).toHaveBeenCalledWith(
      'benefit-dependents',
      { page: 1 },
      'emp-1',
    );
    expect(workflows.createWorkflowRecord).toHaveBeenCalledWith(
      'benefit-dependents',
      body,
      'emp-1',
    );
    expect(workflows.updateWorkflowRecord).toHaveBeenCalledWith(
      'benefit-dependents',
      'dep-2',
      body,
    );
    expect(workflows.deleteWorkflowRecord).toHaveBeenCalledWith(
      'benefit-dependents',
      'dep-3',
    );
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'DELETE',
      'employee_benefit_dependent',
      expect.objectContaining({ resourceId: 'dep-3' }),
    );
  });
});
