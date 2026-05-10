import { PATH_METADATA } from '@nestjs/common/constants';

import { TransitBenefitsWorkflowController } from './vales-transporte.controller';

describe('TransitBenefitsWorkflowController', () => {
  const request = { actor: { username: 'rh-user' } } as never;
  const body = { startsOn: '2026-04-25' };

  const createController = () => {
    const workflows = {
      listWorkflow: jest.fn().mockResolvedValue([]),
      createWorkflowRecord: jest.fn().mockResolvedValue({ id: 'transit-1' }),
      updateWorkflowRecord: jest.fn().mockResolvedValue({ id: 'transit-2' }),
      deleteWorkflowRecord: jest
        .fn()
        .mockResolvedValue({ id: 'transit-3', deleted: true }),
    };
    const audit = { auditMutation: jest.fn().mockResolvedValue(undefined) };

    return {
      audit,
      controller: new TransitBenefitsWorkflowController(
        workflows as never,
        audit as never,
      ),
      workflows,
    };
  };

  it('keeps the employee workflow route path stable', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, TransitBenefitsWorkflowController),
    ).toBe('v1/employees/:employeeId/rh-workflows');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        TransitBenefitsWorkflowController.prototype.listTransitBenefits,
      ),
    ).toBe('vales-transporte');
  });

  it('delegates transit benefit workflow handlers and audits mutations', async () => {
    const { audit, controller, workflows } = createController();

    await controller.listTransitBenefits('emp-1', { page: 1 });
    await controller.createTransitBenefit(request, 'emp-1', body);
    await controller.updateTransitBenefit(request, 'transit-2', body);
    await controller.deleteTransitBenefit(request, 'transit-3');

    expect(workflows.listWorkflow).toHaveBeenCalledWith(
      'transit-benefits',
      { page: 1 },
      'emp-1',
    );
    expect(workflows.createWorkflowRecord).toHaveBeenCalledWith(
      'transit-benefits',
      body,
      'emp-1',
    );
    expect(workflows.updateWorkflowRecord).toHaveBeenCalledWith(
      'transit-benefits',
      'transit-2',
      body,
    );
    expect(workflows.deleteWorkflowRecord).toHaveBeenCalledWith(
      'transit-benefits',
      'transit-3',
    );
    expect(audit.auditMutation).toHaveBeenCalledWith(
      request,
      'DELETE',
      'employee_transit_benefit',
      expect.objectContaining({ resourceId: 'transit-3' }),
    );
  });
});
