import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Payment Return Cross Tenant',
  specFile: 'tests/rls/payment-return-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'BANK-02 RLS acceptance probe.',
    'Assertions:',
    '1. payroll.payment_return_file and payroll.payment_return_detail force RLS.',
    '2. Policies use sgp_tenant_matches(tenant_id).',
    '3. Reads require payment.return.read or payment.return.write.',
    '4. Mutations require payment.return.write.',
    '5. Return detail mutations append public.audit_event through sgp_append_audit_event(...).',
  ],
});
