import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { JustificationWorkflowService } from './justification-workflow.service';

describe('JustificationWorkflowService', () => {
  const service = new JustificationWorkflowService({} as never);

  it('allows only terminal decisions from requested status', () => {
    expect(() =>
      service.assertTransition('REQUESTED', 'APPROVED'),
    ).not.toThrow();
    expect(() =>
      service.assertTransition('REQUESTED', 'REJECTED'),
    ).not.toThrow();
    expect(() =>
      service.assertTransition('REQUESTED', 'CANCELLED'),
    ).not.toThrow();
    expect(() => service.assertTransition('APPROVED', 'REJECTED')).toThrow(
      BadRequestException,
    );
  });

  it('calculates medical leave duration inclusively', () => {
    expect(
      service.medicalLeaveDays(
        '2026-05-01T00:00:00.000Z',
        '2026-05-16T23:00:00.000Z',
      ),
    ).toBe(16);
  });

  it('rejects an approver linked to the same employee', async () => {
    await expect(
      service.assertApproverAboveEmployee(
        {
          query: jest.fn().mockResolvedValue({
            rows: [{ employee_id: 'employee-1' }],
          }),
        } as never,
        'employee-1',
        'approver-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
