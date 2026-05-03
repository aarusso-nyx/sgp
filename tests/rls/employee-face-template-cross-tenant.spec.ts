import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Employee Face Template Cross Tenant',
  specFile: 'tests/rls/employee-face-template-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'PONTO-10 RLS acceptance probe.',
    'Assertions:',
    '1. ponto.employee_face_template, ponto.face_match, ponto.face_threshold_config, and ponto.face_consent force RLS.',
    '2. Rows are visible only when sgp_tenant_matches(tenant_id) is true.',
    '3. Reads require ponto.face.read or ponto.face.write.',
    '4. Mutations require ponto.face.write.',
    '5. Mutations append public.audit_event through sgp_append_audit_event(...), without clear face images or embeddings.',
  ],
});
