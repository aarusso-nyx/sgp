import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Rep Device Cross Tenant',
  specFile: 'tests/rls/rep-device-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke through the PONTO-02 migration and RLS coverage check.',
    'Assertions:',
    '1. ponto.rep_device, ponto.rep_ingestion_batch, and ponto.rep_ingestion_line force RLS.',
    '2. Rows are visible only when sgp_tenant_matches(tenant_id) is true.',
    '3. Reads require ponto.rep.read, ponto.rep.write, or ponto.timerecord.write.',
    '4. Mutations require ponto.rep.write and, for ingestion tables, ponto.timerecord.write is accepted for the time-record injection path.',
  ],
});
