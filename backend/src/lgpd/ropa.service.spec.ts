import { RequestContextStore } from '../common/request-context/request-context.store';
import { LgpdRopaService } from './ropa.service';

const tenantId = '00000000-0000-0000-0000-000000000100';
const entryId = '00000000-0000-4000-8000-000000000239';

describe('LgpdRopaService', () => {
  it('lists ROPA entries joined to legal-basis rules', async () => {
    const query = jest.fn().mockResolvedValueOnce([ropaRow()]);
    const service = new LgpdRopaService(
      { configured: true, query } as never,
      { assertPiiReadAllowed: jest.fn() } as never,
    );

    const result = await service.list({ flowKey: 'payroll.payslip_pdf' });

    expect(query.mock.calls[0][0]).toContain('lgpd.ropa_entry');
    expect(query.mock.calls[0][0]).toContain('lgpd.legal_basis_rule');
    expect(query.mock.calls[0][1]).toEqual(['payroll.payslip_pdf']);
    expect(result.items[0]).toMatchObject({
      id: entryId,
      flowKey: 'payroll.payslip_pdf',
      operationName: 'Payroll payslip generation',
      legalBasis: {
        legalBasisCode: 'LGPD_ART_7_II',
        sensitiveBasisCode: 'LGPD_ART_11_II_A',
      },
    });
  });

  it('creates entries only for active legal-basis flow keys in tenant context', async () => {
    const assertPiiReadAllowed = jest.fn().mockResolvedValue({
      flowKey: 'time.attendance_register',
    });
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ id: entryId }])
      .mockResolvedValueOnce([
        ropaRow({
          flow_key: 'time.attendance_register',
          operation_name: 'Attendance register',
          risk_level: 'MEDIUM',
        }),
      ]);
    const service = new LgpdRopaService(
      { configured: true, query } as never,
      { assertPiiReadAllowed } as never,
    );

    const created = await RequestContextStore.run({ tenantId }, () =>
      service.create({
        flowKey: 'time.attendance_register',
        operationName: 'Attendance register',
        controllerArea: 'Ponto operations',
        securityControls: ['tenant RLS'],
      }),
    );

    expect(assertPiiReadAllowed).toHaveBeenCalledWith(
      'time.attendance_register',
    );
    expect(query.mock.calls[0][0]).toContain('INSERT INTO lgpd.ropa_entry');
    expect(query.mock.calls[0][1]).toEqual([
      'time.attendance_register',
      'Attendance register',
      'Ponto operations',
      null,
      [],
      false,
      ['tenant RLS'],
      [],
      'MEDIUM',
      'ACTIVE',
      null,
      null,
    ]);
    expect(created.flowKey).toBe('time.attendance_register');
  });

  it('patches mutable ROPA operation fields and keeps the same entry id', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ id: entryId }])
      .mockResolvedValueOnce([
        ropaRow({
          controller_area: 'Updated area',
          risk_level: 'HIGH',
        }),
      ]);
    const service = new LgpdRopaService(
      { configured: true, query } as never,
      { assertPiiReadAllowed: jest.fn() } as never,
    );

    const updated = await RequestContextStore.run({ tenantId }, () =>
      service.update(entryId, {
        controllerArea: 'Updated area',
        riskLevel: 'HIGH',
      }),
    );

    expect(query.mock.calls[0][0]).toContain('UPDATE lgpd.ropa_entry');
    expect(query.mock.calls[0][1]).toEqual(['Updated area', 'HIGH', entryId]);
    expect(updated.controllerArea).toBe('Updated area');
    expect(updated.riskLevel).toBe('HIGH');
  });
});

function ropaRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: entryId,
    tenant_id: tenantId,
    flow_key: 'payroll.payslip_pdf',
    operation_name: 'Payroll payslip generation',
    controller_area: 'Payroll',
    processor_name: 'SGP report-service',
    external_recipients: [],
    international_transfer: false,
    security_controls: ['tenant RLS', 'permission guard'],
    lifecycle_evidence: ['ADR-LGPD-001'],
    risk_level: 'HIGH',
    status: 'ACTIVE',
    review_due_at: '2026-11-02',
    notes: null,
    created_at: '2026-05-02T12:00:00.000Z',
    updated_at: '2026-05-02T12:00:00.000Z',
    flow_name: 'Official payslip PDF/A',
    data_category: 'MIXED',
    legal_basis_code: 'LGPD_ART_7_II',
    sensitive_basis_code: 'LGPD_ART_11_II_A',
    purpose: 'Generate payslips.',
    data_subjects: ['public employee'],
    data_categories: ['CPF'],
    source_tables: ['hr.employee'],
    read_surfaces: ['report-service/payslip'],
    retention_rule: 'Functional retention.',
    sharing_scope: 'internal_employee_portal',
    requires_consent: false,
    requires_dpia: true,
    decision_record_anchor: 'ADR-LGPD-001',
    ...overrides,
  };
}
