#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

import { createContext, exists, markdownTable, readText, writeText } from '../audit-utils.mjs';

const usage = `
Usage: node scripts/audit.mjs idempotency [--round <n>] [--json] [--dry-run] [--output-root <path>] [--repo-root <path>]

Report folha-pagamento idempotency helper/adoption coverage.
`;

const REQUIRED_SURFACES = [
  {
    id: 'monthly-payroll',
    area: 'Folha mensal',
    files: [
      {
        path: 'backend/src/folha-pagamento/payroll/payroll.service.ts',
        contains: ['isActivePayrollItemIdempotencyConflict'],
      },
      {
        path: 'tests/backend/calc-reprocessamento.e2e-spec.ts',
        contains: ['idempotency'],
      },
      {
        path: 'tests/backend/calc-reprocessamento-concorrente.e2e-spec.ts',
        contains: ['employee_payroll_item_active_idempotency_uq'],
      },
    ],
  },
  {
    id: 'decimo-terceiro',
    area: '13 salario',
    files: [
      {
        path: 'backend/src/folha-pagamento/payroll/decimo-terceiro.service.ts',
        contains: ['isActivePayrollItemIdempotencyConflict'],
      },
      {
        path: 'backend/src/folha-pagamento/payroll/decimo-terceiro.spec.ts',
        contains: ['decimo terceiro'],
      },
    ],
  },
  {
    id: 'ferias',
    area: 'Ferias',
    files: [
      {
        path: 'backend/src/folha-pagamento/payroll/ferias-payroll.service.ts',
        contains: ['isActivePayrollItemIdempotencyConflict'],
      },
      {
        path: 'tests/backend/calc-ferias.e2e-spec.ts',
        contains: ['ferias'],
      },
    ],
  },
  {
    id: 'rescisao',
    area: 'Rescisao',
    files: [
      {
        path: 'backend/src/folha-pagamento/rescisao/rescisao.service.ts',
        contains: ['isActivePayrollItemIdempotencyConflict'],
      },
      {
        path: 'backend/src/folha-pagamento/rescisao/rescisao.service.spec.ts',
        contains: ['employee_payroll_item_active_idempotency_uq'],
      },
    ],
  },
  {
    id: 'manual-entry-import',
    area: 'Importador manual',
    files: [
      {
        path: 'backend/src/folha-pagamento/import/manual-entry-import.service.ts',
        contains: ['idempotencyKey', 'ON CONFLICT (idempotency_key)'],
      },
      {
        path: 'backend/src/folha-pagamento/import/manual-entry-import.service.spec.ts',
        contains: ['idempotencyKey'],
      },
    ],
  },
  {
    id: 'servidor-import',
    area: 'Importador servidor',
    files: [
      {
        path: 'backend/src/folha-pagamento/import/servidor-import.service.ts',
        contains: ['idempotencyKey', 'ON CONFLICT (idempotency_key)'],
      },
      {
        path: 'backend/src/folha-pagamento/import/servidor-import.service.spec.ts',
        contains: ['ON CONFLICT (idempotency_key)'],
      },
    ],
  },
  {
    id: 'pensionista-import',
    area: 'Importador pensionista',
    files: [
      {
        path: 'backend/src/folha-pagamento/import/pensionista-import.service.ts',
        contains: ['IdempotencyKey', 'ON CONFLICT (idempotency_key)'],
      },
      {
        path: 'backend/src/folha-pagamento/import/pensionista-import.service.spec.ts',
        contains: ['ON CONFLICT (idempotency_key)'],
      },
    ],
  },
  {
    id: 'retro-processing',
    area: 'Reintegracao retroativa',
    files: [
      {
        path: 'backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts',
        contains: ['ON CONFLICT (idempotency_key)', 'reprocessRetroactivePayroll'],
      },
      {
        path: 'tests/backend/reintegracao-retroativa-6m.e2e-spec.ts',
        contains: ['idempotently'],
      },
    ],
  },
  {
    id: 'complementary-payroll',
    area: 'Folha complementar',
    files: [
      {
        path: 'tests/backend/folha-complementar-idempotency.e2e-spec.ts',
        contains: ['ON CONFLICT (idempotency_key)', 'idempotency_key'],
      },
    ],
  },
];

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const context = await createContext(process.argv.slice(2), usage);
  const report = await buildIdempotencyCoverage(context.repoRoot, context.round);

  if (context.options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    await writeText(
      join(context.auditRoot, 'diag', `round-${context.round}`, 'idempotency-coverage.md'),
      renderMarkdown(report),
      {
        dryRun: context.dryRun,
        repoRoot: context.repoRoot,
      },
    );
    console.log(
      `[audit-idempotency] ${report.covered}/${report.total} surfaces covered (${report.coveragePercent}%)`,
    );
  }

  process.exitCode = report.missing.length === 0 ? 0 : 1;
}

export async function buildIdempotencyCoverage(repoRoot, round = '0') {
  const rows = await Promise.all(
    REQUIRED_SURFACES.map((surface) => evaluateSurface(repoRoot, surface)),
  );
  const covered = rows.filter((row) => row.status === 'covered').length;
  const total = rows.length;

  return {
    generated_by: 'scripts/audit.mjs idempotency',
    round: String(round),
    total,
    covered,
    coveragePercent: Number(((covered / total) * 100).toFixed(2)),
    exceptions: [],
    rows,
    missing: rows.filter((row) => row.status !== 'covered'),
  };
}

async function evaluateSurface(repoRoot, surface) {
  const evidence = [];
  for (const file of surface.files) {
    const path = join(repoRoot, file.path);
    if (!(await exists(path))) {
      evidence.push({
        path: file.path,
        status: 'missing-file',
        missingTerms: file.contains,
      });
      continue;
    }

    const text = await readText(path);
    const missingTerms = file.contains.filter((term) => !text.includes(term));
    evidence.push({
      path: file.path,
      status: missingTerms.length === 0 ? 'covered' : 'missing-terms',
      missingTerms,
    });
  }

  return {
    id: surface.id,
    area: surface.area,
    status: evidence.every((item) => item.status === 'covered') ? 'covered' : 'gap',
    evidence,
  };
}

function renderMarkdown(report) {
  return [
    '# Idempotency Coverage',
    '',
    `Round: ${report.round}`,
    `Coverage: ${report.covered}/${report.total} (${report.coveragePercent}%)`,
    '',
    markdownTable(
      ['Surface', 'Area', 'Status', 'Evidence'],
      report.rows.map((row) => [
        row.id,
        row.area,
        row.status,
        row.evidence.map((item) => `${item.path}:${item.status}`).join('<br>'),
      ]),
    ),
  ].join('\n');
}
