import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Job Position Cross Tenant',
  specFile: 'tests/rls/job-position.cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke and the FOL-02 migration assertions.',
    'Assertions:',
    '1. hr.job_position, hr.salary_range, and hr.salary_range_level use',
    'sgp_tenant_matches(tenant_id) plus gestao.cargo.read/write policies.',
    '2. tenant B cannot read tenant A job positions or salary range levels.',
    '3. tenant B cannot insert class/level rows for tenant A because WITH CHECK',
    'repeats the same tenant and gestao.cargo.write predicate.',
  ],
});
