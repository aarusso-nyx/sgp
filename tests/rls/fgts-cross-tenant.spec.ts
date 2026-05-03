import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Fgts Cross Tenant',
  specFile: 'tests/rls/fgts-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'CLT-01 RLS acceptance probe.',
    'Assertions:',
    '1. payment.fgts_account and payment.fgts_movement are tenant-scoped through sgp_tenant_matches(tenant_id).',
    '2. SELECT requires payroll.fgts.read or payroll.fgts.write.',
    '3. INSERT/UPDATE/DELETE require payroll.fgts.write.',
    '4. Tenant B cannot observe or mutate tenant A FGTS accounts or movements.',
    '5. Mutations append public.audit_event through sgp_append_audit_event(...).',
  ],
});
