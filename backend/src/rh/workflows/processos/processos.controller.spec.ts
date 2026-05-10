import { PATH_METADATA } from '@nestjs/common/constants';

import { RhWorkflowProcessesController } from './processos.controller';

describe('RhWorkflowProcessesController', () => {
  const request = { actor: { username: 'rh-user' } } as never;
  const body = { processNumber: '001/2026', startsOn: '2026-04-25' };

  const createController = () => {
    const workflows = {
      listWorkflow: jest.fn().mockResolvedValue([]),
      createWorkflowRecord: jest.fn().mockResolvedValue({ id: 'process-1' }),
      updateWorkflowRecord: jest.fn().mockResolvedValue({ id: 'process-2' }),
      deleteWorkflowRecord: jest
        .fn()
        .mockResolvedValue({ id: 'process-3', deleted: true }),
    };
    const audit = { auditMutation: jest.fn().mockResolvedValue(undefined) };

    return {
      audit,
      controller: new RhWorkflowProcessesController(
        workflows as never,
        audit as never,
      ),
      workflows,
    };
  };

  it('keeps the global workflow route path stable', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, RhWorkflowProcessesController),
    ).toBe('v1/rh');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RhWorkflowProcessesController.prototype.listProcesses,
      ),
    ).toBe('processos');
  });

  it('delegates administrative process handlers and audits mutations', async () => {
    const { audit, controller, workflows } = createController();

    await controller.listProcesses({ page: 1 });
    await controller.createProcess(request, body);
    await controller.updateProcess(request, 'process-2', body);
    await controller.deleteProcess(request, 'process-3');

    expect(workflows.listWorkflow).toHaveBeenCalledWith('processes', {
      page: 1,
    });
    expect(workflows.createWorkflowRecord).toHaveBeenCalledWith(
      'processes',
      body,
      undefined,
    );
    expect(workflows.updateWorkflowRecord).toHaveBeenCalledWith(
      'processes',
      'process-2',
      body,
    );
    expect(workflows.deleteWorkflowRecord).toHaveBeenCalledWith(
      'processes',
      'process-3',
    );
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'DELETE',
      'administrative_process',
      expect.objectContaining({ resourceId: 'process-3' }),
    );
  });
});
