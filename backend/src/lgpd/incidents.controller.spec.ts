import { LgpdIncidentsController } from './incidents.controller';

describe('LgpdIncidentsController', () => {
  it('delegates list requests to the incident service', async () => {
    const list = jest.fn().mockResolvedValue({ items: [] });
    const controller = new LgpdIncidentsController(
      { list } as never,
      { auditMutation: jest.fn() } as never,
    );

    await controller.list({ status: 'TRIAGED' });

    expect(list).toHaveBeenCalledWith({ status: 'TRIAGED' });
  });

  it('audits creation and all RCIS state transitions', async () => {
    const incident = securityIncident('DETECTED');
    const triaged = securityIncident('TRIAGED');
    const reported = securityIncident('REPORTED');
    const complemented = securityIncident('COMPLEMENTED');
    const closed = securityIncident('CLOSED');
    const auditMutation = jest.fn().mockResolvedValue(undefined);
    const controller = new LgpdIncidentsController(
      {
        create: jest.fn().mockResolvedValue(incident),
        triage: jest.fn().mockResolvedValue(triaged),
        report: jest.fn().mockResolvedValue(reported),
        complement: jest.fn().mockResolvedValue(complemented),
        close: jest.fn().mockResolvedValue(closed),
      } as never,
      { auditMutation } as never,
    );
    const request = { requestId: 'req-1' } as never;
    const id = '00000000-0000-4000-8000-000000000241';

    await controller.create(request, { summary: 'detected' });
    await controller.triage(request, id, {
      riskRelevant: true,
      personalDataConfirmedAt: '2026-05-01T10:00:00.000Z',
      affectedDataNature: 'MIXED',
      affectedDataCategories: ['CPF'],
      severity: 'HIGH',
      riskAssessment: 'relevant risk',
      mitigationMeasures: ['rotation'],
    });
    await controller.report(request, id, {
      anpdProtocol: 'ANPD-2026-001',
      controllerContact: 'dpo@example.gov.br',
    });
    await controller.complement(request, id, {
      complementSummary: 'additional evidence',
    });
    await controller.close(request, id, {
      closureReason: 'completed',
    });

    expect(auditMutation).toHaveBeenCalledTimes(5);
    expect(auditMutation).toHaveBeenNthCalledWith(
      1,
      request,
      'CREATE',
      'lgpd_security_incident',
      expect.objectContaining({ tableName: 'lgpd.security_incident' }),
    );
    expect(auditMutation).toHaveBeenNthCalledWith(
      5,
      request,
      'UPDATE',
      'lgpd_security_incident',
      expect.objectContaining({
        metadata: expect.objectContaining({ transition: 'CLOSED' }),
      }),
    );
  });
});

function securityIncident(status: string) {
  return {
    id: '00000000-0000-4000-8000-000000000241',
    flowKey: 'payroll.payslip_pdf',
    status,
    severity: 'HIGH',
    anpdDueAt: '2026-05-06T10:00:00.000Z',
    complementDueAt:
      status === 'REPORTED' || status === 'COMPLEMENTED' || status === 'CLOSED'
        ? '2026-06-03T10:00:00.000Z'
        : null,
  };
}
