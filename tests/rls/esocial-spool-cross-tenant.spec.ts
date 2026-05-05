import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Esocial Spool Cross Tenant',
  specFile: 'tests/rls/esocial-spool-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'R6-06 canonical SGP-side eSocial spool RLS acceptance probe.',
    '1. public.esocial_spool forces RLS and filters rows with sgp_tenant_matches(tenant_id).',
    '2. Reads require esocial.event.read or esocial.event.write.',
    '3. Mutations require esocial.event.write and never cross into stynx-esocial DB objects.',
  ],
});
