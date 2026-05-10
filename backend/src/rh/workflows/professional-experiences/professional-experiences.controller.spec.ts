import { PATH_METADATA } from '@nestjs/common/constants';

import { RhWorkflowProfessionalExperiencesController } from './professional-experiences.controller';

describe('RhWorkflowProfessionalExperiencesController', () => {
  const request = { actor: { username: 'rh-user' } } as never;
  const body = { employeeId: 'emp-1', startsOn: '2026-04-25' };

  const createController = () => {
    const workflows = {
      listWorkflow: jest.fn().mockResolvedValue([]),
      createWorkflowRecord: jest.fn().mockResolvedValue({ id: 'exp-1' }),
      updateWorkflowRecord: jest.fn().mockResolvedValue({ id: 'exp-2' }),
      deleteWorkflowRecord: jest
        .fn()
        .mockResolvedValue({ id: 'exp-3', deleted: true }),
    };
    const audit = { auditMutation: jest.fn().mockResolvedValue(undefined) };

    return {
      audit,
      controller: new RhWorkflowProfessionalExperiencesController(
        workflows as never,
        audit as never,
      ),
      workflows,
    };
  };

  it('keeps the global workflow route path stable', () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RhWorkflowProfessionalExperiencesController,
      ),
    ).toBe('v1/rh');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RhWorkflowProfessionalExperiencesController.prototype
          .listProfessionalExperiences,
      ),
    ).toBe('professional-experiences');
  });

  it('delegates professional experience handlers and audits mutations', async () => {
    const { audit, controller, workflows } = createController();

    await controller.listProfessionalExperiences({ page: 1 });
    await controller.createProfessionalExperience(request, body);
    await controller.updateProfessionalExperience(request, 'exp-2', body);
    await controller.deleteProfessionalExperience(request, 'exp-3');

    expect(workflows.listWorkflow).toHaveBeenCalledWith(
      'professional-experiences',
      { page: 1 },
    );
    expect(workflows.createWorkflowRecord).toHaveBeenCalledWith(
      'professional-experiences',
      body,
      'emp-1',
    );
    expect(workflows.updateWorkflowRecord).toHaveBeenCalledWith(
      'professional-experiences',
      'exp-2',
      body,
    );
    expect(workflows.deleteWorkflowRecord).toHaveBeenCalledWith(
      'professional-experiences',
      'exp-3',
    );
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'DELETE',
      'professional_experience',
      expect.objectContaining({ resourceId: 'exp-3' }),
    );
  });
});
