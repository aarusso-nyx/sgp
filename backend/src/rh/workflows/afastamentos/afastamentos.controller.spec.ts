import { PATH_METADATA } from '@nestjs/common/constants';

import { RhWorkflowLeavesController } from './afastamentos.controller';

describe('RhWorkflowLeavesController', () => {
  const request = { actor: { username: 'rh-user' } } as never;
  const body = { employeeId: 'emp-1', startsOn: '2026-04-25' };

  const createController = () => {
    const workflows = {
      listWorkflow: jest.fn().mockResolvedValue([]),
      createWorkflowRecord: jest.fn().mockResolvedValue({ id: 'leave-1' }),
      updateWorkflowRecord: jest.fn().mockResolvedValue({ id: 'leave-2' }),
      deleteWorkflowRecord: jest
        .fn()
        .mockResolvedValue({ id: 'leave-3', deleted: true }),
    };
    const audit = { auditMutation: jest.fn().mockResolvedValue(undefined) };

    return {
      audit,
      controller: new RhWorkflowLeavesController(
        workflows as never,
        audit as never,
      ),
      workflows,
    };
  };

  it('keeps the global workflow route path stable', () => {
    expect(Reflect.getMetadata(PATH_METADATA, RhWorkflowLeavesController)).toBe(
      'v1/rh',
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RhWorkflowLeavesController.prototype.listLeaves,
      ),
    ).toBe('afastamentos');
  });

  it('delegates leave workflow handlers and audits mutations', async () => {
    const { audit, controller, workflows } = createController();

    await controller.listLeaves({ page: 1 });
    await controller.createLeave(request, body);
    await controller.updateLeave(request, 'leave-2', body);
    await controller.deleteLeave(request, 'leave-3');

    expect(workflows.listWorkflow).toHaveBeenCalledWith('leaves', { page: 1 });
    expect(workflows.createWorkflowRecord).toHaveBeenCalledWith(
      'leaves',
      body,
      'emp-1',
    );
    expect(workflows.updateWorkflowRecord).toHaveBeenCalledWith(
      'leaves',
      'leave-2',
      body,
    );
    expect(workflows.deleteWorkflowRecord).toHaveBeenCalledWith(
      'leaves',
      'leave-3',
    );
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'DELETE',
      'leave_record',
      expect.objectContaining({ resourceId: 'leave-3' }),
    );
  });
});
