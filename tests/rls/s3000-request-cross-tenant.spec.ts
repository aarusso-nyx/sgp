import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'S3000 Request Cross Tenant',
  specFile: 'tests/rls/s3000-request-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke in 99-es06-s3000.sql.',
    'Assertions:',
    '1. esocial.s3000_request forces RLS.',
    '2. Select/write policies use sgp_tenant_matches(tenant_id).',
    '3. Mutations require esocial.event.exclude.',
    '4. Tenant B cannot see tenant A S-3000 requests.',
  ],
});
