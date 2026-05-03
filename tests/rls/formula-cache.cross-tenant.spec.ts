import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Formula Cache Cross Tenant',
  specFile: 'tests/rls/formula-cache.cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke in 99-xcut03-rls-hardening.sql.',
    'Assertions:',
    '1. tenant B SELECT on tenant A payroll_calc.formula_cache compiled rows returns 0 rows.',
    '2. payroll_calc.formula_cache policies require payroll.formula.read or',
    'payroll.formula.write in addition to tenant context.',
  ],
});
