import { PATH_METADATA } from '@nestjs/common/constants';

import { RhWorkflowProcessFunctionsController } from './processos-funcao.controller';

describe('RhWorkflowProcessFunctionsController', () => {
  const request = { actor: { username: 'rh-user' } } as never;
  const body = { startsOn: '2026-04-25' };

  const createController = () => {
    const workflows = {
      listWorkflow: jest.fn().mockResolvedValue([]),
      createWorkflowRecord: jest.fn().mockResolvedValue({ id: 'process-fn-1' }),
      updateWorkflowRecord: jest.fn().mockResolvedValue({ id: 'process-fn-2' }),
      deleteWorkflowRecord: jest
        .fn()
        .mockResolvedValue({ id: 'process-fn-3', deleted: true }),
    };
    const audit = { auditMutation: jest.fn().mockResolvedValue(undefined) };

    return {
      audit,
      controller: new RhWorkflowProcessFunctionsController(
        workflows as never,
        audit as never,
      ),
      workflows,
    };
  };

  it('keeps the global workflow route path stable', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, RhWorkflowProcessFunctionsController),
    ).toBe('v1/rh');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RhWorkflowProcessFunctionsController.prototype.listProcessFunctions,
      ),
    ).toBe('processos-funcao');
  });

  it('delegates process-function handlers and audits mutations', async () => {
    const { audit, controller, workflows } = createController();

    await controller.listProcessFunctions({ page: 1 });
    await controller.createProcessFunction(request, body);
    await controller.updateProcessFunction(request, 'process-fn-2', body);
    await controller.deleteProcessFunction(request, 'process-fn-3');

    expect(workflows.listWorkflow).toHaveBeenCalledWith('process-functions', {
      page: 1,
    });
    expect(workflows.createWorkflowRecord).toHaveBeenCalledWith(
      'process-functions',
      body,
      undefined,
    );
    expect(workflows.updateWorkflowRecord).toHaveBeenCalledWith(
      'process-functions',
      'process-fn-2',
      body,
    );
    expect(workflows.deleteWorkflowRecord).toHaveBeenCalledWith(
      'process-functions',
      'process-fn-3',
    );
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'DELETE',
      'administrative_process_function',
      expect.objectContaining({ resourceId: 'process-fn-3' }),
    );
  });
});
