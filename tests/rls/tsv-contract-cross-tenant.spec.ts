import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Tsv Contract Cross Tenant',
  specFile: 'tests/rls/tsv-contract-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke after stynx-esocial lift-out.',
    'Assertions:',
    '1. tenant A can read and mutate its own hr.tsv_contract and hr.tsv_contract_change rows',
    'with hr.employment.write.',
    '2. tenant B cannot read tenant A TS-V contracts because RLS uses',
    'sgp_tenant_matches(tenant_id).',
    '3. S-2306 requests leave SGP through public.esocial_events and stynx-esocial.',
  ],
});
