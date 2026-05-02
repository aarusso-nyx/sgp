#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedDir = resolve(__dirname, '../../database/seed');

async function readJson(filename) {
  const raw = await readFile(resolve(seedDir, filename), 'utf8');
  return JSON.parse(raw);
}

async function queryOne(client, sql, params) {
  const result = await client.query(sql, params);
  if (!result.rows[0]) {
    throw new Error(`Expected one row for query: ${sql}`);
  }
  return result.rows[0];
}

function requiredMapValue(map, key, label) {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Missing ${label} reference: ${key}`);
  }
  return value;
}

async function upsertAccessProfiles(client, payload) {
  const profileIdByCode = new Map();
  for (const profile of payload.profiles ?? []) {
    const row = await queryOne(
      client,
      `
      INSERT INTO public.access_profile (tenant_id, code, name, description, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = now()
      RETURNING id
      `,
      [profile.code, profile.name, profile.description ?? ''],
    );
    profileIdByCode.set(profile.code, row.id);
  }
  return profileIdByCode;
}

async function upsertPermissions(client, payload) {
  const permissionIdByKey = new Map();
  for (const permission of payload.permissions ?? []) {
    const row = await queryOne(
      client,
      `
      INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (key) DO UPDATE
      SET
        module_key = EXCLUDED.module_key,
        resource_key = EXCLUDED.resource_key,
        action_key = EXCLUDED.action_key,
        route_pattern = EXCLUDED.route_pattern,
        description = EXCLUDED.description,
        updated_at = now()
      RETURNING id
      `,
      [
        permission.key,
        permission.moduleKey,
        permission.resourceKey,
        permission.actionKey,
        permission.routePattern ?? null,
        permission.description ?? '',
      ],
    );
    permissionIdByKey.set(permission.key, row.id);
  }
  return permissionIdByKey;
}

async function upsertProfilePermissions(client, payload, profileIdByCode, permissionIdByKey) {
  for (const [profileCode, permissionKeys] of Object.entries(payload.profilePermissions ?? {})) {
    if (permissionKeys.includes('*')) {
      for (const permissionId of permissionIdByKey.values()) {
        await client.query(
        `
        INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
        VALUES ($1, $2, true)
        ON CONFLICT (profile_id, permission_id) DO UPDATE
        SET allowed = EXCLUDED.allowed
        `,
        [requiredMapValue(profileIdByCode, profileCode, 'profile code'), permissionId],
      );
      }
      continue;
    }

    for (const permissionKey of permissionKeys) {
      await client.query(
        `
        INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
        VALUES ($1, $2, true)
        ON CONFLICT (profile_id, permission_id) DO UPDATE
        SET allowed = EXCLUDED.allowed
        `,
        [
          requiredMapValue(profileIdByCode, profileCode, 'profile code'),
          requiredMapValue(permissionIdByKey, permissionKey, 'permission key'),
        ],
      );
    }
  }
}

async function upsertCanonicalFormulaAttributes(client) {
  const attributes = [
    ['SALARIO_BASE', 'Salario base vigente do servidor', 'decimal', '0'],
    ['CARGA_HORARIA', 'Carga horaria diaria do turno do servidor', 'decimal', '0'],
    ['DEPENDENTES', 'Quantidade de dependentes de IRRF ativos', 'int', '0'],
    ['BASE_RPPS', 'Base previdenciaria RPPS da competencia', 'decimal', '0'],
    ['BASE_IRRF', 'Base de IRRF da competencia', 'decimal', '0'],
    ['TEMPO_SERVICO_ANOS', 'Tempo de servico em anos completos', 'int', '0'],
  ];

  for (const [code, description, valueType, defaultValue] of attributes) {
    await client.query(
      `
      INSERT INTO payroll.formula_attribute (
        tenant_id,
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
      SELECT
        public.sgp_current_tenant_uuid(),
        payload.code,
        payload.description,
        payload.code,
        payload.value_type,
        payload.value_type::payroll.formula_attribute_value_type,
        payload.default_value,
        true,
        'canonical',
        payload.code,
        'ACTIVE'::"RecordStatus"
      FROM (
        SELECT
          $1::text AS code,
          $2::text AS description,
          $3::text AS value_type,
          $4::text AS default_value
      ) AS payload
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        description = EXCLUDED.description,
        name = EXCLUDED.name,
        data_type = EXCLUDED.data_type,
        value_type = EXCLUDED.value_type,
        default_value = EXCLUDED.default_value,
        required = EXCLUDED.required,
        source_scope = EXCLUDED.source_scope,
        expression_hint = EXCLUDED.expression_hint,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [code, description, valueType, defaultValue],
    );
  }
}

async function upsertMasterData(client, payload) {
  const md = payload.masterData ?? {};

  for (const row of md.company ?? []) {
    await client.query(
      `
      INSERT INTO hr.company (tenant_id, code, legal_name, trade_name, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        legal_name = EXCLUDED.legal_name,
        trade_name = EXCLUDED.trade_name,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [row.code, row.legalName, row.tradeName ?? null],
    );
  }

  for (const row of md.branches ?? []) {
    const companyId = (
      await queryOne(client, `SELECT id FROM hr.company WHERE code = $1`, ['SGP'])
    ).id;
    await client.query(
      `
      INSERT INTO hr.branch (tenant_id, company_id, code, acronym, name, branch_type, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, $4, $5::"BranchType", 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        company_id = EXCLUDED.company_id,
        acronym = EXCLUDED.acronym,
        name = EXCLUDED.name,
        branch_type = EXCLUDED.branch_type,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [companyId, row.code, row.acronym ?? null, row.name, row.branchType ?? 'BRANCH'],
    );
  }

  for (const row of md.functionalStatuses ?? []) {
    await client.query(
      `
      INSERT INTO hr.functional_status (tenant_id, code, description, enters_payroll, lifecycle_status, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, $4::"EmployeeLifecycleStatus", 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        description = EXCLUDED.description,
        enters_payroll = EXCLUDED.enters_payroll,
        lifecycle_status = EXCLUDED.lifecycle_status,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [row.code, row.description, row.entersPayroll ?? false, row.lifecycleStatus ?? 'ACTIVE'],
    );
  }

  for (const row of md.employmentLinks ?? []) {
    await client.query(
      `
      INSERT INTO hr.employment_link (tenant_id, code, name, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [row.code, row.name],
    );
  }

  for (const row of md.contractTypes ?? []) {
    await client.query(
      `
      INSERT INTO hr.contract_type (tenant_id, code, name, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [row.code, row.name],
    );
  }

  for (const row of md.payrollTypes ?? []) {
    await client.query(
      `
      INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [row.code, row.description],
    );
  }

  for (const row of md.processingTypes ?? []) {
    const payrollTypeId = (
      await queryOne(client, `SELECT id FROM payroll.payroll_type WHERE code = $1`, [row.payrollTypeCode])
    ).id;
    await client.query(
      `
      INSERT INTO payroll.processing_type (tenant_id, code, description, payroll_type_id, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        description = EXCLUDED.description,
        payroll_type_id = EXCLUDED.payroll_type_id,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [row.code, row.description, payrollTypeId],
    );
  }

  for (const row of md.earningDeductions ?? []) {
    await client.query(
      `
      INSERT INTO payroll.payroll_earning_deduction (tenant_id, code, description, kind, taxable, active)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3::"PayrollEntryKind", $4, true)
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        description = EXCLUDED.description,
        kind = EXCLUDED.kind,
        taxable = EXCLUDED.taxable,
        active = EXCLUDED.active,
        updated_at = now()
      `,
      [row.code, row.description, row.kind, row.taxable ?? false],
    );
  }

  for (const row of md.documentTypes ?? []) {
    await client.query(
      `
      INSERT INTO public.document_type (tenant_id, code, description, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [row.code, row.description],
    );
  }

  for (const row of md.reportDefinitions ?? []) {
    await client.query(
      `
      INSERT INTO public.report_definition (tenant_id, code, module_key, name, description, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, $4, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        module_key = EXCLUDED.module_key,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [row.code, row.moduleKey, row.name, row.description ?? ''],
    );
  }
}

async function upsertFixtureScenarios(client, payload, profileIdByCode) {
  const fx = payload;

  for (const user of fx.testUsers ?? []) {
    const userRow = await queryOne(
      client,
      `
      INSERT INTO public.user_account (tenant_id, login, name, email, cognito_sub, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, $4, 'ACTIVE'::"UserStatus")
      ON CONFLICT (tenant_id, login) DO UPDATE
      SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        cognito_sub = EXCLUDED.cognito_sub,
        status = EXCLUDED.status,
        updated_at = now()
      RETURNING id
      `,
      [user.login, user.name, user.email ?? null, user.cognitoSub ?? null],
    );

    for (const profileCode of user.profiles ?? []) {
      await client.query(
        `
        INSERT INTO public.profile_assignment (user_id, profile_id, starts_at)
        VALUES ($1, $2, to_timestamp(0))
        ON CONFLICT (user_id, profile_id, starts_at) DO NOTHING
        `,
        [userRow.id, requiredMapValue(profileIdByCode, profileCode, 'profile code')],
      );
    }
  }

  for (const employee of fx.employees ?? []) {
    const branchId = (
      await queryOne(client, `SELECT id FROM hr.branch WHERE code = $1`, [employee.branchCode])
    ).id;
    const functionalStatusId = (
      await queryOne(client, `SELECT id FROM hr.functional_status WHERE code = $1`, [
        employee.functionalStatusCode,
      ])
    ).id;
    const employmentLinkId = (
      await queryOne(client, `SELECT id FROM hr.employment_link WHERE code = $1`, [
        employee.employmentLinkCode,
      ])
    ).id;
    const contractTypeId = (
      await queryOne(client, `SELECT id FROM hr.contract_type WHERE code = $1`, [
        employee.contractTypeCode,
      ])
    ).id;

    await client.query(
      `
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
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, $4, $5, $6, $7, 'ACTIVE'::"EmployeeLifecycleStatus")
      ON CONFLICT (tenant_id, registration) DO UPDATE
      SET
        name = EXCLUDED.name,
        cpf = EXCLUDED.cpf,
        branch_id = EXCLUDED.branch_id,
        functional_status_id = EXCLUDED.functional_status_id,
        employment_link_id = EXCLUDED.employment_link_id,
        contract_type_id = EXCLUDED.contract_type_id,
        updated_at = now()
      `,
      [
        employee.registration,
        employee.name,
        employee.cpf ?? null,
        branchId,
        functionalStatusId,
        employmentLinkId,
        contractTypeId,
      ],
    );
  }

  for (const payrollRun of fx.payrollRuns ?? []) {
    const branchId = (
      await queryOne(client, `SELECT id FROM hr.branch WHERE code = $1`, [payrollRun.branchCode])
    ).id;
    const payrollTypeId = (
      await queryOne(client, `SELECT id FROM payroll.payroll_type WHERE code = $1`, [
        payrollRun.payrollTypeCode,
      ])
    ).id;
    const processingTypeId = (
      await queryOne(client, `SELECT id FROM payroll.processing_type WHERE code = $1`, [
        payrollRun.processingTypeCode,
      ])
    ).id;

    await client.query(
      `
      INSERT INTO payroll.payroll_run (
        tenant_id,
        competence_year,
        competence_month,
        branch_id,
        payroll_type_id,
        processing_type_id,
        status
      )
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, $4, $5, $6::"PayrollRunStatus")
      ON CONFLICT (tenant_id, competence_year, competence_month, branch_id, payroll_type_id, processing_type_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [
        payrollRun.competenceYear,
        payrollRun.competenceMonth,
        branchId,
        payrollTypeId,
        processingTypeId,
        payrollRun.status ?? 'DRAFT',
      ],
    );
  }

  for (const institution of fx.convenio?.institutions ?? []) {
    await client.query(
      `
      INSERT INTO hr.education_institution (tenant_id, code, name, cnpj, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        name = EXCLUDED.name,
        cnpj = EXCLUDED.cnpj,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [institution.code, institution.name, institution.cnpj ?? null],
    );
  }

  for (const program of fx.convenio?.programs ?? []) {
    const institutionId = (
      await queryOne(client, `SELECT id FROM hr.education_institution WHERE code = $1`, [
        program.institutionCode,
      ])
    ).id;
    await client.query(
      `
      INSERT INTO hr.internship_program (tenant_id, institution_id, code, name, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        institution_id = EXCLUDED.institution_id,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [institutionId, program.code, program.name],
    );
  }

  for (const agreement of fx.convenio?.agreements ?? []) {
    const institutionId = (
      await queryOne(client, `SELECT id FROM hr.education_institution WHERE code = $1`, [
        agreement.institutionCode,
      ])
    ).id;
    const programId = (
      await queryOne(client, `SELECT id FROM hr.internship_program WHERE code = $1`, [
        agreement.programCode,
      ])
    ).id;
    await client.query(
      `
      INSERT INTO hr.agreement (tenant_id, code, institution_id, program_id, status)
      VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, $4::"AgreementStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        institution_id = EXCLUDED.institution_id,
        program_id = EXCLUDED.program_id,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [agreement.code, institutionId, programId, agreement.status ?? 'ACTIVE'],
    );
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set before running the seed script.');
  }

  const permissions = await readJson('permission-catalog.json');
  const masterData = await readJson('master-data-baseline.json');
  const fixtures = await readJson('fixture-scenarios.json');
  const tenant = fixtures.tenant ?? {
    id: '00000000-0000-0000-0000-000000000100',
    slug: 'default',
    code: 'DEFAULT',
    name: 'Default Tenant',
  };

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.bypass_rls', 'true', true)`);
    await client.query(
      `
      INSERT INTO public.tenant (id, slug, code, name, status)
      VALUES ($1::uuid, $2, $3, $4, 'ACTIVE'::"RecordStatus")
      ON CONFLICT (id) DO UPDATE
      SET
        slug = EXCLUDED.slug,
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = now()
      `,
      [tenant.id, tenant.slug, tenant.code, tenant.name],
    );
    await client.query(
      `SELECT set_config('app.current_tenant_id', $1, true)`,
      [tenant.id],
    );
    await client.query(
      `SELECT set_config('app.current_tenant', $1, true)`,
      [tenant.id],
    );
    const profileIdByCode = await upsertAccessProfiles(client, permissions);
    const permissionIdByKey = await upsertPermissions(client, permissions);
    await upsertProfilePermissions(client, permissions, profileIdByCode, permissionIdByKey);
    await upsertCanonicalFormulaAttributes(client);
    await upsertMasterData(client, masterData);
    await upsertFixtureScenarios(client, fixtures, profileIdByCode);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[db:seed] failed:', error.message);
  process.exit(1);
});
