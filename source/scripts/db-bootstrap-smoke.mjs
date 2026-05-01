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
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    CREATE ROLE sgp_app_role;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] ensured smoke roles exist');

  await applySupportSql();

  console.log('[db-smoke] checking forced RLS coverage');
  runPrismaDbExecute(resolve(sqlDir, 'checks/rls-coverage.sql'));

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
  PERFORM set_config('app.current_permissions', 'rh.dependent.read', true);
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

  await runSqlSnippet(
    '99-hr01-employee-lifecycle.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  v_employee_id uuid;
  status_id uuid;
  link_id uuid;
  contract_type_id uuid;
  contract_id uuid;
  history_count integer;
  audit_count integer;
  visible_count integer;
BEGIN
  GRANT USAGE ON SCHEMA hr, public TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.employee TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.functional_status TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.employment_link TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.contract_type TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.employment_contract TO sgp_smoke_rls;
  GRANT SELECT, INSERT ON hr.employee_status_history TO sgp_smoke_rls;
  GRANT SELECT, INSERT ON public.audit_event TO sgp_smoke_rls;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config(
    'app.current_permissions',
    'gestao.write' || chr(10) || 'rh.employee.read' || chr(10) || 'rh.employee.admit' || chr(10) || 'rh.employee.terminate' || chr(10) || 'auditoria.read',
    true
  );
  PERFORM set_config('app.authenticated', 'true', true);
  SET LOCAL ROLE sgp_smoke_rls;

  INSERT INTO hr.functional_status (
    tenant_id, code, description, modality, kind, enters_payroll, lifecycle_status, status
  )
  VALUES (
    tenant_a, 'HR01_SMOKE_ATIVO', 'HR01 Smoke Ativo', 'ATIVO', 'EXERCICIO', true, 'ACTIVE'::"EmployeeLifecycleStatus", 'ACTIVE'::"RecordStatus"
  )
  ON CONFLICT (tenant_id, code) DO UPDATE SET updated_at = now()
  RETURNING id INTO status_id;

  INSERT INTO hr.employment_link (tenant_id, code, name, status)
  VALUES (tenant_a, 'HR01_SMOKE_LINK', 'HR01 Smoke Link', 'ACTIVE'::"RecordStatus")
  ON CONFLICT (tenant_id, code) DO UPDATE SET updated_at = now()
  RETURNING id INTO link_id;

  INSERT INTO hr.contract_type (tenant_id, code, name, status)
  VALUES (tenant_a, 'HR01_SMOKE_CONTRACT', 'HR01 Smoke Contract', 'ACTIVE'::"RecordStatus")
  ON CONFLICT (tenant_id, code) DO UPDATE SET updated_at = now()
  RETURNING id INTO contract_type_id;

  INSERT INTO hr.employee (
    tenant_id, registration, name, cpf, functional_status_id, employment_link_id, contract_type_id, hired_on, lifecycle_status
  )
  VALUES (
    tenant_a, 'HR01-SMOKE', 'HR01 Smoke Employee', '99900011122', status_id, link_id, contract_type_id, DATE '2026-05-01', 'ACTIVE'::"EmployeeLifecycleStatus"
  )
  ON CONFLICT (tenant_id, registration) DO UPDATE
  SET functional_status_id = EXCLUDED.functional_status_id, updated_at = now()
  RETURNING id INTO v_employee_id;

  INSERT INTO hr.employment_contract (
    tenant_id, employee_id, employment_link_id, contract_type_id, starts_on, status
  )
  VALUES (
    tenant_a, v_employee_id, link_id, contract_type_id, DATE '2026-05-01', 'ACTIVE'::"RecordStatus"
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO contract_id;

  IF contract_id IS NULL THEN
    SELECT id INTO contract_id
    FROM hr.employment_contract
    WHERE tenant_id = tenant_a AND employee_id = v_employee_id AND ends_on IS NULL
    LIMIT 1;
  END IF;

  SELECT count(*) INTO history_count
  FROM hr.employee_status_history
  WHERE tenant_id = tenant_a AND employee_id = v_employee_id;
  IF history_count = 0 THEN
    RAISE EXCEPTION 'Expected HR-01 admission to create employee_status_history';
  END IF;

  SELECT count(*) INTO audit_count
  FROM public.audit_event
  WHERE tenant_id = tenant_a
    AND resource_type = 'rh.employee'
    AND resource_id = v_employee_id::text;
  IF audit_count = 0 THEN
    RAISE EXCEPTION 'Expected HR-01 admission to append audit_event';
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'rh.employee.read', true);
  SELECT count(*) INTO visible_count FROM hr.employee WHERE id = v_employee_id;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 hr.employee rows from tenant A, found %', visible_count;
  END IF;
  SELECT count(*) INTO visible_count FROM hr.employment_contract WHERE id = contract_id;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 hr.employment_contract rows from tenant A, found %', visible_count;
  END IF;
  SELECT count(*) INTO visible_count FROM hr.employee_status_history WHERE employee_id = v_employee_id;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 hr.employee_status_history rows from tenant A, found %', visible_count;
  END IF;

  RESET ROLE;
END
$$;
    `,
  );
  console.log('[db-smoke] validated HR-01 employee admission audit, timeline, and RLS');

  await runSqlSnippet(
    '99-hr02-vinculo-regime.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  status_id uuid;
  link_id uuid;
  contract_type_id uuid;
  v_employee_id uuid;
  contract_id uuid;
  history_before integer;
  history_after integer;
  audit_before integer;
  audit_after integer;
  visible_count integer;
BEGIN
  GRANT USAGE ON SCHEMA hr, public TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.employee TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.functional_status TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.employment_link TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.contract_type TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.employment_contract TO sgp_smoke_rls;
  GRANT SELECT, INSERT ON hr.employee_status_history TO sgp_smoke_rls;
  GRANT SELECT, INSERT ON public.audit_event TO sgp_smoke_rls;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config(
    'app.current_permissions',
    'rh.employee.read' || chr(10) || 'rh.employee.admit' || chr(10) || 'rh.employment_link.write' || chr(10) || 'gestao.write' || chr(10) || 'auditoria.read',
    true
  );
  PERFORM set_config('app.authenticated', 'true', true);
  SET LOCAL ROLE sgp_smoke_rls;

  BEGIN
    INSERT INTO hr.employment_link (tenant_id, code, name, contract_type, status)
    VALUES (tenant_a, 'HR02_BAD_TEMP', 'HR02 Bad Temporary', 'temporary', 'ACTIVE'::"RecordStatus");
    RAISE EXCEPTION 'Expected temporary employment_link without end_date to fail';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  INSERT INTO hr.functional_status (
    tenant_id, code, description, modality, kind, enters_payroll, lifecycle_status, status
  )
  VALUES (
    tenant_a, 'HR02_SMOKE_ATIVO', 'HR02 Smoke Ativo', 'ATIVO', 'EXERCICIO', true, 'ACTIVE'::"EmployeeLifecycleStatus", 'ACTIVE'::"RecordStatus"
  )
  ON CONFLICT (tenant_id, code) DO UPDATE SET updated_at = now()
  RETURNING id INTO status_id;

  INSERT INTO hr.contract_type (tenant_id, code, name, status)
  VALUES (tenant_a, 'TEMPORARIO', 'Temporario Lei 8.745/93', 'ACTIVE'::"RecordStatus")
  ON CONFLICT (tenant_id, code) DO UPDATE SET updated_at = now()
  RETURNING id INTO contract_type_id;

  INSERT INTO hr.employment_link (
    tenant_id, code, name, contract_type, end_date, regime_law_reference, functional_status_id, status
  )
  VALUES (
    tenant_a, 'HR02_TEMP_LINK', 'HR02 Temporary Link', 'temporary', DATE '2026-11-01', 'Lei 8.745/93', status_id, 'ACTIVE'::"RecordStatus"
  )
  ON CONFLICT (tenant_id, code) DO UPDATE
  SET contract_type = EXCLUDED.contract_type,
      end_date = EXCLUDED.end_date,
      regime_law_reference = EXCLUDED.regime_law_reference,
      functional_status_id = EXCLUDED.functional_status_id,
      updated_at = now()
  RETURNING id INTO link_id;

  INSERT INTO hr.employee (
    tenant_id, registration, name, functional_status_id, employment_link_id, contract_type_id, hired_on, lifecycle_status
  )
  VALUES (
    tenant_a, 'HR02-SMOKE', 'HR02 Smoke Employee', status_id, link_id, contract_type_id, DATE '2026-05-01', 'ACTIVE'::"EmployeeLifecycleStatus"
  )
  ON CONFLICT (tenant_id, registration) DO UPDATE
  SET employment_link_id = EXCLUDED.employment_link_id,
      contract_type_id = EXCLUDED.contract_type_id,
      updated_at = now()
  RETURNING id INTO v_employee_id;

  SELECT count(*) INTO history_before
  FROM hr.employee_status_history
  WHERE tenant_id = tenant_a AND employee_id = v_employee_id;

  SELECT count(*) INTO audit_before
  FROM public.audit_event
  WHERE tenant_id = tenant_a AND resource_type = 'rh.employment_link' AND resource_id = link_id::text;

  INSERT INTO hr.employment_contract (
    tenant_id, employee_id, employment_link_id, contract_type_id, starts_on, ends_on, legal_basis, status
  )
  VALUES (
    tenant_a, v_employee_id, link_id, contract_type_id, DATE '2026-05-01', DATE '2026-11-01', 'Lei 8.745/93', 'ACTIVE'::"RecordStatus"
  )
  RETURNING id INTO contract_id;

  INSERT INTO hr.employee_status_history (
    tenant_id, employee_id, functional_status_id, starts_on, ends_on, notes
  )
  VALUES (
    tenant_a, v_employee_id, status_id, DATE '2026-05-01', DATE '2026-11-01', 'Alteracao de regime juridico: temporary'
  );

  PERFORM public.sgp_append_audit_event(
    'PROCESS',
    'rh.employment_link',
    link_id::text,
    NULL::uuid,
    NULL::text,
    'db-smoke',
    'hr.employment_link',
    'db-smoke-hr02',
    jsonb_build_object('employeeId', v_employee_id::text, 'employmentContractId', contract_id::text),
    'HR-02 smoke',
    NULL::text,
    NULL::text
  );

  SELECT count(*) INTO history_after
  FROM hr.employee_status_history
  WHERE tenant_id = tenant_a AND employee_id = v_employee_id;
  IF history_after <> history_before + 1 THEN
    RAISE EXCEPTION 'Expected HR-02 regime change to append exactly 1 employee_status_history row, before %, after %', history_before, history_after;
  END IF;

  SELECT count(*) INTO audit_after
  FROM public.audit_event
  WHERE tenant_id = tenant_a AND resource_type = 'rh.employment_link' AND resource_id = link_id::text;
  IF audit_after <> audit_before + 1 THEN
    RAISE EXCEPTION 'Expected HR-02 regime change to append exactly 1 audit_event row, before %, after %', audit_before, audit_after;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'rh.employee.read', true);
  SELECT count(*) INTO visible_count FROM hr.employment_link WHERE id = link_id;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 hr.employment_link rows from tenant A, found %', visible_count;
  END IF;

  RESET ROLE;
END
$$;
    `,
  );
  console.log('[db-smoke] validated HR-02 regime checks, audit, timeline, and employment_link RLS');

  await runSqlSnippet(
    '99-xcut04-audit-immutability.sql',
    `
DO $$
DECLARE
  tenant_id constant uuid := '00000000-0000-0000-0000-000000000100';
  event_id uuid;
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::text, true);
  PERFORM set_config('app.current_permissions', 'auditoria.read', true);
  PERFORM set_config('app.authenticated', 'true', true);

  SELECT public.sgp_append_audit_event(
    'UPDATE',
    'audit_smoke',
    'xcut04',
    NULL,
    'smoke-user',
    'smoke',
    'audit_event',
    'xcut04-smoke',
    '{"source":"db-smoke"}'::jsonb,
    'immutability smoke'
  ) INTO event_id;

  BEGIN
    UPDATE public.audit_event SET reason = 'changed' WHERE id = event_id;
    RAISE EXCEPTION 'Expected audit_event UPDATE to fail';
  EXCEPTION
    WHEN SQLSTATE '0A000' THEN
      IF SQLERRM <> 'audit_event is immutable' THEN
        RAISE EXCEPTION 'Unexpected audit immutability message: %', SQLERRM;
      END IF;
  END;

  BEGIN
    DELETE FROM public.audit_event WHERE id = event_id;
    RAISE EXCEPTION 'Expected audit_event DELETE to fail';
  EXCEPTION
    WHEN SQLSTATE '0A000' THEN
      IF SQLERRM <> 'audit_event is immutable' THEN
        RAISE EXCEPTION 'Unexpected audit immutability message: %', SQLERRM;
      END IF;
  END;

  IF NOT has_table_privilege('sgp_app_role', 'public.audit_event', 'INSERT') THEN
    RAISE EXCEPTION 'sgp_app_role must have INSERT on public.audit_event';
  END IF;
  IF NOT has_table_privilege('sgp_app_role', 'public.audit_event', 'SELECT') THEN
    RAISE EXCEPTION 'sgp_app_role must have SELECT on public.audit_event';
  END IF;
  IF has_table_privilege('sgp_app_role', 'public.audit_event', 'UPDATE') THEN
    RAISE EXCEPTION 'sgp_app_role must not have UPDATE on public.audit_event';
  END IF;
  IF has_table_privilege('sgp_app_role', 'public.audit_event', 'DELETE') THEN
    RAISE EXCEPTION 'sgp_app_role must not have DELETE on public.audit_event';
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated audit_event immutability and app-role privileges');

  await runSqlSnippet(
    '99-xcut03-rls-hardening.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  employee_a uuid;
  employee_b uuid;
  earning_a uuid;
  dependent_a uuid := gen_random_uuid();
  visible_count integer;
  affected_count integer;
BEGIN
  GRANT USAGE ON SCHEMA hr, payroll, payroll_calc TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.employee_dependent TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON payroll_calc.formula_cache TO sgp_smoke_rls;
  GRANT SELECT ON hr.employee, payroll.payroll_earning_deduction TO sgp_smoke_rls;

  INSERT INTO public.tenant (id, slug, code, name, status)
  VALUES (tenant_b, 'xcut03-b', 'XCUT03B', 'XCUT03 Tenant B', 'ACTIVE'::"RecordStatus")
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO employee_a
  FROM hr.employee
  WHERE tenant_id = tenant_a
    AND functional_status_id IS NOT NULL
  ORDER BY created_at
  LIMIT 1;
  SELECT id INTO employee_b FROM hr.employee WHERE tenant_id = tenant_b LIMIT 1;

  IF employee_a IS NULL THEN
    RAISE EXCEPTION 'XCUT-03 smoke requires at least one seeded tenant A employee';
  END IF;

  IF employee_b IS NULL THEN
    INSERT INTO hr.employee (
      tenant_id,
      registration,
      name,
      cpf,
      branch_id,
      functional_status_id,
      employment_link_id,
      contract_type_id,
      lifecycle_status
    )
    SELECT
      tenant_b,
      'XCUT03-B',
      'XCUT03 Tenant B Employee',
      NULL,
      branch.id,
      functional_status.id,
      employment_link.id,
      contract_type.id,
      'ACTIVE'::"EmployeeLifecycleStatus"
    FROM hr.branch branch
    CROSS JOIN hr.functional_status functional_status
    CROSS JOIN hr.employment_link employment_link
    CROSS JOIN hr.contract_type contract_type
    WHERE branch.tenant_id = tenant_a
      AND functional_status.tenant_id = tenant_a
      AND employment_link.tenant_id = tenant_a
      AND contract_type.tenant_id = tenant_a
    LIMIT 1
    RETURNING id INTO employee_b;
  END IF;

  SELECT id INTO earning_a
  FROM payroll.payroll_earning_deduction
  WHERE tenant_id = tenant_a
  LIMIT 1;

  IF earning_a IS NULL THEN
    RAISE EXCEPTION 'XCUT-03 smoke requires at least one seeded payroll earning/deduction';
  END IF;

  INSERT INTO hr.employee_dependent (
    id,
    tenant_id,
    employee_id,
    name,
    relationship,
    income_tax_dependent
  )
  VALUES (
    dependent_a,
    tenant_a,
    employee_a,
    'XCUT03 Dependent',
    'CHILD',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO payroll_calc.formula_cache (
    tenant_id,
    earning_deduction_id,
    version,
    compiled_sql
  )
  VALUES (tenant_a, earning_a, 1, 'SELECT 10.00::numeric')
  ON CONFLICT (tenant_id, earning_deduction_id, version)
  DO UPDATE SET compiled_sql = EXCLUDED.compiled_sql, compiled_at = now();

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'rh.read', true);
  PERFORM set_config('app.authenticated', 'true', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count FROM hr.employee_dependent WHERE id = dependent_a;
  RESET ROLE;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 employee_dependent rows from tenant A, found %', visible_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'payroll.formula.read', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count FROM payroll_calc.formula_cache WHERE earning_deduction_id = earning_a;
  RESET ROLE;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 formula_cache rows from tenant A, found %', visible_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_permissions', 'rh.dependent.read\nrh.dependent.write', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM hr.employee_dependent
  WHERE id = dependent_a
    AND tenant_id = tenant_a;
  RESET ROLE;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Expected tenant A to see the employee_dependent row before tenant rewrite, found %', visible_count;
  END IF;

  BEGIN
    SET LOCAL ROLE sgp_smoke_rls;
    UPDATE hr.employee_dependent SET tenant_id = tenant_b WHERE id = dependent_a;
    RESET ROLE;
    RAISE EXCEPTION 'Expected employee_dependent tenant rewrite to be rejected by RLS WITH CHECK';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RESET ROLE;
    WHEN check_violation THEN
      RESET ROLE;
  END;

  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM hr.employee_dependent
  WHERE id = dependent_a
    AND tenant_id = tenant_a;
  RESET ROLE;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Expected employee_dependent row to remain in tenant A after rejected rewrite, found %', visible_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'rh.dependent.write', true);
  SET LOCAL ROLE sgp_smoke_rls;
  DELETE FROM hr.employee_dependent WHERE id = dependent_a;
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RESET ROLE;
  IF affected_count <> 0 THEN
    RAISE EXCEPTION 'Expected cross-tenant employee_dependent DELETE to affect 0 rows, affected %', affected_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'payroll.formula.read', true);
  BEGIN
    SET LOCAL ROLE sgp_smoke_rls;
    PERFORM payroll_calc.evaluate_earning_deduction(earning_a, employee_a, 1, 2026);
    RESET ROLE;
  EXCEPTION
    WHEN OTHERS THEN
      RESET ROLE;
      IF SQLSTATE <> 'P0001' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    INSERT INTO hr.employee_dependent (
      tenant_id,
      employee_id,
      name,
      relationship,
      income_tax_dependent
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      employee_a,
      'XCUT03 Invalid Tenant',
      'CHILD',
      false
    );
    RAISE EXCEPTION 'Expected invalid tenant_id insert to fail with foreign_key_violation';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;
END
$$;
    `,
  );
  console.log('[db-smoke] validated XCUT-03 RLS and tenant FK hardening');

  await runSqlSnippet(
    '99-hr08-history-probation.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  employee_a uuid;
  employee_b uuid;
  history_id uuid;
  probation_id uuid := gen_random_uuid();
  visible_count integer;
  unordered_count integer;
BEGIN
  GRANT USAGE ON SCHEMA hr TO sgp_smoke_rls;
  GRANT SELECT ON hr.employee, hr.employment_link, hr.employment_contract, hr.v_employee_career_history TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.probation_evaluation TO sgp_smoke_rls;

  SELECT id INTO employee_a
  FROM hr.employee
  WHERE tenant_id = tenant_a
    AND functional_status_id IS NOT NULL
  ORDER BY created_at
  LIMIT 1;
  IF employee_a IS NULL THEN
    RAISE EXCEPTION 'HR-08 smoke requires at least one seeded tenant A employee';
  END IF;

  SELECT id INTO history_id
  FROM hr.employee_status_history
  WHERE tenant_id = tenant_a
    AND employee_id = employee_a
  LIMIT 1;
  IF history_id IS NULL THEN
    INSERT INTO hr.employee_status_history (
      tenant_id,
      employee_id,
      functional_status_id,
      starts_on,
      notes
    )
    SELECT
      employee.tenant_id,
      employee.id,
      employee.functional_status_id,
      COALESCE(employee.hired_on, CURRENT_DATE),
      'HR-08 smoke history seed'
    FROM hr.employee employee
    WHERE employee.id = employee_a
      AND employee.functional_status_id IS NOT NULL
    RETURNING id INTO history_id;
  END IF;

  IF history_id IS NULL THEN
    RAISE EXCEPTION 'HR-08 smoke requires a functional_status_id to seed employee_status_history';
  END IF;

  BEGIN
    UPDATE hr.employee_status_history SET notes = notes WHERE id = history_id;
    RAISE EXCEPTION 'Expected employee_status_history UPDATE to fail';
  EXCEPTION
    WHEN feature_not_supported THEN
      NULL;
  END;

  BEGIN
    DELETE FROM hr.employee_status_history WHERE id = history_id;
    RAISE EXCEPTION 'Expected employee_status_history DELETE to fail';
  EXCEPTION
    WHEN feature_not_supported THEN
      NULL;
  END;

  SELECT count(*) INTO unordered_count
  FROM (
    SELECT
      event_date,
      lag(event_date) OVER (ORDER BY event_date DESC, event_id DESC) AS previous_date
    FROM hr.v_employee_career_history
    WHERE employee_id = employee_a
  ) ordered_events
  WHERE previous_date IS NOT NULL
    AND event_date > previous_date;
  IF unordered_count <> 0 THEN
    RAISE EXCEPTION 'Expected v_employee_career_history to be ordered by event_date DESC';
  END IF;

  UPDATE hr.employment_link link
  SET contract_type = 'statutory',
      regime_law_reference = 'Lei 8.112/90'
  FROM hr.employee employee
  WHERE employee.id = employee_a
    AND employee.employment_link_id = link.id;

  INSERT INTO hr.probation_evaluation (
    id,
    tenant_id,
    employee_id,
    period_start,
    period_end,
    score,
    decision,
    notes
  )
  VALUES (
    probation_id,
    tenant_a,
    employee_a,
    CURRENT_DATE - interval '36 months',
    CURRENT_DATE,
    9.00,
    'approved',
    'HR-08 smoke'
  );

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'avaliacao.read', true);
  PERFORM set_config('app.authenticated', 'true', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM hr.probation_evaluation
  WHERE id = probation_id;
  RESET ROLE;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 probation_evaluation rows from tenant A, found %', visible_count;
  END IF;

  SELECT id INTO employee_b FROM hr.employee WHERE tenant_id = tenant_b LIMIT 1;
  IF employee_b IS NOT NULL THEN
    PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
    PERFORM set_config('app.current_permissions', 'avaliacao.probation.write', true);
    BEGIN
      SET LOCAL ROLE sgp_smoke_rls;
      INSERT INTO hr.probation_evaluation (
        tenant_id,
        employee_id,
        period_start,
        period_end,
        score,
        decision
      )
      VALUES (tenant_a, employee_a, CURRENT_DATE - interval '12 months', CURRENT_DATE, 8.00, 'pending');
      RESET ROLE;
      RAISE EXCEPTION 'Expected cross-tenant probation_evaluation INSERT to fail';
    EXCEPTION
      WHEN insufficient_privilege THEN
        RESET ROLE;
      WHEN check_violation THEN
        RESET ROLE;
    END;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated HR-08 immutable history, career view, and probation RLS');

  await runSqlSnippet(
    '99-hr03-vacation.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  employee_a uuid;
  contract_id uuid;
  link_id uuid;
  v_contract_type_id uuid;
  vacation_id uuid := gen_random_uuid();
  balance_available integer;
  visible_count integer;
  audit_count integer;
BEGIN
  GRANT USAGE ON SCHEMA hr, public TO sgp_smoke_rls;
  GRANT SELECT ON hr.employee, hr.employment_link, hr.employment_contract, hr.v_vacation_balance TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.vacation_record TO sgp_smoke_rls;
  GRANT SELECT ON hr.vacation_type TO sgp_smoke_rls;
  GRANT SELECT ON public.audit_event TO sgp_smoke_rls;

  SELECT employee.id, employee.employment_link_id, employee.contract_type_id
  INTO employee_a, link_id, v_contract_type_id
  FROM hr.employee employee
  WHERE employee.tenant_id = tenant_a
    AND employee.employment_link_id IS NOT NULL
    AND employee.contract_type_id IS NOT NULL
  ORDER BY employee.created_at, employee.id
  LIMIT 1;

  IF employee_a IS NULL THEN
    RAISE EXCEPTION 'HR-03 smoke requires at least one seeded tenant A employee with employment_link_id and contract_type_id';
  END IF;

  SELECT id INTO contract_id
  FROM hr.employment_contract
  WHERE tenant_id = tenant_a
    AND employee_id = employee_a
    AND status = 'ACTIVE'::"RecordStatus"
  ORDER BY starts_on DESC
  LIMIT 1;

  IF contract_id IS NULL THEN
    INSERT INTO hr.employment_contract (
      tenant_id,
      employee_id,
      employment_link_id,
      contract_type_id,
      exercise_on,
      starts_on,
      legal_basis
    )
    VALUES (
      tenant_a,
      employee_a,
      link_id,
      v_contract_type_id,
      DATE '2024-01-01',
      DATE '2024-01-01',
      'HR-03 smoke'
    )
    RETURNING id INTO contract_id;
  ELSE
    UPDATE hr.employment_contract
    SET exercise_on = DATE '2024-01-01',
        starts_on = LEAST(starts_on, DATE '2024-01-01')
    WHERE id = contract_id;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config('app.current_permissions', 'rh.vacation.approve', true);
  DELETE FROM hr.vacation_record
  WHERE tenant_id = tenant_a
    AND employee_id = employee_a
    AND accrual_period_start = DATE '2024-01-01'
    AND accrual_period_end = DATE '2024-12-31'
    AND starts_on = DATE '2025-02-01'
    AND ends_on = DATE '2025-02-20';

  SELECT available_days INTO balance_available
  FROM hr.f_calculate_vacation_balance(employee_a, DATE '2025-01-02')
  WHERE accrual_period_start = DATE '2024-01-01'
    AND accrual_period_end = DATE '2024-12-31';

  IF balance_available <> 30 THEN
    RAISE EXCEPTION 'Expected 30 vacation balance days after 12 complete months, found %', balance_available;
  END IF;

  PERFORM set_config('app.current_permissions', 'rh.vacation.request', true);
  PERFORM set_config('app.authenticated', 'true', true);
  SET LOCAL ROLE sgp_smoke_rls;
  INSERT INTO hr.vacation_record (
    id,
    tenant_id,
    employee_id,
    accrual_start_on,
    accrual_end_on,
    accrual_period_start,
    accrual_period_end,
    installment_number,
    pecuniary_bonus_days,
    starts_on,
    ends_on,
    days,
    status
  )
  VALUES (
    vacation_id,
    tenant_a,
    employee_a,
    DATE '2024-01-01',
    DATE '2024-12-31',
    DATE '2024-01-01',
    DATE '2024-12-31',
    1,
    10,
    DATE '2025-02-01',
    DATE '2025-02-20',
    20,
    'programado'
  );
  RESET ROLE;

  UPDATE hr.vacation_record SET status = 'aprovado' WHERE id = vacation_id;

  SELECT count(*) INTO audit_count
  FROM public.audit_event
  WHERE resource_type = 'hr.vacation_record'
    AND resource_id = vacation_id::text;
  IF audit_count = 0 THEN
    RAISE EXCEPTION 'Expected approved vacation_record to append audit_event';
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'rh.vacation.read', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM hr.vacation_record
  WHERE id = vacation_id;
  RESET ROLE;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 vacation_record rows from tenant A, found %', visible_count;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated HR-03 vacation balance, audit, and RLS');

  await runSqlSnippet(
    '99-hr04-medical-leave.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  employee_a uuid;
  appointment_id uuid := gen_random_uuid();
  record_id uuid := gen_random_uuid();
  visible_count integer;
  leave_count integer;
  absence_count integer;
  consolidated_days integer;
BEGIN
  GRANT USAGE ON SCHEMA hr, public TO sgp_smoke_rls;
  GRANT SELECT, UPDATE ON hr.employee TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.medical_appointment TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.medical_record TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.medical_leave TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.leave_record TO sgp_smoke_rls;
  GRANT SELECT ON hr.absence_reason TO sgp_smoke_rls;
  GRANT SELECT ON public.audit_event TO sgp_smoke_rls;

  SELECT employee.id INTO employee_a
  FROM hr.employee employee
  WHERE employee.tenant_id = tenant_a
  LIMIT 1;

  IF employee_a IS NULL THEN
    RAISE EXCEPTION 'HR-04 smoke requires at least one seeded tenant A employee';
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config(
    'app.current_permissions',
    'saude.appointment.write' || chr(10) ||
    'saude.opinion.write' || chr(10) ||
    'rh.write' || chr(10) ||
    'rh.employee.write' || chr(10) ||
    'rh.medical_leave.read',
    true
  );
  PERFORM set_config('app.authenticated', 'true', true);

  SET LOCAL ROLE sgp_smoke_rls;
  INSERT INTO hr.medical_appointment (
    id,
    tenant_id,
    employee_id,
    slot_ref,
    scheduled_on,
    scheduled_time
  )
  VALUES (
    appointment_id,
    tenant_a,
    employee_a,
    'hr04-smoke-' || record_id::text,
    DATE '2026-05-01',
    '09:00'
  );

  INSERT INTO hr.medical_record (
    id,
    tenant_id,
    appointment_id,
    employee_id,
    physician_ref,
    reason,
    diagnosis,
    report_status,
    decision,
    granted_days,
    leave_starts_on,
    leave_ends_on,
    cid_code,
    cid_secondary
  )
  VALUES (
    record_id,
    tenant_a,
    appointment_id,
    employee_a,
    'smoke-physician',
    'HR-04 smoke',
    'Smoke diagnosis',
    'APPROVED'::"MedicalReportStatus",
    'granted',
    12,
    DATE '2026-05-02',
    DATE '2026-05-13',
    'J10',
    'R50'
  );

  SELECT count(*) INTO leave_count
  FROM hr.medical_leave
  WHERE medical_record_id = record_id;
  SELECT count(*) INTO absence_count
  FROM hr.leave_record
  WHERE tenant_id = tenant_a
    AND employee_id = employee_a
    AND notes = 'Medical leave generated from official pericia opinion ' || record_id::text;
  SELECT hr.f_consolidated_medical_days(employee_a, 2026) INTO consolidated_days;
  RESET ROLE;

  IF leave_count <> 1 THEN
    RAISE EXCEPTION 'Expected granted medical_record to create one medical_leave, found %', leave_count;
  END IF;
  IF absence_count <> 1 THEN
    RAISE EXCEPTION 'Expected granted medical_record to create one leave_record, found %', absence_count;
  END IF;
  IF consolidated_days < 12 THEN
    RAISE EXCEPTION 'Expected consolidated medical days to include 12 smoke days, found %', consolidated_days;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config(
    'app.current_permissions',
    'saude.read' || chr(10) || 'rh.medical_leave.read',
    true
  );
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM hr.medical_record
  WHERE id = record_id;
  RESET ROLE;

  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 medical_record rows from tenant A, found %', visible_count;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated HR-04 medical leave trigger, days, and RLS');

  await runSqlSnippet(
    '99-hr05-general-leaves.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  employee_a uuid;
  maternity_reason uuid;
  unpaid_reason uuid;
  training_reason uuid;
  leave_id uuid;
  unpaid_leave_id uuid;
  visible_count integer;
  audit_count integer;
  history_count integer;
BEGIN
  GRANT USAGE ON SCHEMA hr, public TO sgp_smoke_rls;
  GRANT SELECT ON hr.employee, hr.absence_reason, hr.service_time_record TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.leave_record TO sgp_smoke_rls;
  GRANT SELECT, INSERT ON hr.employee_status_history TO sgp_smoke_rls;
  GRANT SELECT ON public.audit_event TO sgp_smoke_rls;

  SELECT employee.id INTO employee_a
  FROM hr.employee employee
  WHERE employee.tenant_id = tenant_a
  LIMIT 1;

  IF employee_a IS NULL THEN
    RAISE EXCEPTION 'HR-05 smoke requires at least one seeded tenant A employee';
  END IF;

  INSERT INTO hr.absence_reason (tenant_id, code, description, status)
  VALUES
    (tenant_a, 'maternidade', 'Licenca maternidade', 'ACTIVE'::"RecordStatus"),
    (tenant_a, 'interesse_particular', 'Licenca interesse particular', 'ACTIVE'::"RecordStatus"),
    (tenant_a, 'capacitacao', 'Licenca capacitacao', 'ACTIVE'::"RecordStatus")
  ON CONFLICT (tenant_id, code) DO UPDATE
  SET description = EXCLUDED.description,
      status = EXCLUDED.status;

  SELECT id INTO maternity_reason FROM hr.absence_reason WHERE tenant_id = tenant_a AND code = 'maternidade';
  SELECT id INTO unpaid_reason FROM hr.absence_reason WHERE tenant_id = tenant_a AND code = 'interesse_particular';
  SELECT id INTO training_reason FROM hr.absence_reason WHERE tenant_id = tenant_a AND code = 'capacitacao';

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config('app.current_permissions', 'rh.leave.request' || chr(10) || 'rh.leave.approve' || chr(10) || 'rh.leave.read' || chr(10) || 'rh.read' || chr(10) || 'auditoria.read', true);
  PERFORM set_config('app.authenticated', 'true', true);

  SET LOCAL ROLE sgp_smoke_rls;
  INSERT INTO hr.leave_record (
    tenant_id,
    employee_id,
    absence_reason_id,
    starts_on,
    days,
    notes
  )
  VALUES (
    tenant_a,
    employee_a,
    maternity_reason,
    DATE '2026-05-01',
    120,
    'HR-05 maternity smoke'
  )
  RETURNING id INTO leave_id;

  INSERT INTO hr.leave_record (
    tenant_id,
    employee_id,
    absence_reason_id,
    starts_on,
    days,
    notes
  )
  VALUES (
    tenant_a,
    employee_a,
    unpaid_reason,
    DATE '2026-06-01',
    30,
    'HR-05 unpaid smoke'
  )
  RETURNING id INTO unpaid_leave_id;

  BEGIN
    INSERT INTO hr.leave_record (
      tenant_id,
      employee_id,
      absence_reason_id,
      starts_on,
      days,
      notes
    )
    VALUES (
      tenant_a,
      employee_a,
      training_reason,
      DATE '2026-07-01',
      90,
      'HR-05 training negative smoke'
    );
    RAISE EXCEPTION 'Expected capacitacao without five years to fail';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  UPDATE hr.leave_record
  SET approved_at = now()
  WHERE id = leave_id;

  SELECT count(*) INTO visible_count
  FROM hr.leave_record
  WHERE id = unpaid_leave_id
    AND paid = false;
  SELECT count(*) INTO audit_count
  FROM public.audit_event
  WHERE resource_type = 'hr.leave_record'
    AND resource_id = leave_id::text;
  SELECT count(*) INTO history_count
  FROM hr.employee_status_history
  WHERE employee_id = employee_a
    AND notes = 'Licenca aprovada: ' || leave_id::text;
  RESET ROLE;

  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Expected interesse_particular leave to be paid=false';
  END IF;
  IF audit_count = 0 THEN
    RAISE EXCEPTION 'Expected leave approval to append audit_event';
  END IF;
  IF history_count = 0 THEN
    RAISE EXCEPTION 'Expected leave approval to append employee_status_history';
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'rh.leave.read', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM hr.leave_record
  WHERE id = leave_id;
  RESET ROLE;

  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 leave_record rows from tenant A, found %', visible_count;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated HR-05 general leave rules, audit, and RLS');

  await runSqlSnippet(
    '99-fol02-cargos-estrutura.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  suffix text := replace(gen_random_uuid()::text, '-', '');
  salary_range_id uuid := gen_random_uuid();
  salary_level_id uuid := gen_random_uuid();
  job_position_id uuid := gen_random_uuid();
  visible_count integer;
  audit_count integer;
  null_count integer;
BEGIN
  GRANT USAGE ON SCHEMA hr, public TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.salary_range TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.salary_range_level TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.job_position TO sgp_smoke_rls;
  GRANT SELECT ON public.audit_event TO sgp_smoke_rls;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config(
    'app.current_permissions',
    'gestao.cargo.write' || chr(10) || 'gestao.cargo.read' || chr(10) || 'auditoria.read',
    true
  );
  PERFORM set_config('app.authenticated', 'true', true);
  PERFORM set_config('app.request_id', 'fol02-smoke-' || suffix, true);

  SET LOCAL ROLE sgp_smoke_rls;
  INSERT INTO hr.salary_range (
    id,
    tenant_id,
    code,
    name,
    starts_on
  )
  VALUES (
    salary_range_id,
    tenant_a,
    'FOL02-SR-' || left(suffix, 8),
    'FOL-02 smoke salary range',
    DATE '2026-01-01'
  );

  INSERT INTO hr.salary_range_level (
    id,
    tenant_id,
    salary_range_id,
    code,
    name,
    level_number,
    class_number,
    level_number_fol02,
    base_salary,
    amount_override
  )
  VALUES (
    salary_level_id,
    tenant_a,
    salary_range_id,
    'FOL02-LVL-' || left(suffix, 8),
    'FOL-02 smoke salary level',
    1,
    1,
    1,
    1234.56,
    1234.56
  );

  INSERT INTO hr.job_position (
    id,
    tenant_id,
    code,
    name,
    category,
    legal_regime,
    creation_law,
    vacancies_count,
    salary_range_id
  )
  VALUES (
    job_position_id,
    tenant_a,
    'FOL02-JOB-' || left(suffix, 8),
    'FOL-02 smoke job position',
    'efetivo',
    'estatutario',
    'Lei smoke 2026',
    1,
    salary_range_id
  );

  PERFORM public.sgp_append_audit_event(
    'CREATE',
    'gestao.cargo',
    job_position_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'hr.job_position',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('event', 'gestao.cargo.created', 'after', jsonb_build_object('id', job_position_id, 'salaryRangeId', salary_range_id)),
    NULL::text,
    NULL::text,
    NULL::text
  );

  SELECT count(*) INTO audit_count
  FROM public.audit_event
  WHERE tenant_id = tenant_a
    AND resource_type = 'gestao.cargo'
    AND resource_id = job_position_id::text
    AND metadata->>'event' = 'gestao.cargo.created';

  SELECT count(*) INTO null_count
  FROM hr.salary_range_level
  WHERE class_number IS NULL
     OR level_number_fol02 IS NULL;
  RESET ROLE;

  IF audit_count <> 1 THEN
    RAISE EXCEPTION 'Expected gestao.cargo.created audit_event, found %', audit_count;
  END IF;
  IF null_count <> 0 THEN
    RAISE EXCEPTION 'Expected salary_range_level class/level numbers to be non-null, found %', null_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'gestao.cargo.read', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM hr.job_position
  WHERE id = job_position_id;
  RESET ROLE;

  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 job_position rows from tenant A, found %', visible_count;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated FOL-02 cargos, salary matrix, audit, and RLS');

  await runSqlSnippet(
    '99-fol04-plano-carreira.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  suffix text := replace(gen_random_uuid()::text, '-', '');
  career_plan_id uuid := gen_random_uuid();
  salary_range_id uuid := gen_random_uuid();
  salary_level_id uuid := gen_random_uuid();
  job_position_id uuid := gen_random_uuid();
  visible_count integer;
  dangling_count integer;
BEGIN
  GRANT USAGE ON SCHEMA avaliacao, hr, public TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON avaliacao.career_plan TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON avaliacao.career_plan_job_position TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.salary_range TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.salary_range_level TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.job_position TO sgp_smoke_rls;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config(
    'app.current_permissions',
    'avaliacao.pccs.write' || chr(10) || 'avaliacao.pccs.read' || chr(10) || 'gestao.cargo.write',
    true
  );
  PERFORM set_config('app.authenticated', 'true', true);

  SET LOCAL ROLE sgp_smoke_rls;
  INSERT INTO avaliacao.career_plan (
    id,
    tenant_id,
    name,
    instituting_law,
    starts_on,
    class_count,
    reference_count,
    progression_rule
  )
  VALUES (
    career_plan_id,
    tenant_a,
    'FOL-04 smoke PCCS ' || left(suffix, 8),
    'Lei smoke 2026',
    DATE '2026-01-01',
    2,
    3,
    '# Regra de progressao'
  );

  INSERT INTO hr.salary_range (id, tenant_id, code, name, starts_on, career_plan_id)
  VALUES (
    salary_range_id,
    tenant_a,
    'FOL04-SR-' || left(suffix, 8),
    'FOL-04 smoke salary range',
    DATE '2026-01-01',
    career_plan_id
  );

  INSERT INTO hr.salary_range_level (
    id,
    tenant_id,
    salary_range_id,
    code,
    name,
    level_number,
    class_number,
    level_number_fol02,
    base_salary,
    amount_override
  )
  VALUES (
    salary_level_id,
    tenant_a,
    salary_range_id,
    'FOL04-LVL-' || left(suffix, 8),
    'FOL-04 smoke salary level',
    1,
    1,
    1,
    2345.67,
    2345.67
  );

  INSERT INTO hr.job_position (
    id,
    tenant_id,
    code,
    name,
    category,
    legal_regime,
    creation_law,
    vacancies_count,
    salary_range_id
  )
  VALUES (
    job_position_id,
    tenant_a,
    'FOL04-JOB-' || left(suffix, 8),
    'FOL-04 smoke job position',
    'efetivo',
    'estatutario',
    'Lei smoke 2026',
    1,
    salary_range_id
  );

  INSERT INTO avaliacao.career_plan_job_position (career_plan_id, job_position_id, tenant_id)
  VALUES (career_plan_id, job_position_id, tenant_a);

  SELECT count(*) INTO dangling_count
  FROM avaliacao.career_plan_job_position cpj
  JOIN hr.salary_range sr ON sr.career_plan_id = cpj.career_plan_id
  WHERE sr.id IS NULL;
  RESET ROLE;

  IF dangling_count <> 0 THEN
    RAISE EXCEPTION 'Expected 0 dangling PCCS salary-range links, found %', dangling_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'avaliacao.pccs.read', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM avaliacao.career_plan
  WHERE id = career_plan_id;
  RESET ROLE;

  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 career_plan rows from tenant A, found %', visible_count;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated FOL-04 PCCS links, trail data, and RLS');

  await runSqlSnippet(
    '99-fol05-bases-historicas.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  suffix text := replace(gen_random_uuid()::text, '-', '');
  salary_range_id uuid := gen_random_uuid();
  salary_level_id uuid := gen_random_uuid();
  history_id uuid := gen_random_uuid();
  visible_count integer;
  audit_count integer;
  march_salary numeric(14,2);
  july_salary numeric(14,2);
  next_salary numeric(14,2);
BEGIN
  GRANT USAGE ON SCHEMA avaliacao, hr, public TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.salary_range TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.salary_range_level TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.salary_level_history TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.salary_reference TO sgp_smoke_rls;
  GRANT SELECT ON public.audit_event TO sgp_smoke_rls;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config(
    'app.current_permissions',
    'avaliacao.salary_history.write' || chr(10) ||
    'avaliacao.salary_history.read' || chr(10) ||
    'gestao.cargo.write' || chr(10) ||
    'gestao.cargo.read' || chr(10) ||
    'auditoria.read',
    true
  );
  PERFORM set_config('app.authenticated', 'true', true);
  PERFORM set_config('app.request_id', 'fol05-smoke-' || suffix, true);

  SET LOCAL ROLE sgp_smoke_rls;
  INSERT INTO hr.salary_range (id, tenant_id, code, name, starts_on)
  VALUES (
    salary_range_id,
    tenant_a,
    'FOL05-SR-' || left(suffix, 8),
    'FOL-05 smoke salary range',
    DATE '2025-01-01'
  );

  INSERT INTO hr.salary_range_level (
    id,
    tenant_id,
    salary_range_id,
    code,
    name,
    level_number,
    class_number,
    level_number_fol02,
    base_salary,
    amount_override
  )
  VALUES (
    salary_level_id,
    tenant_a,
    salary_range_id,
    'FOL05-LVL-' || left(suffix, 8),
    'FOL-05 smoke salary level',
    1,
    1,
    1,
    1000.00,
    1000.00
  );

  INSERT INTO hr.salary_level_history (
    id,
    tenant_id,
    employee_id,
    salary_range_level_id,
    adjustment_amount,
    effective_on,
    vigencia_inicio,
    vigencia_fim,
    vencimento_basico,
    motivo,
    lei_referencia
  )
  VALUES (
    history_id,
    tenant_a,
    NULL,
    salary_level_id,
    0,
    DATE '2025-01-01',
    DATE '2025-01-01',
    DATE '2025-06-30',
    1000.00,
    'reajuste_data_base',
    'Lei smoke 2025'
  );

  INSERT INTO hr.salary_level_history (
    tenant_id,
    employee_id,
    salary_range_level_id,
    adjustment_amount,
    effective_on,
    vigencia_inicio,
    vigencia_fim,
    vencimento_basico,
    motivo,
    lei_referencia
  )
  VALUES (
    tenant_a,
    NULL,
    salary_level_id,
    100.00,
    DATE '2025-07-01',
    DATE '2025-07-01',
    NULL,
    1100.00,
    'reajuste_data_base',
    'Lei smoke 2025/2'
  );

  SELECT avaliacao.fn_get_vencimento_vigente(salary_level_id, DATE '2025-03-01') INTO march_salary;
  SELECT avaliacao.fn_get_vencimento_vigente(salary_level_id, DATE '2025-07-01') INTO july_salary;
  SELECT avaliacao.fn_get_vencimento_vigente(salary_level_id, DATE '2026-01-01') INTO next_salary;

  BEGIN
    INSERT INTO hr.salary_level_history (
      tenant_id,
      employee_id,
      salary_range_level_id,
      adjustment_amount,
      effective_on,
      vigencia_inicio,
      vigencia_fim,
      vencimento_basico,
      motivo,
      lei_referencia
    )
    VALUES (
      tenant_a,
      NULL,
      salary_level_id,
      50.00,
      DATE '2025-03-01',
      DATE '2025-03-01',
      DATE '2025-12-31',
      1050.00,
      'correcao',
      'Lei smoke overlap'
    );
    RAISE EXCEPTION 'Expected overlapping salary history insert to fail';
  EXCEPTION WHEN exclusion_violation THEN
    NULL;
  END;

  PERFORM public.sgp_append_audit_event(
    'UPDATE',
    'avaliacao.salary_history',
    history_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'hr.salary_level_history',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('event', 'avaliacao.salary_history.mass_adjustment', 'salaryRangeLevelId', salary_level_id),
    NULL::text,
    NULL::text,
    NULL::text
  );

  SELECT count(*) INTO audit_count
  FROM public.audit_event
  WHERE tenant_id = tenant_a
    AND resource_type = 'avaliacao.salary_history'
    AND resource_id = history_id::text;
  RESET ROLE;

  IF march_salary <> 1000.00 THEN
    RAISE EXCEPTION 'Expected March salary 1000.00, found %', march_salary;
  END IF;
  IF july_salary <> 1100.00 OR next_salary <> 1100.00 THEN
    RAISE EXCEPTION 'Expected active salary 1100.00, found July % and next %', july_salary, next_salary;
  END IF;
  IF audit_count <> 1 THEN
    RAISE EXCEPTION 'Expected salary history audit_event, found %', audit_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'avaliacao.salary_history.read', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM hr.salary_level_history
  WHERE salary_range_level_id = salary_level_id;
  RESET ROLE;

  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 salary history rows from tenant A, found %', visible_count;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated FOL-05 salary history lookup, overlap, audit, and RLS');

  await runSqlSnippet(
    '99-fol03-progressao-funcional.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  suffix text := replace(gen_random_uuid()::text, '-', '');
  salary_range_id uuid := gen_random_uuid();
  source_level_id uuid := gen_random_uuid();
  target_level_id uuid := gen_random_uuid();
  job_position_id uuid := gen_random_uuid();
  v_functional_status_id uuid;
  v_employment_link_id uuid;
  v_contract_type_id uuid;
  v_employee_id uuid := gen_random_uuid();
  v_evaluation_id uuid := gen_random_uuid();
  v_progression_id uuid := gen_random_uuid();
  visible_count integer;
  history_count integer;
  audit_count integer;
  v_current_level_id uuid;
BEGIN
  GRANT USAGE ON SCHEMA avaliacao, hr, public TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.salary_range TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.salary_range_level TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.job_position TO sgp_smoke_rls;
  GRANT SELECT ON hr.functional_status TO sgp_smoke_rls;
  GRANT SELECT ON hr.employment_link TO sgp_smoke_rls;
  GRANT SELECT ON hr.contract_type TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.employee TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.merit_progression TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.salary_simulation TO sgp_smoke_rls;
  GRANT SELECT, INSERT ON hr.performance_evaluation TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.salary_level_history TO sgp_smoke_rls;
  GRANT SELECT ON public.audit_event TO sgp_smoke_rls;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config(
    'app.current_permissions',
    'avaliacao.progressao.read' || chr(10) ||
    'avaliacao.progressao.simulate' || chr(10) ||
    'avaliacao.progressao.apply' || chr(10) ||
    'avaliacao.write' || chr(10) ||
    'avaliacao.salary_history.write' || chr(10) ||
    'avaliacao.salary_history.read' || chr(10) ||
    'gestao.cargo.write' || chr(10) ||
    'gestao.cargo.read' || chr(10) ||
    'gestao.read' || chr(10) ||
    'rh.employee.write' || chr(10) ||
    'rh.employee.read' || chr(10) ||
    'auditoria.read',
    true
  );
  PERFORM set_config('app.authenticated', 'true', true);
  PERFORM set_config('app.request_id', 'fol03-smoke-' || suffix, true);

  SET LOCAL ROLE sgp_smoke_rls;
  SELECT id INTO v_functional_status_id
  FROM hr.functional_status
  WHERE tenant_id = tenant_a
  ORDER BY created_at
  LIMIT 1;
  IF v_functional_status_id IS NULL THEN
    RAISE EXCEPTION 'FOL-03 smoke requires one tenant A functional_status';
  END IF;

  SELECT id INTO v_employment_link_id
  FROM hr.employment_link
  WHERE tenant_id = tenant_a
  ORDER BY created_at
  LIMIT 1;
  IF v_employment_link_id IS NULL THEN
    RAISE EXCEPTION 'FOL-03 smoke requires one tenant A employment_link';
  END IF;

  SELECT id INTO v_contract_type_id
  FROM hr.contract_type
  WHERE tenant_id = tenant_a
  ORDER BY created_at
  LIMIT 1;
  IF v_contract_type_id IS NULL THEN
    RAISE EXCEPTION 'FOL-03 smoke requires one tenant A contract_type';
  END IF;

  INSERT INTO hr.salary_range (id, tenant_id, code, name, starts_on)
  VALUES (
    salary_range_id,
    tenant_a,
    'FOL03-SR-' || left(suffix, 8),
    'FOL-03 smoke salary range',
    DATE '2026-01-01'
  );

  INSERT INTO hr.salary_range_level (
    id,
    tenant_id,
    salary_range_id,
    code,
    name,
    level_number,
    class_number,
    level_number_fol02,
    base_salary,
    amount_override
  )
  VALUES
    (
      source_level_id,
      tenant_a,
      salary_range_id,
      'FOL03-LVL-A-' || left(suffix, 8),
      'FOL-03 source level',
      1,
      1,
      1,
      1000.00,
      1000.00
    ),
    (
      target_level_id,
      tenant_a,
      salary_range_id,
      'FOL03-LVL-B-' || left(suffix, 8),
      'FOL-03 target level',
      2,
      1,
      2,
      1100.00,
      1100.00
    );

  INSERT INTO hr.job_position (
    id,
    tenant_id,
    code,
    name,
    category,
    legal_regime,
    creation_law,
    vacancies_count,
    salary_range_id
  )
  VALUES (
    job_position_id,
    tenant_a,
    'FOL03-JOB-' || left(suffix, 8),
    'FOL-03 smoke job position',
    'efetivo',
    'estatutario',
    'Lei smoke 2026',
    1,
    salary_range_id
  );

  INSERT INTO hr.employee (
    id,
    tenant_id,
    registration,
    name,
    job_position_id,
    functional_status_id,
    employment_link_id,
    contract_type_id,
    salary_range_level_id,
    hired_on,
    lifecycle_status
  )
  VALUES (
    v_employee_id,
    tenant_a,
    'FOL03-' || left(suffix, 8),
    'FOL-03 Smoke Employee',
    job_position_id,
    v_functional_status_id,
    v_employment_link_id,
    v_contract_type_id,
    source_level_id,
    DATE '2024-01-01',
    'ACTIVE'::"EmployeeLifecycleStatus"
  );

  INSERT INTO hr.performance_evaluation (
    id,
    tenant_id,
    employee_id,
    period_label,
    score,
    criteria,
    evaluator_ref,
    evaluated_on,
    status
  )
  VALUES (
    v_evaluation_id,
    tenant_a,
    v_employee_id,
    '2026',
    95.00,
    '[]'::jsonb,
    'db-smoke',
    DATE '2026-04-01',
    'APPROVED'::"PerformanceEvaluationStatus"
  );

  INSERT INTO hr.merit_progression (
    id,
    tenant_id,
    employee_id,
    performance_evaluation_id,
    source_salary_range_level_id,
    target_salary_range_level_id,
    effective_on,
    data_efeito,
    appointment_act,
    kind,
    progression_type,
    status,
    justification
  )
  VALUES (
    v_progression_id,
    tenant_a,
    v_employee_id,
    v_evaluation_id,
    source_level_id,
    target_level_id,
    DATE '2026-05-01',
    DATE '2026-05-01',
    'Portaria smoke FOL-03',
    'MERIT'::"ProgressionKind",
    'merit_horizontal'::hr.progression_type,
    'simulated'::hr.progression_status,
    'Smoke progression'
  );

  UPDATE hr.merit_progression
  SET status = 'applied'::hr.progression_status,
    applied_at = now()
  WHERE id = v_progression_id;

  SELECT salary_range_level_id INTO v_current_level_id
  FROM hr.employee
  WHERE id = v_employee_id;

  SELECT count(*) INTO history_count
  FROM hr.salary_level_history
  WHERE tenant_id = tenant_a
    AND employee_id = v_employee_id
    AND salary_range_level_id = target_level_id
    AND vigencia_inicio = DATE '2026-05-01'
    AND vencimento_basico = 1100.00;

  PERFORM public.sgp_append_audit_event(
    'UPDATE',
    'avaliacao.progressao',
    v_progression_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'hr.merit_progression',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('event', 'avaliacao.progressao.applied', 'progressionId', v_progression_id),
    NULL::text,
    NULL::text,
    NULL::text
  );

  SELECT count(*) INTO audit_count
  FROM public.audit_event
  WHERE tenant_id = tenant_a
    AND resource_type = 'avaliacao.progressao'
    AND resource_id = v_progression_id::text
    AND metadata->>'event' = 'avaliacao.progressao.applied';
  RESET ROLE;

  IF v_current_level_id <> target_level_id THEN
    RAISE EXCEPTION 'Expected employee current level % after applied progression, found %', target_level_id, v_current_level_id;
  END IF;
  IF history_count <> 1 THEN
    RAISE EXCEPTION 'Expected applied progression to insert one target salary history row, found %', history_count;
  END IF;
  IF audit_count <> 1 THEN
    RAISE EXCEPTION 'Expected avaliacao.progressao.applied audit_event, found %', audit_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'avaliacao.progressao.read', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM hr.merit_progression
  WHERE id = v_progression_id;
  RESET ROLE;

  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 merit_progression rows from tenant A, found %', visible_count;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated FOL-03 progression trigger, audit, and RLS');

  await runSqlSnippet(
    '99-fol06-employee-transfer.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  v_employee_id uuid;
  origin_location_id uuid;
  target_location_id uuid;
  v_transfer_id uuid := gen_random_uuid();
  current_location_id uuid;
  audit_count integer;
  visible_count integer;
BEGIN
  GRANT USAGE ON SCHEMA hr, public TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.employee_transfer TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.employee TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.work_location TO sgp_smoke_rls;
  GRANT SELECT, INSERT ON public.audit_event TO sgp_smoke_rls;

  SELECT id INTO v_employee_id
  FROM hr.employee
  WHERE tenant_id = tenant_a
    AND employment_link_id IS NOT NULL
    AND contract_type_id IS NOT NULL
  ORDER BY created_at, id
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Expected seeded tenant A employee with employment_link_id and contract_type_id for FOL-06 smoke';
  END IF;

  INSERT INTO hr.work_location (tenant_id, code, name, description, status)
  VALUES
    (tenant_a, 'FOL06_ORIGIN', 'FOL-06 Origin', 'FOL-06 smoke origin', 'ACTIVE'::"RecordStatus"),
    (tenant_a, 'FOL06_TARGET', 'FOL-06 Target', 'FOL-06 smoke target', 'ACTIVE'::"RecordStatus")
  ON CONFLICT (tenant_id, code) DO UPDATE SET updated_at = now();

  SELECT id INTO origin_location_id
  FROM hr.work_location
  WHERE tenant_id = tenant_a AND code = 'FOL06_ORIGIN';

  SELECT id INTO target_location_id
  FROM hr.work_location
  WHERE tenant_id = tenant_a AND code = 'FOL06_TARGET';

  UPDATE hr.employee
  SET work_location_id = origin_location_id, updated_at = now()
  WHERE id = v_employee_id;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config(
    'app.current_permissions',
    'rh.movimentacao.read' || chr(10) ||
    'rh.movimentacao.request' || chr(10) ||
    'rh.movimentacao.approve' || chr(10) ||
    'rh.movimentacao.effect' || chr(10) ||
    'rh.employee.write' || chr(10) ||
    'auditoria.read',
    true
  );
  PERFORM set_config('app.authenticated', 'true', true);
  SET LOCAL ROLE sgp_smoke_rls;

  INSERT INTO hr.employee_transfer (
    id,
    tenant_id,
    employee_id,
    origem_work_location_id,
    destino_work_location_id,
    tipo,
    data_solicitacao,
    data_efeito,
    status,
    effective_on,
    to_work_location_id,
    notes
  )
  VALUES (
    v_transfer_id,
    tenant_a,
    v_employee_id,
    origin_location_id,
    target_location_id,
    'oficio'::hr.employee_transfer_type,
    DATE '2026-05-01',
    DATE '2026-06-01',
    'aprovada'::hr.employee_transfer_status,
    DATE '2026-06-01',
    target_location_id,
    'FOL-06 smoke'
  );

  UPDATE hr.employee_transfer
  SET status = 'efetivada'::hr.employee_transfer_status,
      updated_at = now()
  WHERE id = v_transfer_id;

  SELECT work_location_id INTO current_location_id
  FROM hr.employee
  WHERE id = v_employee_id;

  SELECT count(*) INTO audit_count
  FROM public.audit_event
  WHERE tenant_id = tenant_a
    AND resource_type = 'rh.employee_transfer'
    AND resource_id = v_transfer_id::text
    AND metadata->>'event' = 'rh.movimentacao.efetivada';
  RESET ROLE;

  IF current_location_id <> target_location_id THEN
    RAISE EXCEPTION 'Expected employee work_location_id % after transfer, found %', target_location_id, current_location_id;
  END IF;
  IF audit_count <> 1 THEN
    RAISE EXCEPTION 'Expected rh.movimentacao.efetivada audit_event, found %', audit_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'rh.movimentacao.read', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM hr.employee_transfer
  WHERE id = v_transfer_id;
  RESET ROLE;

  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 employee_transfer rows from tenant A, found %', visible_count;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated FOL-06 transfer trigger, audit, and RLS');

  await runSqlSnippet(
    '99-fol01-rubricas.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  suffix text := replace(gen_random_uuid()::text, '-', '');
  v_salary_reference_id uuid := gen_random_uuid();
  v_employee_id uuid;
  v_job_position_id uuid;
  rubrica_id uuid := gen_random_uuid();
  bad_rubrica_id uuid := gen_random_uuid();
  attribute_id uuid := gen_random_uuid();
  attribute_code text := 'percentual_' || left(suffix, 8);
  attribute_name text := 'percentual_' || left(suffix, 8);
  link_id uuid := gen_random_uuid();
  preview_amount numeric(14,2);
  visible_count integer;
  affected_count integer;
  null_ready_count integer;
  audit_count integer;
  invalid_ready boolean;
  invalid_error text;
  compile_result jsonb;
  previous_version integer;
  stale_cache_count integer;
  invalidation_audit_count integer;
BEGIN
  GRANT USAGE ON SCHEMA hr, payroll, payroll_calc, public TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON payroll.payroll_earning_deduction TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON payroll.formula_attribute TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON payroll.job_position_earning TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON payroll_calc.formula_cache TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.salary_reference TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.employee TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE ON hr.job_position TO sgp_smoke_rls;
  GRANT SELECT, INSERT ON public.audit_event TO sgp_smoke_rls;

  SELECT id INTO v_employee_id
  FROM hr.employee
  WHERE tenant_id = tenant_a
    AND functional_status_id IS NOT NULL
    AND employment_link_id IS NOT NULL
    AND contract_type_id IS NOT NULL
  ORDER BY created_at, id
  LIMIT 1;
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'FOL-01 smoke requires one tenant A employee with payroll-ready links';
  END IF;

  SELECT id INTO v_job_position_id
  FROM hr.job_position
  WHERE tenant_id = tenant_a
  ORDER BY created_at, id
  LIMIT 1;
  IF v_job_position_id IS NULL THEN
    INSERT INTO hr.job_position (
      tenant_id,
      code,
      name,
      category,
      legal_regime,
      creation_law,
      vacancies_count
    )
    VALUES (
      tenant_a,
      'FOL01-JOB-' || left(suffix, 8),
      'FOL-01 smoke job position',
      'efetivo',
      'estatutario',
      'Lei smoke 2026',
      1
    )
    RETURNING id INTO v_job_position_id;
  END IF;

  INSERT INTO hr.salary_reference (
    id,
    tenant_id,
    code,
    description,
    amount,
    vigencia_inicio
  )
  VALUES (
    v_salary_reference_id,
    tenant_a,
    'FOL01-SAL-' || left(suffix, 8),
    'FOL-01 smoke salary reference',
    1234.56,
    DATE '2026-01-01'
  );

  UPDATE hr.employee
  SET salary_reference_id = v_salary_reference_id,
      job_position_id = v_job_position_id,
      updated_at = now()
  WHERE id = v_employee_id;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config(
    'app.current_permissions',
    'folha.rubrica.read' || chr(10) ||
    'folha.rubrica.write' || chr(10) ||
    'folha.rubrica.preview' || chr(10) ||
    'payroll.formula.read' || chr(10) ||
    'payroll.formula.write' || chr(10) ||
    'folha.read' || chr(10) ||
    'folha.write' || chr(10) ||
    'avaliacao.salary_history.read' || chr(10) ||
    'auditoria.read',
    true
  );
  PERFORM set_config('app.authenticated', 'true', true);
  PERFORM set_config('app.request_id', 'fol01-smoke-' || suffix, true);

  SET LOCAL ROLE sgp_smoke_rls;
  INSERT INTO payroll.payroll_earning_deduction (
    id,
    tenant_id,
    code,
    description,
    kind,
    taxable,
    active,
    incidences,
    starts_on,
    formula_alias,
    formula_expression,
    esocial_code,
    official_rubric_code
  )
  VALUES (
    rubrica_id,
    tenant_a,
    'FOL01-VENC-' || left(suffix, 8),
    'FOL-01 vencimento smoke',
    'EARNING'::"PayrollEntryKind",
    true,
    true,
    '{"irrf":true,"inss":true,"fgts":false,"rpps":false,"employerContribution":true}'::jsonb,
    DATE '2026-01-01',
    'fol01_venc_' || left(suffix, 8),
    'base_salary(p_employee_id, make_date(p_year, p_month, 1))',
    '1000',
    '001'
  );

  INSERT INTO payroll.formula_attribute (
    id,
    tenant_id,
    earning_deduction_id,
    code,
    description,
    name,
    data_type,
    value_type,
    default_value,
    required,
    source_scope,
    expression_hint,
    status
  )
  VALUES (
    attribute_id,
    tenant_a,
    rubrica_id,
    attribute_code,
    'Percentual',
    attribute_name,
    'decimal',
    'decimal'::payroll.formula_attribute_value_type,
    '100.00',
    true,
    'rubrica',
    '',
    'ACTIVE'::"RecordStatus"
  );

  INSERT INTO payroll.job_position_earning (
    id,
    tenant_id,
    job_position_id,
    earning_deduction_id,
    starts_on,
    ends_on,
    application_condition,
    status
  )
  VALUES (
    link_id,
    tenant_a,
    v_job_position_id,
    rubrica_id,
    DATE '2026-01-01',
    NULL,
    'active employee',
    'ACTIVE'::"RecordStatus"
  );

  SELECT payroll_calc.evaluate_earning_deduction(rubrica_id, v_employee_id, 5, 2026)
  INTO preview_amount;

  SELECT formula_version INTO previous_version
  FROM payroll.payroll_earning_deduction
  WHERE id = rubrica_id;

  UPDATE payroll.payroll_earning_deduction
  SET formula_expression = 'base_salary(p_employee_id, make_date(p_year, p_month, 1)) + 1'
  WHERE id = rubrica_id;

  SELECT count(*) INTO stale_cache_count
  FROM payroll_calc.formula_cache
  WHERE tenant_id = tenant_a
    AND earning_deduction_id = rubrica_id
    AND version = previous_version;

  SELECT count(*) INTO invalidation_audit_count
  FROM public.audit_event
  WHERE tenant_id = tenant_a
    AND resource_type = 'payroll.formula'
    AND resource_id = rubrica_id::text
    AND metadata->>'event' = 'payroll.formula.cache_invalidated';

  INSERT INTO payroll.payroll_earning_deduction (
    id,
    tenant_id,
    code,
    description,
    kind,
    active,
    formula_alias,
    formula_expression
  )
  VALUES (
    bad_rubrica_id,
    tenant_a,
    'FOL01-BAD-' || left(suffix, 8),
    'FOL-01 invalid formula smoke',
    'DEDUCTION'::"PayrollEntryKind",
    true,
    'fol01_bad_' || left(suffix, 8),
    'not_allowed()'
  );

  SELECT formula_ready, formula_error INTO invalid_ready, invalid_error
  FROM payroll.payroll_earning_deduction
  WHERE id = bad_rubrica_id;

  SELECT payroll_calc.compile_formula('not_allowed()', ARRAY[]::text[])
  INTO compile_result;

  PERFORM public.sgp_append_audit_event(
    'CREATE',
    'folha.rubrica',
    rubrica_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'payroll.payroll_earning_deduction',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('event', 'folha.rubrica.created', 'code', 'FOL01-VENC-' || left(suffix, 8)),
    NULL::text,
    NULL::text,
    NULL::text
  );

  SELECT count(*) INTO audit_count
  FROM public.audit_event
  WHERE tenant_id = tenant_a
    AND resource_type = 'folha.rubrica'
    AND resource_id = rubrica_id::text
    AND metadata->>'event' = 'folha.rubrica.created';

  SELECT count(*) INTO null_ready_count
  FROM payroll.payroll_earning_deduction
  WHERE formula_expression IS NOT NULL
    AND formula_ready IS NULL;
  RESET ROLE;

  IF preview_amount IS NULL OR preview_amount <> 1234.56 THEN
    RAISE EXCEPTION 'Expected rubrica preview 1234.56, found %', preview_amount;
  END IF;
  IF invalid_ready IS DISTINCT FROM false OR invalid_error IS NULL THEN
    RAISE EXCEPTION 'Expected invalid formula to set formula_ready=false and formula_error, ready %, error %', invalid_ready, invalid_error;
  END IF;
  IF compile_result->>'ready' <> 'false' OR compile_result->>'error' IS NULL THEN
    RAISE EXCEPTION 'Expected compile_formula invalid expression result, found %', compile_result;
  END IF;
  IF stale_cache_count <> 0 THEN
    RAISE EXCEPTION 'Expected edited formula to invalidate previous formula_cache version, found % stale rows', stale_cache_count;
  END IF;
  IF invalidation_audit_count = 0 THEN
    RAISE EXCEPTION 'Expected edited formula to append payroll.formula cache invalidation audit_event';
  END IF;
  IF audit_count <> 1 THEN
    RAISE EXCEPTION 'Expected folha.rubrica.created audit_event, found %', audit_count;
  END IF;
  IF null_ready_count <> 0 THEN
    RAISE EXCEPTION 'Expected zero formula rows with formula_ready IS NULL, found %', null_ready_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'folha.rubrica.read', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM payroll.payroll_earning_deduction
  WHERE id = rubrica_id;
  RESET ROLE;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 rubricas from tenant A, found %', visible_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'folha.rubrica.write', true);
  SET LOCAL ROLE sgp_smoke_rls;
  UPDATE payroll.formula_attribute
  SET tenant_id = tenant_b
  WHERE id = attribute_id;
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RESET ROLE;
  IF affected_count <> 0 THEN
    RAISE EXCEPTION 'Expected cross-tenant formula_attribute rewrite to affect 0 rows, affected %', affected_count;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated FOL-01 rubricas formulas, preview, audit, and RLS');

  await runSqlSnippet(
    '99-calc02-irrf.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  suffix text := replace(gen_random_uuid()::text, '-', '');
  v_rate_id uuid := gen_random_uuid();
  visible_count integer;
  affected_count integer;
  irrf_amount numeric(14, 2);
BEGIN
  GRANT USAGE ON SCHEMA public, payroll_calc TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_rate TO sgp_smoke_rls;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config('app.current_permissions', 'system.tax-rate.read' || chr(10) || 'system.tax-rate.write', true);
  PERFORM set_config('app.authenticated', 'true', true);
  SET LOCAL ROLE sgp_smoke_rls;
  DELETE FROM public.tax_rate
  WHERE tenant_id = tenant_a
    AND code LIKE 'CALC02-SMOKE-%';

  INSERT INTO public.tax_rate (
    id, tenant_id, code, name, description, scope, reference_year, rate_percent,
    kind, competence_start, bracket_min, bracket_max, rate, deduction_amount,
    dependent_deduction, status
  )
  VALUES (
    v_rate_id, tenant_a, 'CALC02-SMOKE-' || left(suffix, 8), 'CALC-02 smoke',
    'CALC-02 smoke tax-rate RLS row', 'IRRF_SMOKE', 2025, 7.500000, 'IRRF_SMOKE',
    DATE '2025-01-01', 2259.21, 2826.65, 7.500000, 169.44, 189.59,
    'ACTIVE'::"RecordStatus"
  );

  SELECT payroll_calc.compute_irrf(tenant_a, 2500.00, 0, DATE '2025-05-01')
  INTO irrf_amount;
  RESET ROLE;

  IF irrf_amount <> 18.06 THEN
    RAISE EXCEPTION 'Expected CALC-02 IRRF smoke amount 18.06, found %', irrf_amount;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'system.tax-rate.read', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM public.tax_rate
  WHERE id = v_rate_id;
  RESET ROLE;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 tax_rate rows from tenant A, found %', visible_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'system.tax-rate.write', true);
  SET LOCAL ROLE sgp_smoke_rls;
  UPDATE public.tax_rate
  SET tenant_id = tenant_b
  WHERE id = v_rate_id;
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RESET ROLE;
  IF affected_count <> 0 THEN
    RAISE EXCEPTION 'Expected cross-tenant tax_rate rewrite to affect 0 rows, affected %', affected_count;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated CALC-02 IRRF compute function and tax_rate RLS');

  await runSqlSnippet(
    '99-calc03-rpps.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  suffix text := replace(gen_random_uuid()::text, '-', '');
  v_rate_id uuid := gen_random_uuid();
  link_statutory uuid := gen_random_uuid();
  link_celetista uuid := gen_random_uuid();
  visible_count integer;
  affected_count integer;
  rpps_amount numeric(14, 2);
  audit_count integer;
BEGIN
  GRANT USAGE ON SCHEMA public, payroll_calc, hr TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_rate TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_parameter TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.employment_link TO sgp_smoke_rls;
  GRANT SELECT ON public.audit_event TO sgp_smoke_rls;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config(
    'app.current_permissions',
    'system.tax-rate.read' || chr(10) || 'system.tax-rate.write' || chr(10) || 'rh.employee.read' || chr(10) || 'gestao.write' || chr(10) || 'auditoria.read',
    true
  );
  PERFORM set_config('app.authenticated', 'true', true);
  SET LOCAL ROLE sgp_smoke_rls;

  INSERT INTO public.system_parameter (tenant_id, key, value, description, module_key)
  VALUES (tenant_a, 'TETO_RPPS', '{"amount":8157.41}'::jsonb, 'CALC-03 smoke ceiling', 'payroll')
  ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

  DELETE FROM public.tax_rate
  WHERE tenant_id = tenant_a
    AND code LIKE 'CALC03-SMOKE-%';

  INSERT INTO hr.employment_link (
    id, tenant_id, code, name, contract_type, regime_law_reference, status
  )
  VALUES
    (link_statutory, tenant_a, 'CALC03-SMOKE-STAT-' || left(suffix, 8), 'CALC-03 statutory smoke', 'statutory', 'Lei 8.112/90', 'ACTIVE'::"RecordStatus"),
    (link_celetista, tenant_a, 'CALC03-SMOKE-CLT-' || left(suffix, 8), 'CALC-03 celetista smoke', 'celetista', 'Lei 8.112/90', 'ACTIVE'::"RecordStatus");

  INSERT INTO public.tax_rate (
    id, tenant_id, code, name, description, scope, reference_year, rate_percent,
    kind, competence_start, bracket_min, bracket_max, rate, deduction_amount,
    dependent_deduction, status
  )
  VALUES
    (v_rate_id, tenant_a, 'CALC03-SMOKE-01-' || left(suffix, 8), 'CALC-03 RPPS 1', 'CALC-03 smoke RPPS', 'RPPS_SMOKE', 2025, 7.500000, 'RPPS', DATE '2025-02-01', 0.00, 1518.00, 7.500000, 0.00, 0.00, 'ACTIVE'::"RecordStatus"),
    (gen_random_uuid(), tenant_a, 'CALC03-SMOKE-02-' || left(suffix, 8), 'CALC-03 RPPS 2', 'CALC-03 smoke RPPS', 'RPPS_SMOKE', 2025, 9.000000, 'RPPS', DATE '2025-02-01', 1518.01, 2793.88, 9.000000, 0.00, 0.00, 'ACTIVE'::"RecordStatus"),
    (gen_random_uuid(), tenant_a, 'CALC03-SMOKE-03-' || left(suffix, 8), 'CALC-03 RPPS 3', 'CALC-03 smoke RPPS', 'RPPS_SMOKE', 2025, 12.000000, 'RPPS', DATE '2025-02-01', 2793.89, 4190.83, 12.000000, 0.00, 0.00, 'ACTIVE'::"RecordStatus"),
    (gen_random_uuid(), tenant_a, 'CALC03-SMOKE-04-' || left(suffix, 8), 'CALC-03 RPPS 4', 'CALC-03 smoke RPPS', 'RPPS_SMOKE', 2025, 14.000000, 'RPPS', DATE '2025-02-01', 4190.84, 8157.41, 14.000000, 0.00, 0.00, 'ACTIVE'::"RecordStatus"),
    (gen_random_uuid(), tenant_a, 'CALC03-SMOKE-05-' || left(suffix, 8), 'CALC-03 RPPS 5', 'CALC-03 smoke RPPS', 'RPPS_SMOKE', 2025, 14.500000, 'RPPS', DATE '2025-02-01', 8157.42, NULL, 14.500000, 0.00, 0.00, 'ACTIVE'::"RecordStatus");

  SELECT payroll_calc.compute_rpps(tenant_a, link_statutory, 10000.00, DATE '2025-02-01')
  INTO rpps_amount;
  IF rpps_amount <> 951.63 THEN
    RAISE EXCEPTION 'Expected CALC-03 RPPS smoke amount 951.63, found %', rpps_amount;
  END IF;

  SELECT payroll_calc.compute_rpps(tenant_a, link_celetista, 5000.00, DATE '2025-02-01')
  INTO rpps_amount;
  IF rpps_amount <> 0.00 THEN
    RAISE EXCEPTION 'Expected CALC-03 celetista RPPS bypass amount 0.00, found %', rpps_amount;
  END IF;

  SELECT count(*) INTO audit_count
  FROM public.audit_event
  WHERE tenant_id = tenant_a
    AND resource_type = 'payroll.rpps'
    AND resource_id = link_celetista::text
    AND metadata->>'event' = 'payroll.rpps.bypassed';
  RESET ROLE;
  IF audit_count < 1 THEN
    RAISE EXCEPTION 'Expected CALC-03 RPPS bypass audit event';
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'system.tax-rate.read', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM public.tax_rate
  WHERE id = v_rate_id;
  RESET ROLE;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 RPPS tax_rate rows from tenant A, found %', visible_count;
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'system.tax-rate.write', true);
  SET LOCAL ROLE sgp_smoke_rls;
  UPDATE public.tax_rate
  SET tenant_id = tenant_b
  WHERE id = v_rate_id;
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RESET ROLE;
  IF affected_count <> 0 THEN
    RAISE EXCEPTION 'Expected cross-tenant RPPS tax_rate rewrite to affect 0 rows, affected %', affected_count;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated CALC-03 RPPS compute function, bypass audit, and tax_rate RLS');

  await runSqlSnippet(
    '99-calc05-ferias.sql',
    `
DO $$
DECLARE
  tenant_a constant uuid := '00000000-0000-0000-0000-000000000100';
  tenant_b constant uuid := '00000000-0000-0000-0000-000000000200';
  suffix text := replace(gen_random_uuid()::text, '-', '');
  v_employee_id uuid;
  v_vacation_id uuid := gen_random_uuid();
  v_payroll_run_id uuid;
  visible_count integer;
  linked_count integer;
  salary_amount numeric(14, 2);
BEGIN
  GRANT USAGE ON SCHEMA public, hr, payroll, payroll_calc TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON hr.vacation_record TO sgp_smoke_rls;
  GRANT SELECT ON hr.employee, hr.employment_link, hr.salary_reference, hr.employee_dependent TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON payroll.payroll_type TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON payroll.processing_type TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON payroll.payroll_run TO sgp_smoke_rls;
  GRANT SELECT, INSERT, UPDATE, DELETE ON payroll.employee_payroll_item TO sgp_smoke_rls;
  GRANT SELECT ON payroll.payroll_earning_deduction TO sgp_smoke_rls;

  SELECT id INTO v_employee_id
  FROM hr.employee
  WHERE tenant_id = tenant_a
    AND employment_link_id IS NOT NULL
    AND salary_reference_id IS NOT NULL
  ORDER BY created_at, id
  LIMIT 1;
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'CALC-05 smoke requires one tenant A payroll-ready employee';
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_a::text, true);
  PERFORM set_config('app.current_tenant', tenant_a::text, true);
  PERFORM set_config('app.current_permissions', 'payroll.run.execute' || chr(10) || 'rh.vacation.payout', true);

  INSERT INTO hr.vacation_record (
    id, tenant_id, employee_id, accrual_period_start, accrual_period_end,
    installment_number, pecuniary_bonus_days, starts_on, ends_on, days, status
  )
  VALUES (
    v_vacation_id, tenant_a, v_employee_id, DATE '2025-01-01', DATE '2025-12-31',
    1, 0, CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '39 days',
    30, 'aprovado'
  );

  SELECT amount INTO salary_amount
  FROM payroll_calc.compute_ferias(tenant_a, v_vacation_id)
  WHERE item_code = 'VACATION_SALARY';
  IF salary_amount IS NULL OR salary_amount <= 0 THEN
    RAISE EXCEPTION 'Expected CALC-05 vacation salary amount, found %', salary_amount;
  END IF;

  SET LOCAL ROLE sgp_smoke_rls;
  UPDATE hr.vacation_record SET payroll_run_id = NULL WHERE id = v_vacation_id;
  RESET ROLE;

  SELECT payroll.process_due_vacation_payroll() INTO linked_count;
  IF linked_count < 1 THEN
    RAISE EXCEPTION 'Expected due vacation payroll job to process at least 1 record';
  END IF;

  SELECT payroll_run_id INTO v_payroll_run_id
  FROM hr.vacation_record
  WHERE id = v_vacation_id;
  IF v_payroll_run_id IS NULL THEN
    RAISE EXCEPTION 'Expected vacation_record.payroll_run_id to be set';
  END IF;

  PERFORM set_config('app.current_tenant_id', tenant_b::text, true);
  PERFORM set_config('app.current_tenant', tenant_b::text, true);
  PERFORM set_config('app.current_permissions', 'rh.vacation.payout' || chr(10) || 'payroll.run.execute', true);
  SET LOCAL ROLE sgp_smoke_rls;
  SELECT count(*) INTO visible_count
  FROM hr.vacation_record
  WHERE id = v_vacation_id;
  RESET ROLE;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Expected tenant B to see 0 vacation payroll rows from tenant A, found %', visible_count;
  END IF;
END
$$;
    `,
  );
  console.log('[db-smoke] validated CALC-05 vacation payroll compute, link, and RLS');

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
