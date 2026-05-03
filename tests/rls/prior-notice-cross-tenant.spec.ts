import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Prior Notice Cross Tenant',
  specFile: 'tests/rls/prior-notice-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'CLT-02 RLS acceptance probe.',
    'Assertions:',
    '1. payment.prior_notice is tenant-scoped through sgp_tenant_matches(tenant_id).',
    '2. SELECT requires payroll.run.read or payroll.run.write.',
    '3. INSERT/UPDATE/DELETE require payroll.run.write.',
    '4. Tenant B cannot observe or mutate tenant A prior notice records.',
    '5. Mutations append public.audit_event through sgp_append_audit_event(...).',
  ],
});
