import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Duty Roster Cross Tenant',
  specFile: 'tests/rls/duty-roster-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke through the PONTO-04 migration and RLS coverage check.',
    'Assertions:',
    '1. ponto.shift_pattern, ponto.shift_pattern_day, ponto.shift_assignment, ponto.duty_roster, and ponto.duty_roster_entry force RLS.',
    '2. Rows are visible only when sgp_tenant_matches(tenant_id) is true.',
    '3. Reads require ponto.roster.read or ponto.roster.write.',
    '4. Mutations require ponto.roster.write.',
    '5. Retroactive shift_assignment changes covered by LOCKED rosters are rejected.',
  ],
});
