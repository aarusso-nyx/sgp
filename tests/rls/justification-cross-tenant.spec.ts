import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Justification Cross Tenant',
  specFile: 'tests/rls/justification-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'PONTO-06 cross-tenant RLS contract.',
    '1. ponto.absence_justification and ponto.time_record_justification_link are tenant-scoped by tenant_id.',
    '2. Policies must use sgp_tenant_matches(tenant_id) and require one of:',
    'ponto.justification.read, ponto.justification.write, ponto.justification.approve.',
    '3. Mutations are audited by ponto06_audit_row through sgp_append_audit_event.',
    '4. Links only reference approved tenant-local justifications and tenant-local time_record rows.',
  ],
});
