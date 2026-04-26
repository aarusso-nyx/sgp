#!/usr/bin/env node

import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const cwd = process.cwd();
const databaseUrl = process.env.DATABASE_URL;
const sqlDir = resolve(cwd, 'database/sql');
const backendDir = resolve(cwd, 'backend');
const prismaSchemaPath = resolve(cwd, 'backend/prisma/schema.prisma');
const optionalSqlFiles = new Set(['40-seed-loader.sql']);

class ConfigurationBlockedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationBlockedError';
  }
}

function requireDatabaseUrl() {
  if (!databaseUrl) {
    throw new ConfigurationBlockedError(
      'DATABASE_URL is not set; database bootstrap smoke was not executed and cannot be used as DB correctness evidence.',
    );
  }
}

function runCommand(command, args, workdir = cwd) {
  const result = spawnSync(command, args, {
    cwd: workdir,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 1}`);
  }
}

function runPrismaDbExecute(filePath) {
  runCommand('npm', ['exec', '--', 'prisma', 'db', 'execute', '--file', filePath], backendDir);
}

async function runSqlSnippet(fileName, sql) {
  const tempDir = await mkdtemp(resolve(tmpdir(), 'sgp-db-smoke-'));
  const filePath = resolve(tempDir, fileName);
  await writeFile(filePath, sql, 'utf8');
  try {
    runPrismaDbExecute(filePath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function applySupportSql() {
  const sqlFiles = (await readdir(sqlDir))
    .filter((name) => name.endsWith('.sql'))
    .filter((name) => !optionalSqlFiles.has(name))
    .sort((a, b) => a.localeCompare(b));

  if (sqlFiles.length === 0) {
    throw new Error('No SQL support files found for bootstrap smoke validation.');
  }

  for (const fileName of sqlFiles) {
    const filePath = resolve(sqlDir, fileName);
    runPrismaDbExecute(filePath);
    console.log(`[db-smoke] applied ${fileName}`);
  }
}

async function main() {
  requireDatabaseUrl();

  console.log('[db-smoke] running prisma migrations');
  runCommand(
    'npm',
    ['exec', '--', 'prisma', 'migrate', 'deploy', '--schema', prismaSchemaPath],
    backendDir,
  );

  await runSqlSnippet(
    '00-create-portal-role.sql',
    `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_portal_api') THEN
    CREATE ROLE sgp_portal_api;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_smoke_rls') THEN
    CREATE ROLE sgp_smoke_rls;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] ensured smoke roles exist');

  await applySupportSql();

  console.log('[db-smoke] running deterministic seed');
  runCommand('npm', ['run', 'db:seed'], backendDir);

  await runSqlSnippet(
    '99-assert-bootstrap-smoke.sql',
    `
DO $$
DECLARE
  employee_count integer;
BEGIN
  GRANT USAGE ON SCHEMA hr TO sgp_smoke_rls;
  GRANT SELECT ON hr.employee TO sgp_smoke_rls;

  IF to_regclass('hr.employee') IS NULL THEN
    RAISE EXCEPTION 'Expected hr.employee to exist after bootstrap';
  END IF;

  IF to_regclass('payroll.payroll_run') IS NULL THEN
    RAISE EXCEPTION 'Expected payroll.payroll_run to exist after bootstrap';
  END IF;

  IF to_regclass('portal.mv_employee_directory') IS NULL THEN
    RAISE EXCEPTION 'Expected portal.mv_employee_directory to exist after bootstrap';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'hr'
      AND table_name = 'employee'
      AND column_name = 'tenant_id'
  ) THEN
    RAISE EXCEPTION 'Expected hr.employee.tenant_id to exist after bootstrap';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'payroll'
      AND table_name = 'payroll_run'
      AND column_name = 'tenant_id'
  ) THEN
    RAISE EXCEPTION 'Expected payroll.payroll_run.tenant_id to exist after bootstrap';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('hr', 'employee_dependent'),
        ('hr', 'professional_experience'),
        ('hr', 'employee_frequency'),
        ('hr', 'service_time_record'),
        ('hr', 'employee_complement_data'),
        ('hr', 'salary_level_history')
    ) AS required(schema_name, table_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = required.schema_name
        AND c.table_name = required.table_name
        AND c.column_name = 'tenant_id'
    )
  ) THEN
    RAISE EXCEPTION 'Expected omitted HR runtime tables to receive tenant_id after bootstrap';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = to_regclass('portal.mv_payroll_run_summary')
      AND attname = 'tenant_slug'
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'Expected portal.mv_payroll_run_summary.tenant_slug to exist after bootstrap';
  END IF;

  IF to_regclass('public.employee') IS NOT NULL THEN
    RAISE EXCEPTION 'public.employee should not exist after schema split';
  END IF;

  IF NOT has_table_privilege('sgp_portal_api', 'portal.mv_employee_directory', 'SELECT') THEN
    RAISE EXCEPTION 'sgp_portal_api must have SELECT on portal.mv_employee_directory';
  END IF;

  IF has_table_privilege('sgp_portal_api', 'hr.employee', 'SELECT') THEN
    RAISE EXCEPTION 'sgp_portal_api must not have SELECT on hr.employee';
  END IF;

  PERFORM set_config('app.current_tenant_id', '00000000-0000-0000-0000-000000000999', true);
  PERFORM set_config('app.current_permissions', 'rh:read', true);
  PERFORM set_config('app.authenticated', 'true', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO employee_count FROM hr.employee;
  RESET ROLE;
  IF employee_count <> 0 THEN
    RAISE EXCEPTION 'Expected RLS to hide hr.employee rows for an unknown tenant, found %', employee_count;
  END IF;
END
$$;
    `,
  );
  console.log(
    '[db-smoke] validated schema split, tenant coverage, RLS, and portal read-only privileges',
  );

  console.log('[db-smoke] PASSED');
}

main().catch((error) => {
  if (error instanceof ConfigurationBlockedError) {
    console.error(`[db-smoke] BLOCKED: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  console.error(`[db-smoke] FAILED: ${error.message}`);
  process.exitCode = 1;
});
