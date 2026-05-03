import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Aso Cross Tenant',
  specFile: 'tests/rls/aso-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by SST-01 database smoke and migration review.',
    'Assertions:',
    'tenant A can create ASO records with saude.aso.write.',
    'tenant B SELECT on tenant A saude.aso_record, aso_exam_item, and aso_attachment returns 0 rows.',
    'ASO RLS policies use sgp_tenant_matches(tenant_id) and sgp_has_any_permission(...).',
  ],
});
