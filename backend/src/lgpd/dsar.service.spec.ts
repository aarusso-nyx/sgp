import { LgpdDsarAdminService } from './dsar.service';
import { TEST_INSTANT_2026_05_04T00_00_00_000Z } from './../../../tests/backend/helpers/date-fixtures';

const ticketId = '00000000-0000-4000-8000-000000000301';
const createdAt = '2026-05-02T12:00:00.000Z';
const dueAt = '2026-05-08T12:00:00.000Z';

describe('LgpdDsarAdminService', () => {
  beforeEach(() => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date(TEST_INSTANT_2026_05_04T00_00_00_000Z));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists DSAR tickets with SLA status and redacted requester references', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      dsarRow({
        request_description: 'Please confirm payroll processing data.',
        requested_by_sub: 'raw-subject',
        requested_by_login: 'holder@example.test',
        data_subject_employee_id: '00000000-0000-4000-8000-000000000043',
      }),
    ]);
    const service = new LgpdDsarAdminService({
      configured: true,
      query,
    } as never);

    const result = await service.list({ status: 'PENDING_TRIAGE' });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: ticketId,
          flowKey: 'payroll.payslip_pdf',
          rightType: 'ACCESS',
          status: 'PENDING_TRIAGE',
          descriptionPreview: 'Please confirm payroll processing data.',
          sla: expect.objectContaining({ status: 'DUE_SOON' }),
        }),
      ],
    });
    const item = result.items[0];
    expect(item?.requesterRef).not.toContain('raw-subject');
    expect(item?.requesterRef).not.toContain('holder@example.test');
    expect(item?.dataSubjectEmployeeRef).not.toContain('00000000');
  });

  it('updates status and triage outcome without returning raw requester identity', async () => {
    const query = jest.fn().mockResolvedValueOnce([
      dsarRow({
        status: 'IN_PROGRESS',
        triage_outcome: 'EXECUTABLE',
        updated_at: '2026-05-03T12:00:00.000Z',
      }),
    ]);
    const service = new LgpdDsarAdminService({
      configured: true,
      query,
    } as never);

    await expect(
      service.update(ticketId, {
        status: 'IN_PROGRESS',
        triageOutcome: 'EXECUTABLE',
      }),
    ).resolves.toMatchObject({
      status: 'IN_PROGRESS',
      triage: { outcome: 'EXECUTABLE' },
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE lgpd.data_subject_request'),
      [ticketId, 'IN_PROGRESS', 'EXECUTABLE'],
    );
  });
});

function dsarRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ticketId,
    tenant_id: '00000000-0000-0000-0000-000000000100',
    flow_key: 'payroll.payslip_pdf',
    right_type: 'ACCESS',
    status: 'PENDING_TRIAGE',
    request_description: 'Please confirm payroll processing data.',
    requested_by_sub: 'employee-sub',
    requested_by_login: 'employee.local',
    data_subject_employee_id: null,
    sla_started_at: createdAt,
    sla_due_at: dueAt,
    triage_outcome: 'PENDING',
    retention_rule_snapshot: 'Retain official payslips.',
    sharing_scope_snapshot: 'internal_employee_portal',
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}
