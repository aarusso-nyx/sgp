import {
  TEST_INSTANT_2026_05_01_09_00_00_000Z,
  TEST_INSTANT_2026_05_01_10_00_00_000Z,
  TEST_INSTANT_2026_05_05_10_00_00_000Z,
  TEST_INSTANT_2026_05_06_10_00_00_000Z,
  TEST_INSTANT_2026_05_20_10_00_00_000Z,
  TEST_INSTANT_2026_06_03_10_00_00_000Z,
} from './../../../tests/backend/helpers/date-fixtures';
import { BadRequestException, Logger } from '@nestjs/common';

import { RequestContextStore } from '../common/request-context/request-context.store';
import {
  addBusinessDays,
  LgpdSecurityIncidentService,
} from './incidents.service';

const tenantId = '00000000-0000-0000-0000-000000000100';
const incidentId = '00000000-0000-4000-8000-000000000241';
const ropaEntryId = '00000000-0000-4000-8000-000000000239';
const legalBasisRuleId = '00000000-0000-4000-8000-000000000040';

describe('LgpdSecurityIncidentService', () => {
  it('calculates ANPD and complementation deadlines in business days', () => {
    expect(
      addBusinessDays(
        new Date(TEST_INSTANT_2026_05_01_10_00_00_000Z),
        3,
      ).toISOString(),
    ).toBe(TEST_INSTANT_2026_05_06_10_00_00_000Z);
    expect(
      addBusinessDays(
        new Date(TEST_INSTANT_2026_05_06_10_00_00_000Z),
        20,
      ).toISOString(),
    ).toBe(TEST_INSTANT_2026_06_03_10_00_00_000Z);
  });

  it('creates a detected incident linked to active ROPA evidence', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([incidentSourceRow()])
      .mockResolvedValueOnce([{ id: incidentId }])
      .mockResolvedValueOnce([
        incidentRow({
          personal_data_confirmed_at: TEST_INSTANT_2026_05_01_10_00_00_000Z,
          anpd_due_at: TEST_INSTANT_2026_05_06_10_00_00_000Z,
          anpd_alert_at: TEST_INSTANT_2026_05_05_10_00_00_000Z,
        }),
      ]);
    const service = new LgpdSecurityIncidentService({
      configured: true,
      query,
    } as never);

    const created = await RequestContextStore.run(
      {
        tenantId,
        actor: {
          sub: 'admin',
          username: 'admin.local',
          tenantId,
          groups: [],
          permissions: ['gestao.write'],
        },
      },
      () =>
        service.create({
          summary: 'Security incident under investigation',
          flowKey: 'payroll.payslip_pdf',
          personalDataConfirmedAt: TEST_INSTANT_2026_05_01_10_00_00_000Z,
          affectedDataCategories: ['CPF'],
        }),
    );

    expect(query.mock.calls[0][0]).toContain('FROM lgpd.ropa_entry');
    expect(query.mock.calls[1][0]).toContain(
      'INSERT INTO lgpd.security_incident',
    );
    expect(query.mock.calls[1][1]).toEqual([
      ropaEntryId,
      legalBasisRuleId,
      'payroll.payslip_pdf',
      'MEDIUM',
      'Security incident under investigation',
      null,
      TEST_INSTANT_2026_05_01_10_00_00_000Z,
      TEST_INSTANT_2026_05_06_10_00_00_000Z,
      TEST_INSTANT_2026_05_05_10_00_00_000Z,
      null,
      ['CPF'],
      null,
      'admin.local',
    ]);
    expect(created.status).toBe('DETECTED');
    expect(created.anpdDueAt).toBe(TEST_INSTANT_2026_05_06_10_00_00_000Z);
  });

  it('moves DETECTED through TRIAGED and sets the 3-business-day timer', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([incidentRow()])
      .mockResolvedValueOnce([{ id: incidentId }])
      .mockResolvedValueOnce([
        incidentRow({
          status: 'TRIAGED',
          personal_data_confirmed_at: TEST_INSTANT_2026_05_01_10_00_00_000Z,
          anpd_due_at: TEST_INSTANT_2026_05_06_10_00_00_000Z,
          anpd_alert_at: TEST_INSTANT_2026_05_05_10_00_00_000Z,
          risk_relevant: true,
        }),
      ]);
    const service = new LgpdSecurityIncidentService({
      configured: true,
      query,
    } as never);

    const triaged = await RequestContextStore.run({ tenantId }, () =>
      service.triage(incidentId, {
        riskRelevant: true,
        personalDataConfirmedAt: TEST_INSTANT_2026_05_01_10_00_00_000Z,
        affectedDataNature: 'MIXED',
        affectedDataCategories: ['CPF', 'bank_account'],
        affectedSubjectsEstimate: 42,
        severity: 'HIGH',
        riskAssessment: 'Potential relevant risk to holders.',
        mitigationMeasures: ['credential rotation'],
      }),
    );

    expect(query.mock.calls[1][0]).toContain('UPDATE lgpd.security_incident');
    expect(query.mock.calls[1][1]).toContain('TRIAGED');
    expect(query.mock.calls[1][1]).toContain(
      TEST_INSTANT_2026_05_06_10_00_00_000Z,
    );
    expect(triaged.status).toBe('TRIAGED');
    expect(triaged.anpdDueAt).toBe(TEST_INSTANT_2026_05_06_10_00_00_000Z);
  });

  it('moves REPORTED to COMPLEMENTED only after report creates the 20-business-day window', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([incidentRow({ status: 'TRIAGED' })])
      .mockResolvedValueOnce([{ id: incidentId }])
      .mockResolvedValueOnce([
        incidentRow({
          status: 'REPORTED',
          anpd_reported_at: TEST_INSTANT_2026_05_06_10_00_00_000Z,
          complement_due_at: TEST_INSTANT_2026_06_03_10_00_00_000Z,
        }),
      ])
      .mockResolvedValueOnce([
        incidentRow({
          status: 'REPORTED',
          complement_due_at: TEST_INSTANT_2026_06_03_10_00_00_000Z,
        }),
      ])
      .mockResolvedValueOnce([{ id: incidentId }])
      .mockResolvedValueOnce([
        incidentRow({
          status: 'COMPLEMENTED',
          complement_due_at: TEST_INSTANT_2026_06_03_10_00_00_000Z,
          complemented_at: TEST_INSTANT_2026_05_20_10_00_00_000Z,
        }),
      ]);
    const service = new LgpdSecurityIncidentService({
      configured: true,
      query,
    } as never);

    const reported = await RequestContextStore.run({ tenantId }, () =>
      service.report(incidentId, {
        reportedAt: TEST_INSTANT_2026_05_06_10_00_00_000Z,
        anpdProtocol: 'ANPD-2026-001',
        controllerContact: 'dpo@example.gov.br',
      }),
    );
    const complemented = await RequestContextStore.run({ tenantId }, () =>
      service.complement(incidentId, {
        complementedAt: TEST_INSTANT_2026_05_20_10_00_00_000Z,
        complementSummary: 'Complementary technical report submitted.',
      }),
    );

    expect(reported.status).toBe('REPORTED');
    expect(reported.complementDueAt).toBe(
      TEST_INSTANT_2026_06_03_10_00_00_000Z,
    );
    expect(complemented.status).toBe('COMPLEMENTED');
  });

  it('closes a complemented incident with closure evidence', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        incidentRow({
          status: 'COMPLEMENTED',
          complement_due_at: TEST_INSTANT_2026_06_03_10_00_00_000Z,
        }),
      ])
      .mockResolvedValueOnce([{ id: incidentId }])
      .mockResolvedValueOnce([
        incidentRow({
          status: 'CLOSED',
          complement_due_at: TEST_INSTANT_2026_06_03_10_00_00_000Z,
          closed_at: TEST_INSTANT_2026_05_20_10_00_00_000Z,
          closure_reason: 'ANPD communication and mitigation evidence closed.',
          closed_by_ref: 'admin.local',
        }),
      ]);
    const service = new LgpdSecurityIncidentService({
      configured: true,
      query,
    } as never);

    const closed = await RequestContextStore.run(
      {
        tenantId,
        actor: {
          sub: 'admin',
          username: 'admin.local',
          tenantId,
          groups: [],
          permissions: ['gestao.write'],
        },
      },
      () =>
        service.close(incidentId, {
          closedAt: TEST_INSTANT_2026_05_20_10_00_00_000Z,
          closureReason: 'ANPD communication and mitigation evidence closed.',
        }),
    );

    expect(query.mock.calls[1][0]).toContain('UPDATE lgpd.security_incident');
    expect(query.mock.calls[1][1]).toEqual([
      incidentId,
      'CLOSED',
      'COMPLEMENTED',
      TEST_INSTANT_2026_05_20_10_00_00_000Z,
      'ANPD communication and mitigation evidence closed.',
      'admin.local',
    ]);
    expect(closed.status).toBe('CLOSED');
    expect(closed.closedAt).toBe(TEST_INSTANT_2026_05_20_10_00_00_000Z);
  });

  it('keeps structured RCIS logs free of raw PII and incident narratives', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const query = jest
      .fn()
      .mockResolvedValueOnce([incidentRow()])
      .mockResolvedValueOnce([{ id: incidentId }])
      .mockResolvedValueOnce([
        incidentRow({
          status: 'TRIAGED',
          personal_data_confirmed_at: TEST_INSTANT_2026_05_01_10_00_00_000Z,
          anpd_due_at: TEST_INSTANT_2026_05_06_10_00_00_000Z,
          anpd_alert_at: TEST_INSTANT_2026_05_05_10_00_00_000Z,
          affected_data_nature: 'MIXED',
          affected_data_categories: ['CPF', 'bank_account'],
          risk_relevant: true,
          risk_assessment: 'John Doe CPF 123.456.789-00 bank account leaked',
          mitigation_measures: ['credential rotation'],
        }),
      ]);
    const service = new LgpdSecurityIncidentService({
      configured: true,
      query,
    } as never);

    await RequestContextStore.run({ tenantId }, () =>
      service.triage(incidentId, {
        riskRelevant: true,
        personalDataConfirmedAt: TEST_INSTANT_2026_05_01_10_00_00_000Z,
        affectedDataNature: 'MIXED',
        affectedDataCategories: ['CPF', 'bank_account'],
        affectedSubjectsEstimate: 42,
        severity: 'HIGH',
        riskAssessment: 'John Doe CPF 123.456.789-00 bank account leaked',
        mitigationMeasures: ['credential rotation'],
      }),
    );

    const serializedLogs = JSON.stringify(log.mock.calls);
    log.mockRestore();
    expect(serializedLogs).toContain('lgpd_rcis_security_incident');
    expect(serializedLogs).toContain('TRIAGED');
    expect(serializedLogs).not.toContain('John Doe');
    expect(serializedLogs).not.toContain('123.456.789-00');
    expect(serializedLogs).not.toContain('bank_account');
    expect(serializedLogs).not.toContain('credential rotation');
  });

  it('rejects out-of-order state transitions', async () => {
    const query = jest.fn().mockResolvedValueOnce([incidentRow()]);
    const service = new LgpdSecurityIncidentService({
      configured: true,
      query,
    } as never);

    await expect(
      RequestContextStore.run({ tenantId }, () =>
        service.report(incidentId, {
          reportedAt: TEST_INSTANT_2026_05_06_10_00_00_000Z,
          anpdProtocol: 'ANPD-2026-001',
          controllerContact: 'dpo@example.gov.br',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function incidentSourceRow() {
  return {
    ropa_entry_id: ropaEntryId,
    legal_basis_rule_id: legalBasisRuleId,
    flow_key: 'payroll.payslip_pdf',
  };
}

function incidentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: incidentId,
    tenant_id: tenantId,
    ropa_entry_id: ropaEntryId,
    legal_basis_rule_id: legalBasisRuleId,
    flow_key: 'payroll.payslip_pdf',
    status: 'DETECTED',
    severity: 'MEDIUM',
    summary: 'Security incident under investigation',
    detected_at: TEST_INSTANT_2026_05_01_09_00_00_000Z,
    personal_data_confirmed_at: null,
    anpd_due_at: null,
    anpd_alert_at: null,
    anpd_reported_at: null,
    complement_due_at: null,
    complemented_at: null,
    closed_at: null,
    affected_data_nature: null,
    affected_data_categories: [],
    affected_subjects_estimate: null,
    affected_children_estimate: null,
    affected_elderly_estimate: null,
    risk_relevant: false,
    risk_assessment: null,
    mitigation_measures: [],
    controller_contact: null,
    anpd_protocol: null,
    titular_communication_summary: null,
    complement_summary: null,
    closure_reason: null,
    created_by_ref: 'admin.local',
    triaged_by_ref: null,
    reported_by_ref: null,
    complemented_by_ref: null,
    closed_by_ref: null,
    created_at: TEST_INSTANT_2026_05_01_09_00_00_000Z,
    updated_at: TEST_INSTANT_2026_05_01_09_00_00_000Z,
    ropa_operation_name: 'Payroll payslip generation',
    legal_basis_data_category: 'MIXED',
    requires_dpia: true,
    sharing_scope: 'internal_employee_portal',
    ...overrides,
  };
}
