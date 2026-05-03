import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Esocial Event Cross Tenant',
  specFile: 'tests/rls/esocial-event-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke in 99-es01-tabelas-s1xxx.sql.',
    'Assertions:',
    '1. public.esocial_event and esocial.s1xxx_dispatch_state force RLS.',
    '2. Policies use sgp_tenant_matches(tenant_id) and require',
    'esocial.event.read or esocial.event.write for reads.',
    '3. Mutations require esocial.event.write and hide tenant A rows from tenant B.',
  ],
});
