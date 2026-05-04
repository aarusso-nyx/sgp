import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { cleanupFixture, makeFixture, runAuditCommand } from './audit-test-helpers';

describe('audit-idempotency-coverage', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('reports full payroll idempotency adoption when required evidence is present', async () => {
    fixtureRoot = await makeFixture('audit-hotspots');
    await writeIdempotencyFixture(fixtureRoot, true);

    const result = await runAuditCommand('idempotency', fixtureRoot, ['--json']);
    const report = JSON.parse(result.stdout) as {
      coveragePercent: number;
      missing: unknown[];
    };

    expect(report.coveragePercent).toBe(100);
    expect(report.missing).toEqual([]);
  });

  it('fails when a required mutating surface lacks idempotency evidence', async () => {
    fixtureRoot = await makeFixture('audit-hotspots');
    await writeIdempotencyFixture(fixtureRoot, false);

    await expect(runAuditCommand('idempotency', fixtureRoot, ['--json'])).rejects.toMatchObject({
      code: 1,
    });
  });
});

async function writeIdempotencyFixture(
  root: string,
  includeMonthlyConflictHelper: boolean,
): Promise<void> {
  const entries: Array<[string, string]> = [
    [
      'backend/src/folha-pagamento/payroll/payroll.service.ts',
      includeMonthlyConflictHelper ? 'isActivePayrollItemIdempotencyConflict' : 'missing helper',
    ],
    ['tests/backend/calc-reprocessamento.e2e-spec.ts', 'idempotency'],
    [
      'tests/backend/calc-reprocessamento-concorrente.e2e-spec.ts',
      'employee_payroll_item_active_idempotency_uq',
    ],
    [
      'backend/src/folha-pagamento/payroll/decimo-terceiro.service.ts',
      'isActivePayrollItemIdempotencyConflict',
    ],
    ['backend/src/folha-pagamento/payroll/decimo-terceiro.spec.ts', 'decimo terceiro'],
    [
      'backend/src/folha-pagamento/payroll/ferias-payroll.service.ts',
      'isActivePayrollItemIdempotencyConflict',
    ],
    ['tests/backend/calc-ferias.e2e-spec.ts', 'ferias'],
    [
      'backend/src/folha-pagamento/rescisao/rescisao.service.ts',
      'isActivePayrollItemIdempotencyConflict',
    ],
    [
      'backend/src/folha-pagamento/rescisao/rescisao.service.spec.ts',
      'employee_payroll_item_active_idempotency_uq',
    ],
    [
      'backend/src/folha-pagamento/import/manual-entry-import.service.ts',
      'idempotencyKey\nON CONFLICT (idempotency_key)',
    ],
    ['backend/src/folha-pagamento/import/manual-entry-import.service.spec.ts', 'idempotencyKey'],
    [
      'backend/src/folha-pagamento/import/servidor-import.service.ts',
      'idempotencyKey\nON CONFLICT (idempotency_key)',
    ],
    [
      'backend/src/folha-pagamento/import/servidor-import.service.spec.ts',
      'ON CONFLICT (idempotency_key)',
    ],
    [
      'backend/src/folha-pagamento/import/pensionista-import.service.ts',
      'IdempotencyKey\nON CONFLICT (idempotency_key)',
    ],
    [
      'backend/src/folha-pagamento/import/pensionista-import.service.spec.ts',
      'ON CONFLICT (idempotency_key)',
    ],
    [
      'backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts',
      'ON CONFLICT (idempotency_key)\nreprocessRetroactivePayroll',
    ],
    ['tests/backend/reintegracao-retroativa-6m.e2e-spec.ts', 'idempotently'],
    [
      'tests/backend/folha-complementar-idempotency.e2e-spec.ts',
      'ON CONFLICT (idempotency_key)\nidempotency_key',
    ],
  ];

  await Promise.all(
    entries.map(async ([relativePath, content]) => {
      const path = join(root, relativePath);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, 'utf8');
    }),
  );
}
