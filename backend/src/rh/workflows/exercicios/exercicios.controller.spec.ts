import { PATH_METADATA } from '@nestjs/common/constants';

import { ExercisesWorkflowController } from './exercicios.controller';

describe('ExercisesWorkflowController', () => {
  const request = { actor: { username: 'rh-user' } } as never;
  const body = { startsOn: '2026-04-25' };

  const createController = () => {
    const workflows = {
      listWorkflow: jest.fn().mockResolvedValue([]),
      createWorkflowRecord: jest.fn().mockResolvedValue({ id: 'exercise-1' }),
      updateWorkflowRecord: jest.fn().mockResolvedValue({ id: 'exercise-2' }),
      deleteWorkflowRecord: jest
        .fn()
        .mockResolvedValue({ id: 'exercise-3', deleted: true }),
    };
    const audit = { auditMutation: jest.fn().mockResolvedValue(undefined) };

    return {
      audit,
      controller: new ExercisesWorkflowController(
        workflows as never,
        audit as never,
      ),
      workflows,
    };
  };

  it('keeps the employee workflow route path stable', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, ExercisesWorkflowController),
    ).toBe('v1/employees/:employeeId/rh-workflows');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ExercisesWorkflowController.prototype.listExercises,
      ),
    ).toBe('exercicios');
  });

  it('delegates exercise workflow handlers and audits mutations', async () => {
    const { audit, controller, workflows } = createController();

    await controller.listExercises('emp-1', { page: 1 });
    await controller.createExercise(request, 'emp-1', body);
    await controller.updateExercise(request, 'exercise-2', body);
    await controller.deleteExercise(request, 'exercise-3');

    expect(workflows.listWorkflow).toHaveBeenCalledWith(
      'exercises',
      { page: 1 },
      'emp-1',
    );
    expect(workflows.createWorkflowRecord).toHaveBeenCalledWith(
      'exercises',
      body,
      'emp-1',
    );
    expect(workflows.updateWorkflowRecord).toHaveBeenCalledWith(
      'exercises',
      'exercise-2',
      body,
    );
    expect(workflows.deleteWorkflowRecord).toHaveBeenCalledWith(
      'exercises',
      'exercise-3',
    );
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'DELETE',
      'employee_exercise',
      expect.objectContaining({ resourceId: 'exercise-3' }),
    );
  });
});
