import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Gps Cross Tenant',
  specFile: 'tests/rls/gps-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'FISC-04 GPS residual RLS assertions.',
    'fiscal.gps_remittance forces RLS and uses sgp_tenant_matches(tenant_id).',
    'Reads require fiscal.gps.read or fiscal.gps.write.',
    'Mutations require fiscal.gps.write and append audit_event through sgp_append_audit_event(...).',
    'fiscal.assert_no_dctfweb_for_competence blocks GPS when DCTFWeb is TRANSMITTED or ACCEPTED.',
  ],
});
