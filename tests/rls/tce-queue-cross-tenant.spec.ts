import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Tce Queue Cross Tenant',
  specFile: 'tests/rls/tce-queue-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'TCE-04 tenant-scoped queue RLS acceptance probe.',
    'Assertions:',
    '1. tce.submission_queue and tce.submission_attempt force-enable RLS.',
    '2. SELECT requires sgp_tenant_matches(tenant_id) and tce.submission.read or tce.submission.manage.',
    '3. INSERT/UPDATE/DELETE require sgp_tenant_matches(tenant_id) and tce.submission.manage.',
    '4. tce.adapter_circuit_state is global, readable by submission operators, and writable only with app.bypass_rls.',
    '5. Queue and attempt mutations append public.audit_event through sgp_append_audit_event(...).',
  ],
});
