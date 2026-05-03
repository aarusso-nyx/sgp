import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Employee Biometric Template Cross Tenant',
  specFile: 'tests/rls/employee-biometric-template-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'PONTO-08 RLS acceptance probe.',
    'Assertions:',
    '1. ponto.employee_biometric_template, ponto.biometric_consent, and ponto.biometric_match force RLS.',
    '2. Rows are visible only when sgp_tenant_matches(tenant_id) is true.',
    '3. Reads require ponto.biometric.read or ponto.biometric.write.',
    '4. Mutations require ponto.biometric.write.',
    '5. Mutations append public.audit_event through sgp_append_audit_event(...), with metadata excluding template_cipher and clear biometric samples.',
  ],
});
