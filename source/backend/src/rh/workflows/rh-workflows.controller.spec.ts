import {
  EmployeeRhWorkflowsController,
  RhWorkflowsController,
} from './rh-workflows.controller';

describe('RhWorkflowsController', () => {
  const request = { actor: { username: 'rh-user' } } as never;
  const body = { employeeId: 'emp-1', startsOn: '2026-04-25' };

  const createWorkflowMocks = () => ({
    listWorkflow: jest.fn(async (workflow, query, employeeId) => ({
      workflow,
      query,
      employeeId,
      items: [],
    })),
    createWorkflowRecord: jest.fn(async (workflow, input, employeeId) => ({
      id: `${workflow}-created`,
      workflow,
      input,
      employeeId,
    })),
    updateWorkflowRecord: jest.fn(async (workflow, id, input) => ({
      id,
      workflow,
      input,
    })),
    deleteWorkflowRecord: jest.fn(async (workflow, id) => ({
      id,
      workflow,
      deleted: true,
    })),
  });

  it('creates leave records through the workflow service', async () => {
    const createWorkflowRecord = jest.fn().mockResolvedValue({ id: 'leave-1' });
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new RhWorkflowsController(
      { createWorkflowRecord } as never,
      { auditMutation } as never,
    );

    const result = await controller.createLeave(
      { actor: { username: 'rh-user' } } as never,
      { employeeId: 'emp-1', startsOn: '2026-04-25' },
    );

    expect(createWorkflowRecord).toHaveBeenCalledWith(
      'leaves',
      { employeeId: 'emp-1', startsOn: '2026-04-25' },
      'emp-1',
    );
    expect(result).toEqual({ id: 'leave-1' });
  });

  it('creates administrative processes through the workflow service', async () => {
    const createWorkflowRecord = jest
      .fn()
      .mockResolvedValue({ id: 'process-1' });
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new RhWorkflowsController(
      { createWorkflowRecord } as never,
      { auditMutation } as never,
    );

    const result = await controller.createProcess(
      { actor: { username: 'rh-user' } } as never,
      {
        processNumber: '001/2026',
        subject: 'Revisao funcional',
        startsOn: '2026-04-25',
      },
    );

    expect(createWorkflowRecord).toHaveBeenCalledWith(
      'processes',
      {
        processNumber: '001/2026',
        subject: 'Revisao funcional',
        startsOn: '2026-04-25',
      },
      undefined,
    );
    expect(result).toEqual({ id: 'process-1' });
  });

  it('employee controller creates transit benefit grants', async () => {
    const createWorkflowRecord = jest.fn().mockResolvedValue({ id: 'vt-1' });
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new EmployeeRhWorkflowsController(
      { createWorkflowRecord } as never,
      { auditMutation } as never,
    );

    const result = await controller.createTransitBenefit(
      { actor: { username: 'rh-user' } } as never,
      'emp-1',
      { transitBenefitId: 'benefit-1', startsOn: '2026-04-25' },
    );

    expect(createWorkflowRecord).toHaveBeenCalledWith(
      'transit-benefits',
      { transitBenefitId: 'benefit-1', startsOn: '2026-04-25' },
      'emp-1',
    );
    expect(result).toEqual({ id: 'vt-1' });
  });

  it('delegates all global workflow handlers and audits mutations', async () => {
    const workflows = createWorkflowMocks();
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new RhWorkflowsController(
      workflows as never,
      { auditMutation } as never,
    );
    const routes = [
      {
        list: 'listLeaves',
        create: 'createLeave',
        update: 'updateLeave',
        remove: 'deleteLeave',
        workflow: 'leaves',
        table: 'leave_record',
      },
      {
        list: 'listProcesses',
        create: 'createProcess',
        update: 'updateProcess',
        remove: 'deleteProcess',
        workflow: 'processes',
        table: 'administrative_process',
      },
      {
        list: 'listProcessFunctions',
        create: 'createProcessFunction',
        update: 'updateProcessFunction',
        remove: 'deleteProcessFunction',
        workflow: 'process-functions',
        table: 'administrative_process_function',
      },
    ];

    for (const route of routes) {
      await expect(
        (
          controller as never as Record<string, (...args: unknown[]) => unknown>
        )[route.list]({ page: 1 }),
      ).resolves.toMatchObject({ workflow: route.workflow });
      await expect(
        (
          controller as never as Record<string, (...args: unknown[]) => unknown>
        )[route.create](request, body),
      ).resolves.toMatchObject({ workflow: route.workflow });
      await expect(
        (
          controller as never as Record<string, (...args: unknown[]) => unknown>
        )[route.update](request, `${route.workflow}-id`, body),
      ).resolves.toMatchObject({ id: `${route.workflow}-id` });
      await expect(
        (
          controller as never as Record<string, (...args: unknown[]) => unknown>
        )[route.remove](request, `${route.workflow}-id`),
      ).resolves.toMatchObject({ deleted: true });

      expect(auditMutation).toHaveBeenCalledWith(
        request,
        expect.any(String),
        route.table,
        expect.objectContaining({ tableName: route.table }),
      );
    }
  });

  it('delegates all employee workflow handlers and audits mutations', async () => {
    const workflows = createWorkflowMocks();
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new EmployeeRhWorkflowsController(
      workflows as never,
      { auditMutation } as never,
    );
    const routes = [
      {
        list: 'listBenefitDependents',
        create: 'createBenefitDependent',
        update: 'updateBenefitDependent',
        remove: 'deleteBenefitDependent',
        workflow: 'benefit-dependents',
        table: 'employee_benefit_dependent',
      },
      {
        list: 'listUnionContributions',
        create: 'createUnionContribution',
        update: 'updateUnionContribution',
        remove: 'deleteUnionContribution',
        workflow: 'union-contributions',
        table: 'employee_union_contribution',
      },
      {
        list: 'listExercises',
        create: 'createExercise',
        update: 'updateExercise',
        remove: 'deleteExercise',
        workflow: 'exercises',
        table: 'employee_exercise',
      },
      {
        list: 'listAlimonies',
        create: 'createAlimony',
        update: 'updateAlimony',
        remove: 'deleteAlimony',
        workflow: 'alimonies',
        table: 'employee_alimony',
      },
      {
        list: 'listTransitBenefits',
        create: 'createTransitBenefit',
        update: 'updateTransitBenefit',
        remove: 'deleteTransitBenefit',
        workflow: 'transit-benefits',
        table: 'employee_transit_benefit',
      },
    ];

    for (const route of routes) {
      await expect(
        (
          controller as never as Record<string, (...args: unknown[]) => unknown>
        )[route.list]('emp-1', { page: 1 }),
      ).resolves.toMatchObject({
        workflow: route.workflow,
        employeeId: 'emp-1',
      });
      await expect(
        (
          controller as never as Record<string, (...args: unknown[]) => unknown>
        )[route.create](request, 'emp-1', body),
      ).resolves.toMatchObject({
        workflow: route.workflow,
        employeeId: 'emp-1',
      });
      await expect(
        (
          controller as never as Record<string, (...args: unknown[]) => unknown>
        )[route.update](request, `${route.workflow}-id`, body),
      ).resolves.toMatchObject({ id: `${route.workflow}-id` });
      await expect(
        (
          controller as never as Record<string, (...args: unknown[]) => unknown>
        )[route.remove](request, `${route.workflow}-id`),
      ).resolves.toMatchObject({ deleted: true });

      expect(auditMutation).toHaveBeenCalledWith(
        request,
        expect.any(String),
        route.table,
        expect.objectContaining({ tableName: route.table }),
      );
    }
  });
});
