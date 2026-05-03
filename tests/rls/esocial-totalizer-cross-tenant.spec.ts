import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Esocial Totalizer Cross Tenant',
  specFile: 'tests/rls/esocial-totalizer-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'ES-05 RLS acceptance probe.',
    'Assertions:',
    '1. esocial.esocial_totalizer forces RLS.',
    '2. Policies use sgp_tenant_matches(tenant_id) and require',
    'esocial.event.read or esocial.event.write for reads.',
    '3. Mutations require esocial.event.write and reject cross-tenant rows.',
    '4. Mutations append public.audit_event through sgp_append_audit_event(...).',
    '5. esocial.v_competence_periodics_pending is the S-1299 hard guard for',
    'missing S-1200/S-1210 receipts.',
  ],
});
