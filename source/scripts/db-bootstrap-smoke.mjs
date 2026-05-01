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

  SELECT id INTO employee_a FROM hr.employee WHERE tenant_id = tenant_a LIMIT 1;
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
    employee_id,
    competence_month,
    competence_year,
    amount
  )
  VALUES (tenant_a, earning_a, employee_a, 1, 2026, 10.00)
  ON CONFLICT (earning_deduction_id, employee_id, competence_month, competence_year)
  DO UPDATE SET tenant_id = EXCLUDED.tenant_id, amount = EXCLUDED.amount, updated_at = now();

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
  PERFORM set_config('app.current_permissions', 'folha.read', true);
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
  PERFORM set_config('app.current_permissions', 'folha.read', true);
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
