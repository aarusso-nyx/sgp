import { PATH_METADATA } from '@nestjs/common/constants';

import { AlimoniesWorkflowController } from './pensoes-alimenticias.controller';

describe('AlimoniesWorkflowController', () => {
  const request = { actor: { username: 'rh-user' } } as never;
  const body = { startsOn: '2026-04-25' };

  const createController = () => {
    const workflows = {
      listWorkflow: jest.fn().mockResolvedValue([]),
      createWorkflowRecord: jest.fn().mockResolvedValue({ id: 'alimony-1' }),
      updateWorkflowRecord: jest.fn().mockResolvedValue({ id: 'alimony-2' }),
      deleteWorkflowRecord: jest
        .fn()
        .mockResolvedValue({ id: 'alimony-3', deleted: true }),
    };
    const audit = { auditMutation: jest.fn().mockResolvedValue(undefined) };

    return {
      audit,
      controller: new AlimoniesWorkflowController(
        workflows as never,
        audit as never,
      ),
      workflows,
    };
  };

  it('keeps the employee workflow route path stable', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, AlimoniesWorkflowController),
    ).toBe('v1/employees/:employeeId/rh-workflows');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        AlimoniesWorkflowController.prototype.listAlimonies,
      ),
    ).toBe('pensoes-alimenticias');
  });

  it('delegates alimony workflow handlers and audits mutations', async () => {
    const { audit, controller, workflows } = createController();

    await controller.listAlimonies('emp-1', { page: 1 });
    await controller.createAlimony(request, 'emp-1', body);
    await controller.updateAlimony(request, 'alimony-2', body);
    await controller.deleteAlimony(request, 'alimony-3');

    expect(workflows.listWorkflow).toHaveBeenCalledWith(
      'alimonies',
      { page: 1 },
      'emp-1',
    );
    expect(workflows.createWorkflowRecord).toHaveBeenCalledWith(
      'alimonies',
      body,
      'emp-1',
    );
    expect(workflows.updateWorkflowRecord).toHaveBeenCalledWith(
      'alimonies',
      'alimony-2',
      body,
    );
    expect(workflows.deleteWorkflowRecord).toHaveBeenCalledWith(
      'alimonies',
      'alimony-3',
    );
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'DELETE',
      'employee_alimony',
      expect.objectContaining({ resourceId: 'alimony-3' }),
    );
  });
});
