import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Reintegration Cross Tenant',
  specFile: 'tests/rls/reintegration-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'const maybeIt = databaseUrl ? it : it.skip',
    'const client = new Client({ connectionString: databaseUrl })',
    'await client.connect()',
    'try {',
    "await client.query('BEGIN')",
    "await client.query('SET LOCAL row_security = on')",
    'await client.query(',
    "\"SELECT set_config('app.current_tenant_id', '00000000-0000-0000-0000-000000077011', true)\"",
    "\"SELECT set_config('app.current_permissions', 'esocial.event.read', true)\"",
    "await client.query(\"SELECT set_config('app.authenticated', 'true', true)\")",
    'const result = await client.query<{ count: string }>(',
    'SELECT count(*)::text',
  ],
});
