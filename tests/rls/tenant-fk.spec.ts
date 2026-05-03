import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Tenant Fk',
  specFile: 'tests/rls/tenant-fk.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke in 99-xcut03-rls-hardening.sql.',
    'Assertion:',
    'INSERT into tenant-scoped hr.employee_dependent with',
    '00000000-0000-0000-0000-000000000000 fails with foreign_key_violation.',
  ],
});
