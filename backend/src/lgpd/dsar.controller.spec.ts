import { LgpdDsarAdminController } from './dsar.controller';

describe('LgpdDsarAdminController', () => {
  it('delegates DSAR listing to the admin service', async () => {
    const list = jest.fn().mockResolvedValue({ items: [] });
    const controller = new LgpdDsarAdminController(
      { list } as never,
      { auditMutation: jest.fn() } as never,
    );

    await controller.list({ status: 'PENDING_TRIAGE' });

    expect(list).toHaveBeenCalledWith({ status: 'PENDING_TRIAGE' });
  });

  it('audits DSAR lifecycle updates', async () => {
    const update = jest.fn().mockResolvedValue(dsarTicket());
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new LgpdDsarAdminController(
      { update } as never,
      { auditMutation } as never,
    );
    const request = { requestId: 'req-1' } as never;

    await controller.update(request, '00000000-0000-4000-8000-000000000301', {
      status: 'IN_PROGRESS',
      triageOutcome: 'EXECUTABLE',
    });

    expect(auditMutation).toHaveBeenCalledWith(
      request,
      'UPDATE',
      'lgpd_data_subject_request',
      expect.objectContaining({
        resourceId: '00000000-0000-4000-8000-000000000301',
        tableName: 'lgpd.data_subject_request',
        metadata: expect.objectContaining({
          status: 'IN_PROGRESS',
          triageOutcome: 'EXECUTABLE',
        }),
      }),
    );
  });
});

function dsarTicket() {
  return {
    id: '00000000-0000-4000-8000-000000000301',
    flowKey: 'payroll.payslip_pdf',
    rightType: 'ACCESS',
    status: 'IN_PROGRESS',
    descriptionPreview: 'Please confirm payroll processing data.',
    requesterRef: 'requester-ref',
    dataSubjectEmployeeRef: 'employee-ref',
    sla: {
      startedAt: '2026-05-02T12:00:00.000Z',
      dueAt: '2026-07-31T12:00:00.000Z',
      status: 'OPEN',
    },
    triage: {
      outcome: 'EXECUTABLE',
      retentionRule: 'Retain official payslips.',
      sharingScope: 'internal_employee_portal',
    },
    createdAt: '2026-05-02T12:00:00.000Z',
    updatedAt: '2026-05-03T12:00:00.000Z',
  };
}
