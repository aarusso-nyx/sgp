import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { cleanupFixture, makeFixture, runAuditCommand } from './audit-test-helpers';

describe('audit-rls-spec-coverage', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('reports full effective coverage when cross-tenant specs, self-only specs, and exceptions are documented', async () => {
    fixtureRoot = await makeFixture('audit-hotspots');
    await writeCoverageFixture(fixtureRoot, {
      crossTenantTables: ['hr.employee', 'public.access_profile', 'saude.aso_record'],
      selfOnlyTables: ['saude.aso_record'],
    });

    const result = await runAuditCommand('rls-spec-coverage', fixtureRoot, ['--json']);
    const report = JSON.parse(result.stdout) as {
      coveragePercent: number;
      exceptions: { selfOnly: Array<{ table: string }> };
      missing: { crossTenant: string[]; selfOnly: string[] };
      totals: { documentedSelfOnlyExceptions: number; selfOnlyRequired: number };
    };

    expect(report.coveragePercent).toBe(100);
    expect(report.missing.crossTenant).toEqual([]);
    expect(report.missing.selfOnly).toEqual([]);
    expect(report.totals.selfOnlyRequired).toBe(1);
    expect(report.totals.documentedSelfOnlyExceptions).toBe(2);
    expect(report.exceptions.selfOnly.map((entry) => entry.table)).toEqual([
      'hr.employee',
      'public.access_profile',
    ]);
  });

  it('fails when an RLS table lacks cross-tenant spec coverage', async () => {
    fixtureRoot = await makeFixture('audit-hotspots');
    await writeCoverageFixture(fixtureRoot, {
      crossTenantTables: ['saude.aso_record'],
      selfOnlyTables: ['saude.aso_record'],
    });

    await expect(
      runAuditCommand('rls-spec-coverage', fixtureRoot, ['--json']),
    ).rejects.toMatchObject({
      code: 1,
    });
  });

  it('fails when a self-scoped RLS policy lacks self-only spec coverage', async () => {
    fixtureRoot = await makeFixture('audit-hotspots');
    await writeCoverageFixture(fixtureRoot, {
      crossTenantTables: ['hr.employee', 'public.access_profile', 'saude.aso_record'],
      selfOnlyTables: [],
    });

    await expect(
      runAuditCommand('rls-spec-coverage', fixtureRoot, ['--json']),
    ).rejects.toMatchObject({
      code: 1,
    });
  });
});

async function writeCoverageFixture(
  root: string,
  options: {
    crossTenantTables: string[];
    selfOnlyTables: string[];
  },
): Promise<void> {
  await writeJson(join(root, 'docs/gov/audit/inv/round-7/schema-digest.json'), {
    counts: {
      rls_tables: 3,
      tables: 3,
    },
    rls: {
      enabled_tables: ['hr.employee', 'public.access_profile', 'saude.aso_record'],
      policies: [
        {
          body: 'FOR SELECT USING (public.sgp_tenant_matches(tenant_id))',
          name: 'employee_select',
          table: 'hr.employee',
        },
        {
          body: "FOR SELECT USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['profile.read'::text]))",
          name: 'access_profile_select',
          table: 'public.access_profile',
        },
        {
          body: "FOR SELECT USING (public.sgp_tenant_matches(tenant_id) AND (public.sgp_has_any_permission(ARRAY['saude.aso.read'::text]) OR (public.sgp_has_any_permission(ARRAY['saude.aso.self_read'::text]) AND employee_id = public.sgp_current_employee_id())))",
          name: 'aso_record_select',
          table: 'saude.aso_record',
        },
      ],
    },
  });

  if (options.crossTenantTables.length > 0) {
    await writeText(
      join(root, 'tests/rls/fixture-cross-tenant.spec.ts'),
      rlsSpec('Fixture Cross Tenant', 'tests/rls/fixture-cross-tenant.spec.ts', [
        'Cross-tenant tenant B zero-row assertions.',
        ...options.crossTenantTables.map((table) => `${table} returns 0 rows for tenant B.`),
      ]),
    );
  }

  if (options.selfOnlyTables.length > 0) {
    await writeText(
      join(root, 'tests/rls/fixture-self-only.spec.ts'),
      rlsSpec('Fixture Self Only', 'tests/rls/fixture-self-only.spec.ts', [
        'Self-only portal assertions.',
        ...options.selfOnlyTables.map(
          (table) => `${table} self_read can see only rows for sgp_current_employee_id().`,
        ),
      ]),
    );
  }
}

function rlsSpec(title: string, specFile: string, assertionSummary: string[]): string {
  const summary = assertionSummary.map((line) => `    ${JSON.stringify(line)},`).join('\n');
  return [
    "import { describeRlsSmokeSpec } from './support/rls-spec-helpers';",
    '',
    'describeRlsSmokeSpec({',
    `  title: ${JSON.stringify(title)},`,
    `  specFile: ${JSON.stringify(specFile)},`,
    "  tenantAInsertEvidence: ['INSERT INTO '],",
    "  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],",
    '  assertionSummary: [',
    summary,
    '  ],',
    '});',
    '',
  ].join('\n');
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeText(path, JSON.stringify(value, null, 2));
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}
