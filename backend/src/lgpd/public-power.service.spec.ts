import { RequestContextStore } from '../common/request-context/request-context.store';
import { LgpdPublicPowerTreatmentService } from './public-power.service';

const tenantId = '00000000-0000-0000-0000-000000000100';
const treatmentId = '00000000-0000-4000-8000-000000000331';
const ropaEntryId = '00000000-0000-4000-8000-000000000239';
const legalBasisRuleId = '00000000-0000-4000-8000-000000000240';

describe('LgpdPublicPowerTreatmentService', () => {
  it('lists public-power treatment records joined to ROPA and legal basis', async () => {
    const query = jest.fn().mockResolvedValueOnce([treatmentRow()]);
    const service = new LgpdPublicPowerTreatmentService({
      configured: true,
      query,
    } as never);

    const result = await service.list({
      flowKey: 'transparency.remuneration_publication',
      status: 'REGISTERED',
    });

    expect(query.mock.calls[0][0]).toContain('lgpd.public_power_treatment');
    expect(query.mock.calls[0][0]).toContain('lgpd.legal_basis_rule');
    expect(query.mock.calls[0][1]).toEqual([
      'REGISTERED',
      'transparency.remuneration_publication',
    ]);
    expect(result.items[0]).toMatchObject({
      id: treatmentId,
      flowKey: 'transparency.remuneration_publication',
      purpose: 'Publish minimized remuneration transparency data.',
      legalBasisReference: 'LGPD art. 7, III',
      responsibleArea: 'Transparency Office',
      legalBasis: {
        legalBasisCode: 'LGPD_ART_7_III',
      },
    });
  });

  it('creates a record from an active ROPA entry and defaults legal evidence from the source', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([sourceRow()])
      .mockResolvedValueOnce([{ id: treatmentId }])
      .mockResolvedValueOnce([treatmentRow()]);
    const service = new LgpdPublicPowerTreatmentService({
      configured: true,
      query,
    } as never);

    const created = await RequestContextStore.run(
      {
        tenantId,
        actor: { sub: 'user-1', username: 'lgpd.operator' } as never,
      },
      () =>
        service.create({
          flowKey: 'transparency.remuneration_publication',
          evidenceRefs: ['Publication policy 2026'],
        }),
    );

    expect(query.mock.calls[0][0]).toContain('FROM lgpd.ropa_entry');
    expect(query.mock.calls[1][0]).toContain(
      'INSERT INTO lgpd.public_power_treatment',
    );
    expect(query.mock.calls[1][1]).toEqual([
      ropaEntryId,
      legalBasisRuleId,
      'transparency.remuneration_publication',
      'Publish minimized remuneration transparency data.',
      'LGPD art. 7, III - public administration/public policy processing',
      'Transparency Office',
      ['Publication policy 2026'],
      'REGISTERED',
      null,
      'lgpd.operator',
    ]);
    expect(created.id).toBe(treatmentId);
  });

  it('patches mutable workflow fields and stamps the updater reference', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ id: treatmentId }])
      .mockResolvedValueOnce([
        treatmentRow({
          status: 'UNDER_REVIEW',
          notes: 'Annual owner review started.',
          updated_by_ref: 'reviewer',
        }),
      ]);
    const service = new LgpdPublicPowerTreatmentService({
      configured: true,
      query,
    } as never);

    const updated = await RequestContextStore.run(
      { tenantId, actor: { sub: 'user-2', username: 'reviewer' } as never },
      () =>
        service.update(treatmentId, {
          status: 'UNDER_REVIEW',
          notes: ' Annual owner review started. ',
        }),
    );

    expect(query.mock.calls[0][0]).toContain(
      'UPDATE lgpd.public_power_treatment',
    );
    expect(query.mock.calls[0][1]).toEqual([
      'UNDER_REVIEW',
      'Annual owner review started.',
      'reviewer',
      treatmentId,
    ]);
    expect(updated.status).toBe('UNDER_REVIEW');
    expect(updated.updatedByRef).toBe('reviewer');
  });
});

function sourceRow() {
  return {
    ropa_entry_id: ropaEntryId,
    legal_basis_rule_id: legalBasisRuleId,
    flow_key: 'transparency.remuneration_publication',
    controller_area: 'Transparency Office',
    purpose: 'Publish minimized remuneration transparency data.',
    legal_basis_article:
      'LGPD art. 7, III - public administration/public policy processing',
    legal_basis_code: 'LGPD_ART_7_III',
    sensitive_basis_article: null,
    sensitive_basis_code: null,
    decision_record_anchor: 'ADR-LGPD-009',
    retention_rule: 'Retain publication evidence under LAI/LRF periods.',
    sharing_scope: 'public_minimized',
  };
}

function treatmentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: treatmentId,
    tenant_id: tenantId,
    ropa_entry_id: ropaEntryId,
    legal_basis_rule_id: legalBasisRuleId,
    flow_key: 'transparency.remuneration_publication',
    purpose: 'Publish minimized remuneration transparency data.',
    legal_basis_reference: 'LGPD art. 7, III',
    responsible_area: 'Transparency Office',
    evidence_refs: ['ADR-LGPD-009'],
    status: 'REGISTERED',
    notes: null,
    created_by_ref: 'lgpd.operator',
    updated_by_ref: 'lgpd.operator',
    created_at: '2026-05-03T12:00:00.000Z',
    updated_at: '2026-05-03T12:00:00.000Z',
    legal_basis_code: 'LGPD_ART_7_III',
    legal_basis_article:
      'LGPD art. 7, III - public administration/public policy processing',
    sensitive_basis_code: null,
    sensitive_basis_article: null,
    decision_record_anchor: 'ADR-LGPD-009',
    retention_rule: 'Retain publication evidence under LAI/LRF periods.',
    sharing_scope: 'public_minimized',
    ropa_operation_name: 'Active remuneration transparency publication',
    ...overrides,
  };
}
