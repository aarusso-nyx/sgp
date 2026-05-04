import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

type RlsSmokeSpec = {
  assertionSummary: string[];
  directRlsAssertions?: RlsDirectAssertion[];
  specFile: string;
  tenantAInsertEvidence: string[];
  tenantBZeroRowEvidence: string[];
  title: string;
};

type RlsDirectAssertion = {
  evidence?: string[];
  table: string;
};

const workspaceRoot = resolve(__dirname, '../../..');
const qualifiedIdentifierPattern = /\b[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\b/g;

function readDbSmokeScript(): string {
  return readFileSync(resolve(workspaceRoot, 'scripts/lib/db/bootstrap-smoke.mjs'), 'utf8');
}

function readCanonicalDatabaseSql(): string {
  const sqlDir = resolve(workspaceRoot, 'database/sql');
  return readdirSync(sqlDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort()
    .map((fileName) => readFileSync(resolve(sqlDir, fileName), 'utf8'))
    .join('\n');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function declaredRlsTables(sql: string): Set<string> {
  const tables = new Set<string>();
  const tablePattern =
    /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z][a-z0-9_]*\.[a-z][a-z0-9_]*)\b/gi;
  for (const match of sql.matchAll(tablePattern)) {
    tables.add(match[1]);
  }
  return tables;
}

function tableHasDirectRlsEvidence(sql: string, table: string): boolean {
  const escapedTable = escapeRegExp(table);
  const alterTableRlsPattern = new RegExp(
    `\\bALTER\\s+TABLE\\s+(?:ONLY\\s+)?${escapedTable}\\s+(?:ENABLE|FORCE)\\s+ROW\\s+LEVEL\\s+SECURITY\\b`,
    'i',
  );
  const createPolicyPattern = new RegExp(
    `\\bCREATE\\s+POLICY\\s+[^;]+\\s+ON\\s+${escapedTable}\\b`,
    'i',
  );

  return alterTableRlsPattern.test(sql) || createPolicyPattern.test(sql);
}

function directRlsAssertionsFor(spec: RlsSmokeSpec, sql: string): RlsDirectAssertion[] {
  if (spec.directRlsAssertions) {
    return spec.directRlsAssertions;
  }

  const declaredTables = declaredRlsTables(sql);
  const assertedTables = new Set<string>();
  const summary = spec.assertionSummary.join('\n');
  for (const match of summary.matchAll(qualifiedIdentifierPattern)) {
    const table = match[0];
    if (declaredTables.has(table)) {
      assertedTables.add(table);
    }
  }

  return [...assertedTables].sort().map((table) => ({ table }));
}

export function describeRlsSmokeSpec(spec: RlsSmokeSpec): void {
  describe(`${spec.title} RLS executable spec`, () => {
    const canonicalDatabaseSql = readCanonicalDatabaseSql();
    const directAssertions = directRlsAssertionsFor(spec, canonicalDatabaseSql);

    it('is anchored to an executable tenant-A insert smoke path', () => {
      const smoke = readDbSmokeScript();

      expect(spec.specFile).toMatch(/^tests\/rls\/.+\.spec\.ts$/);
      expect(smoke).toContain('tenant_a constant uuid');
      expect(smoke).toContain('SET LOCAL ROLE sgp_smoke_rls');
      for (const evidence of spec.tenantAInsertEvidence) {
        expect(smoke).toContain(evidence);
      }
    });

    it('is anchored to an executable tenant-B zero-row SELECT assertion', () => {
      const smoke = readDbSmokeScript();

      expect(smoke).toContain('tenant_b constant uuid');
      expect(smoke).toContain('SELECT count(*) INTO visible_count');
      for (const evidence of spec.tenantBZeroRowEvidence) {
        expect(smoke).toContain(evidence);
      }
    });

    it('preserves the promoted RLS acceptance assertions', () => {
      expect(spec.assertionSummary.length).toBeGreaterThanOrEqual(1);
      expect(spec.assertionSummary.join('\n')).toMatch(
        /tenant|RLS|sgp_tenant_matches|restricted|sgp_current_employee/i,
      );
    });

    it('declares table-specific direct RLS assertions', () => {
      expect(directAssertions.map((assertion) => assertion.table)).toEqual(
        expect.arrayContaining([expect.stringMatching(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/)]),
      );
    });

    for (const assertion of directAssertions) {
      it(`${assertion.table} has direct RLS policy evidence`, () => {
        expect(canonicalDatabaseSql).toContain(assertion.table);
        expect(tableHasDirectRlsEvidence(canonicalDatabaseSql, assertion.table)).toBe(true);
        for (const evidence of assertion.evidence ?? []) {
          expect(canonicalDatabaseSql).toContain(evidence);
        }
      });
    }
  });
}
