#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const cwd = process.cwd();
const matrixPath = resolve(cwd, '../docs/eng/64-database-alignment-matrix.json');
const prismaSchemaPath = resolve(cwd, 'backend/prisma/schema.prisma');
const tenantMigrationPaths = [
  resolve(cwd, 'backend/prisma/migrations/20260425090000_tenant_rls_hardening/migration.sql'),
  resolve(cwd, 'backend/prisma/migrations/20260425113000_tenant_scope_completion/migration.sql'),
  resolve(cwd, 'backend/prisma/migrations/20260425170000_recruitment_module/migration.sql'),
  resolve(cwd, 'backend/prisma/migrations/20260425193000_saude_pericia_module/migration.sql'),
  resolve(cwd, 'backend/prisma/migrations/20260425233000_gestao_reference_catalogs/migration.sql'),
  resolve(cwd, 'backend/prisma/migrations/20260426003000_rh_correlates_module/migration.sql'),
  resolve(cwd, 'backend/prisma/migrations/20260426013000_folha_core_module/migration.sql'),
  resolve(cwd, 'backend/prisma/migrations/20260426030000_folha_accounting_catalogs/migration.sql'),
  resolve(
    cwd,
    'backend/prisma/migrations/20260426043000_avaliacao_consultas_previdenciario_module/migration.sql',
  ),
  resolve(cwd, 'backend/prisma/migrations/20260426070000_gestao_structure_links/migration.sql'),
  resolve(cwd, 'backend/prisma/migrations/20260426100000_residue_cluster_support/migration.sql'),
  resolve(cwd, 'backend/prisma/migrations/20260426123000_db_full_closure_residuals/migration.sql'),
];
const rlsPoliciesPath = resolve(cwd, 'database/sql/12-rls-policies.sql');
const rlsContextPath = resolve(cwd, 'database/sql/11-rls-context.sql');
const portalProjectionPath = resolve(cwd, 'database/sql/20-sgp-core.sql');
const authJwtServicePath = resolve(cwd, 'backend/src/auth/cognito-jwt.service.ts');
const databaseServicePath = resolve(cwd, 'backend/src/database/database.service.ts');
const portalServicePath = resolve(cwd, 'backend/src/portal/portal.service.ts');
const publicTransparencyServicePath = resolve(
  cwd,
  'backend/src/publico/public-transparency.service.ts',
);
const backendSrcPath = resolve(cwd, 'backend/src');
const sqlSupportPath = resolve(cwd, 'database/sql');

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');

const currentPhase = process.env.SGP_DB_ALIGNMENT_PHASE ?? 'full_closure';
const FULL_CLOSURE_PHASE = 'full_closure';

const TARGET_STATUSES = new Set(['implemented', 'canonicalized']);
const ALLOWED_STATUSES = new Set([
  'implemented',
  'canonicalized',
  'deferred',
  'explicitly_excluded',
]);
const ALLOWED_PHASES = new Set([
  'phase_1_core',
  'phase_2_core',
  'phase_3_core',
  'post_phase_1',
  'out_of_scope',
]);
const PHASE_ORDER = ['phase_1_core', 'phase_2_core', 'phase_3_core', 'post_phase_1'];
const APPROVED_OUT_OF_SCOPE_EXCLUSIONS = new Set(['dbo.sysdiagrams']);
const TENANT_SCOPED_TABLES = [
  ['public', 'user_account'],
  ['public', 'access_profile'],
  ['public', 'profile_assignment'],
  ['public', 'user_group_snapshot'],
  ['public', 'menu_item'],
  ['public', 'audit_event'],
  ['public', 'system_parameter'],
  ['public', 'document_type'],
  ['public', 'tax_rate'],
  ['public', 'document_attachment'],
  ['public', 'document_upload_session'],
  ['public', 'esocial_event'],
  ['public', 'report_definition'],
  ['public', 'report_request'],
  ['public', 'generated_report_file'],
  ['public', 'document_download_audit'],
  ['public', 'notification'],
  ['hr', 'company'],
  ['hr', 'branch'],
  ['hr', 'work_location'],
  ['hr', 'cost_center'],
  ['hr', 'legal_responsible'],
  ['hr', 'job_position'],
  ['hr', 'job_function'],
  ['hr', 'function_nature'],
  ['hr', 'salary_range'],
  ['hr', 'salary_reference'],
  ['hr', 'functional_status'],
  ['hr', 'employment_link'],
  ['hr', 'contract_type'],
  ['hr', 'reason'],
  ['hr', 'absence_reason'],
  ['hr', 'termination_reason'],
  ['hr', 'vacation_type'],
  ['hr', 'shift'],
  ['hr', 'shift_day_off'],
  ['hr', 'union_entity'],
  ['hr', 'bank'],
  ['hr', 'legal_nature'],
  ['hr', 'legislation'],
  ['hr', 'job_function_legislation_history'],
  ['hr', 'act_classification'],
  ['hr', 'transit_benefit'],
  ['hr', 'reference_catalog_entry'],
  ['hr', 'health_provider_agreement_link'],
  ['hr', 'health_exam_provider_exam_link'],
  ['hr', 'salary_range_level'],
  ['hr', 'consignment_entity'],
  ['hr', 'service_provider'],
  ['hr', 'service_taker'],
  ['hr', 'job_structure_reference_link'],
  ['hr', 'job_structure_employment_link'],
  ['hr', 'work_location_structure_assignment'],
  ['hr', 'training_suggestion'],
  ['hr', 'training_suggestion_complement'],
  ['hr', 'training_suggestion_employee'],
  ['hr', 'training_suggestion_cost'],
  ['hr', 'employee'],
  ['hr', 'employee_dependent'],
  ['hr', 'employee_status_history'],
  ['hr', 'professional_experience'],
  ['hr', 'employee_transfer'],
  ['hr', 'employee_frequency'],
  ['hr', 'service_time_record'],
  ['hr', 'vacation_record'],
  ['hr', 'leave_record'],
  ['hr', 'employee_benefit_dependent'],
  ['hr', 'employee_union_contribution'],
  ['hr', 'employee_exercise'],
  ['hr', 'employee_alimony'],
  ['hr', 'employee_transit_benefit'],
  ['hr', 'administrative_process'],
  ['hr', 'administrative_process_function'],
  ['hr', 'employee_complement_data'],
  ['hr', 'salary_level_history'],
  ['hr', 'education_institution'],
  ['hr', 'internship_program'],
  ['hr', 'agreement'],
  ['hr', 'internship_record'],
  ['hr', 'recruitment_request'],
  ['hr', 'recruitment_request_function'],
  ['hr', 'recruitment_candidate'],
  ['hr', 'medical_appointment'],
  ['hr', 'medical_record'],
  ['hr', 'medical_leave'],
  ['hr', 'work_accident'],
  ['hr', 'performance_evaluation'],
  ['hr', 'merit_progression'],
  ['hr', 'salary_simulation'],
  ['hr', 'career_plan'],
  ['hr', 'salary_simulation_adjustment'],
  ['hr', 'retirement_rule'],
  ['hr', 'retirement_simulation'],
  ['hr', 'retirement_grant'],
  ['hr', 'pension_grant'],
  ['hr', 'contribution_time_certificate'],
  ['hr', 'previdentiary_declaration'],
  ['hr', 'pension_compensation'],
  ['hr', 'recertification_campaign'],
  ['hr', 'recertification_beneficiary'],
  ['hr', 'recertification_record'],
  ['hr', 'external_life_proof'],
  ['hr', 'beneficiary_contact_history'],
  ['hr', 'business_day'],
  ['hr', 'file_export_job'],
  ['hr', 'consignment_import_job'],
  ['hr', 'employee_payroll_item_import_job'],
  ['hr', 'competence_period'],
  ['payroll', 'payroll_type'],
  ['payroll', 'processing_type'],
  ['payroll', 'payroll_run'],
  ['payroll', 'payroll_run_status_history'],
  ['payroll', 'formula_attribute'],
  ['payroll', 'job_position_earning'],
  ['payroll', 'job_function_earning'],
  ['payroll', 'professional_category_earning'],
  ['payroll', 'employment_link_earning'],
  ['payroll', 'payroll_type_earning'],
  ['payroll', 'gps_payment_code'],
  ['payroll', 'sefip_code'],
  ['payroll', 'accounting_history'],
  ['payroll', 'simple_account'],
  ['payroll', 'accounting_account'],
  ['payroll', 'accounting_account_work_location'],
  ['payroll', 'payroll_earning_deduction'],
  ['payroll', 'employee_payroll_item'],
  ['payroll', 'payroll_financial_record'],
  ['payroll', 'payroll_run_work_location'],
  ['payroll', 'advance_request'],
  ['payroll', 'advance_payment'],
  ['payroll', 'payment_remittance_file'],
  ['payroll', 'blocked_payment'],
];

const findings = [];

function fail(message) {
  findings.push({ level: 'error', message });
  process.exitCode = 1;
}

function ok(message) {
  findings.push({ level: 'ok', message });
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function includesAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

function migrationMentionsTenantTable(content, schema, table) {
  const escapedSchema = schema.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedTable = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\('${escapedSchema}', '${escapedTable}'(?:,|\\))`);
  return pattern.test(content);
}

function auditForbiddenPublicRefs(path, content, forbiddenRuntimeTables) {
  const issues = [];
  for (const table of forbiddenRuntimeTables) {
    const regex = new RegExp(`\\bpublic\\.${table}\\b`);
    if (regex.test(content)) {
      issues.push(`public.${table}`);
    }
  }
  if (issues.length > 0) {
    fail(`Forbidden runtime references in ${path}: ${issues.join(', ')}`);
  }
}

function main() {
  const matrix = loadJson(matrixPath);
  const objects = Array.isArray(matrix.objects) ? matrix.objects : [];

  const invalidEntries = objects.filter(
    (entry) => !ALLOWED_STATUSES.has(entry.status) || !ALLOWED_PHASES.has(entry.phase),
  );
  if (invalidEntries.length > 0) {
    fail(
      `Matrix has invalid status/phase entries: ${invalidEntries
        .map((entry) => `${entry.legacy_object}:${entry.status}:${entry.phase}`)
        .join(', ')}`,
    );
  } else {
    ok('Matrix status/phase enums are valid.');
  }

  const duplicates = new Map();
  for (const entry of objects) {
    duplicates.set(entry.legacy_object, (duplicates.get(entry.legacy_object) ?? 0) + 1);
  }
  const duplicateKeys = [...duplicates.entries()]
    .filter(([, count]) => count > 1)
    .map(([legacyObject]) => legacyObject);
  if (duplicateKeys.length > 0) {
    fail(`Matrix has duplicated legacy_object entries: ${duplicateKeys.join(', ')}`);
  } else {
    ok('Matrix has unique legacy_object entries.');
  }

  const currentPhaseObjects =
    currentPhase === FULL_CLOSURE_PHASE
      ? objects.filter((entry) => entry.phase !== 'out_of_scope')
      : objects.filter((entry) => entry.phase === currentPhase);
  if (currentPhaseObjects.length === 0) {
    fail(`No objects found for phase "${currentPhase}" in matrix.`);
  } else {
    ok(`Phase "${currentPhase}" has ${currentPhaseObjects.length} objects.`);
  }

  const invalidStatus = currentPhaseObjects.filter((entry) => !TARGET_STATUSES.has(entry.status));
  if (invalidStatus.length > 0) {
    fail(
      `Phase "${currentPhase}" contains non-target statuses: ${invalidStatus
        .map((entry) => `${entry.legacy_object}:${entry.status}`)
        .join(', ')}`,
    );
  } else {
    ok(
      `All ${currentPhaseObjects.length} objects in ${currentPhase} are implemented/canonicalized.`,
    );
  }

  const missingCanonical = currentPhaseObjects.filter((entry) => !entry.canonical_object);
  if (missingCanonical.length > 0) {
    fail(
      `Phase "${currentPhase}" has objects without canonical mapping: ${missingCanonical
        .map((entry) => entry.legacy_object)
        .join(', ')}`,
    );
  } else {
    ok(`All ${currentPhase} objects have canonical runtime targets.`);
  }

  const deferredObjects = objects.filter((entry) => entry.status === 'deferred');
  if (deferredObjects.length > 0) {
    fail(
      `Matrix has deferred objects and must be closed (deferred=0): ${deferredObjects
        .slice(0, 30)
        .map((entry) => entry.legacy_object)
        .join(', ')}`,
    );
  } else {
    ok('Matrix closure complete: deferred=0.');
  }

  const phaseIndex =
    currentPhase === FULL_CLOSURE_PHASE
      ? PHASE_ORDER.length - 1
      : PHASE_ORDER.indexOf(currentPhase);
  if (phaseIndex < 0 && currentPhase !== FULL_CLOSURE_PHASE) {
    fail(
      `Current phase "${currentPhase}" is not in ordered in-scope phases: ${PHASE_ORDER.join(', ')}`,
    );
  }

  const inScopePhases = phaseIndex < 0 ? [] : new Set(PHASE_ORDER.slice(0, phaseIndex + 1));
  const explicitlyExcludedInScope = objects.filter(
    (entry) =>
      (currentPhase === FULL_CLOSURE_PHASE
        ? entry.phase !== 'out_of_scope'
        : inScopePhases.has(entry.phase)) &&
      entry.status === 'explicitly_excluded' &&
      !APPROVED_OUT_OF_SCOPE_EXCLUSIONS.has(entry.legacy_object),
  );
  if (explicitlyExcludedInScope.length > 0) {
    fail(
      `In-scope explicit exclusions must be zero; found ${explicitlyExcludedInScope.length}: ${explicitlyExcludedInScope
        .slice(0, 30)
        .map((entry) => entry.legacy_object)
        .join(', ')}`,
    );
  } else {
    ok('In-scope explicit exclusions are zero.');
  }

  const missingCanonicalGlobal = objects.filter(
    (entry) => TARGET_STATUSES.has(entry.status) && !entry.canonical_object,
  );
  if (missingCanonicalGlobal.length > 0) {
    fail(
      `Implemented/canonicalized objects without canonical target: ${missingCanonicalGlobal
        .slice(0, 30)
        .map((entry) => entry.legacy_object)
        .join(', ')}`,
    );
  } else {
    ok('All implemented/canonicalized objects have canonical runtime targets.');
  }

  const requiredExclusions = ['dbo.sysdiagrams'];
  let exclusionErrors = 0;

  for (const legacyObject of requiredExclusions) {
    const entry = objects.find((item) => item.legacy_object === legacyObject);
    if (!entry) {
      fail(`Missing required exclusion entry in matrix: ${legacyObject}`);
      exclusionErrors += 1;
      continue;
    }
    if (entry.status !== 'explicitly_excluded') {
      fail(`Required exclusion ${legacyObject} is not explicitly_excluded.`);
      exclusionErrors += 1;
      continue;
    }
  }

  if (exclusionErrors === 0) {
    ok('Approved out-of-scope exclusions are valid.');
  }

  const forbiddenRuntimeTables = [
    ...new Set(
      objects
        .filter((entry) => TARGET_STATUSES.has(entry.status))
        .map((entry) => entry.canonical_object)
        .filter(Boolean)
        .map((canonicalObject) => canonicalObject.toLowerCase())
        .filter(
          (canonicalObject) =>
            canonicalObject.startsWith('hr.') || canonicalObject.startsWith('payroll.'),
        )
        .map((canonicalObject) => canonicalObject.split('.')[1])
        .filter(Boolean),
    ),
  ].sort();
  if (forbiddenRuntimeTables.length === 0) {
    fail('Could not derive forbidden runtime table references from matrix.');
  } else {
    ok(
      `Derived ${forbiddenRuntimeTables.length} forbidden runtime public.* references from matrix.`,
    );
  }

  const prismaSchema = readFileSync(prismaSchemaPath, 'utf8');
  const tenantMigration = tenantMigrationPaths.map((path) => readFileSync(path, 'utf8')).join('\n');
  if (includesAny(prismaSchema, ['model NotificationCounter', '@@map("notification_counter")'])) {
    fail('Prisma schema still contains retired notification_counter contract.');
  } else {
    ok('Prisma schema does not contain retired notification_counter model.');
  }

  const rlsPolicies = readFileSync(rlsPoliciesPath, 'utf8');
  const rlsContext = readFileSync(rlsContextPath, 'utf8');
  const portalProjectionSql = readFileSync(portalProjectionPath, 'utf8');
  const authJwtService = readFileSync(authJwtServicePath, 'utf8');
  const databaseService = readFileSync(databaseServicePath, 'utf8');
  const portalService = readFileSync(portalServicePath, 'utf8');
  const publicTransparencyService = readFileSync(publicTransparencyServicePath, 'utf8');
  if (includesAny(rlsPolicies, ['notification_counter_select', 'notification_counter_write'])) {
    fail('RLS policy file still contains notification_counter policy references.');
  } else {
    ok('RLS policy file has no notification_counter policy references.');
  }

  if (!includesAny(authJwtService, ["'custom:tenant_id'", 'tenant_id'])) {
    fail('Auth JWT service does not enforce tenant claims.');
  } else {
    ok('Auth JWT service enforces JWT tenant claims.');
  }

  if (!includesAny(databaseService, ['app.current_tenant_id', 'app.current_tenant'])) {
    fail('Database service does not set tenant session context.');
  } else {
    ok('Database service sets tenant session context for every query.');
  }

  if (
    !includesAny(rlsContext, [
      'sgp_current_tenant_uuid',
      'sgp_tenant_matches',
      'sgp_has_any_permission',
    ])
  ) {
    fail('RLS helper SQL is missing tenant-aware helper functions.');
  } else {
    ok('RLS helper SQL includes tenant-aware helper functions.');
  }

  if (!rlsPolicies.includes('public.sgp_tenant_matches(tenant_id)')) {
    fail('RLS policies do not enforce tenant match predicates.');
  } else {
    ok('RLS policies enforce tenant match predicates.');
  }

  if (
    !includesAny(portalProjectionSql, [
      'tenant_id',
      'tenant_slug',
      'mv_payroll_run_summary_tenant_id_idx',
    ])
  ) {
    fail('Portal projections are missing tenant-aware columns and indexes.');
  } else {
    ok('Portal projections include tenant-aware columns and indexes.');
  }

  if (
    !includesAny(portalService, ['prs.tenant_id = public.sgp_current_tenant_uuid()']) ||
    !includesAny(publicTransparencyService, ['prs.tenant_slug = $1'])
  ) {
    fail('Portal/public runtime queries do not scope projection reads by tenant.');
  } else {
    ok('Portal/public runtime queries scope projection reads by tenant.');
  }

  const tenantCoverageGaps = TENANT_SCOPED_TABLES.filter(([schema, table]) => {
    return (
      !migrationMentionsTenantTable(tenantMigration, schema, table) || !rlsPolicies.includes(table)
    );
  });
  if (tenantCoverageGaps.length > 0) {
    fail(
      `Tenant coverage is incomplete for scoped tables: ${tenantCoverageGaps
        .slice(0, 30)
        .map(([schema, table]) => `${schema}.${table}`)
        .join(', ')}`,
    );
  } else {
    ok(`Tenant coverage is declared for ${TENANT_SCOPED_TABLES.length} scoped tables.`);
  }

  const runtimeFilePaths = execSync(
    `rg --files ${backendSrcPath} ${sqlSupportPath} backend/prisma/seed.mjs`,
    { encoding: 'utf8' },
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (const filePath of runtimeFilePaths) {
    const content = readFileSync(filePath, 'utf8');
    auditForbiddenPublicRefs(filePath, content, forbiddenRuntimeTables);
  }
  ok('No forbidden runtime public.* references for moved hr/payroll tables.');

  const output = {
    phase: currentPhase,
    ok: !(process.exitCode && process.exitCode !== 0),
    findings,
  };

  if (asJson) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  for (const finding of findings) {
    const prefix = finding.level === 'error' ? 'ERROR' : 'OK';
    console.log(`[db-alignment] ${prefix}: ${finding.message}`);
  }
  console.log(`[db-alignment] ${output.ok ? 'PASSED' : 'FAILED'}`);
}

main();
