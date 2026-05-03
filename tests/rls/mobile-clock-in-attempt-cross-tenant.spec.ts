import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Mobile Clock In Attempt Cross Tenant',
  specFile: 'tests/rls/mobile-clock-in-attempt-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'PONTO-09 RLS acceptance probe.',
    'Assertions:',
    '1. ponto.mobile_clock_in_attempt, ponto.mobile_device_registration, and ponto.mobile_geolocation_consent force RLS.',
    '2. Rows are visible only when sgp_tenant_matches(tenant_id) is true.',
    '3. Reads require ponto.mobile.read or ponto.mobile.write.',
    '4. Mutations require ponto.mobile.write.',
    '5. Mutations append public.audit_event through sgp_append_audit_event(...), without clear GPS coordinates in audit metadata.',
  ],
});
