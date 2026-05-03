import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Career Plan Cross Tenant',
  specFile: 'tests/rls/career-plan.cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke and the FOL-04 migration assertions.',
    'Assertions:',
    '1. avaliacao.career_plan and avaliacao.career_plan_job_position use',
    'sgp_tenant_matches(tenant_id) plus avaliacao.pccs.read/write policies.',
    '2. tenant B cannot read tenant A PCCS plans or job-position links.',
    '3. tenant B cannot insert PCCS links for tenant A because WITH CHECK repeats',
    'the same tenant and avaliacao.pccs.write predicate.',
  ],
});
