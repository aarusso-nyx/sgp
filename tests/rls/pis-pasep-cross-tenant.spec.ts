import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Pis Pasep Cross Tenant',
  specFile: 'tests/rls/pis-pasep-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'CLT-03 RLS acceptance probe.',
    'Assertions:',
    '1. payment.pis_pasep_base_year is tenant-scoped through sgp_tenant_matches(tenant_id).',
    '2. SELECT requires payroll.payroll.read or payroll.payroll.write.',
    '3. INSERT/UPDATE/DELETE require payroll.payroll.read or payroll.payroll.write.',
    '4. Tenant B cannot observe or mutate tenant A annual PIS/PASEP bases.',
    '5. Mutations append public.audit_event through sgp_append_audit_event(...).',
  ],
});
