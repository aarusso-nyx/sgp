-- Step 3 revisit follow-up: complete tenant coverage for omitted runtime tables
-- and rebuild business-key uniqueness as tenant-scoped.

DO $$
DECLARE
  default_tenant_id CONSTANT uuid := '00000000-0000-0000-0000-000000000100';
  rec RECORD;
  fk_name text;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('hr', 'employee_dependent', 'employee_id'),
        ('hr', 'professional_experience', 'employee_id'),
        ('hr', 'employee_frequency', 'employee_id'),
        ('hr', 'service_time_record', 'employee_id'),
        ('hr', 'employee_complement_data', 'employee_id'),
        ('hr', 'salary_level_history', 'employee_id')
    ) AS t(schema_name, table_name, employee_fk_column)
  LOOP
    IF to_regclass(format('%I.%I', rec.schema_name, rec.table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS tenant_id UUID',
      rec.schema_name,
      rec.table_name
    );
    EXECUTE format(
      'UPDATE %I.%I child
         SET tenant_id = employee.tenant_id
        FROM hr.employee employee
       WHERE child.tenant_id IS NULL
         AND child.%I = employee.id',
      rec.schema_name,
      rec.table_name,
      rec.employee_fk_column
    );
    EXECUTE format(
      'UPDATE %I.%I SET tenant_id = %L WHERE tenant_id IS NULL',
      rec.schema_name,
      rec.table_name,
      default_tenant_id::text
    );
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN tenant_id SET DEFAULT public.sgp_current_tenant_uuid()',
      rec.schema_name,
      rec.table_name
    );
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN tenant_id SET NOT NULL',
      rec.schema_name,
      rec.table_name
    );

    fk_name := format('%s_%s_tenant_fk', rec.schema_name, rec.table_name);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk_name) THEN
      EXECUTE format(
        'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenant(id)',
        rec.schema_name,
        rec.table_name,
        fk_name
      );
    END IF;
  END LOOP;
END
$$;

CREATE INDEX IF NOT EXISTS "employee_dependent_tenant_employee_idx"
  ON "hr"."employee_dependent"("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "employee_dependent_tenant_cpf_idx"
  ON "hr"."employee_dependent"("tenant_id", "cpf");
CREATE INDEX IF NOT EXISTS "professional_experience_tenant_employee_idx"
  ON "hr"."professional_experience"("tenant_id", "employee_id", "starts_on" DESC);
CREATE INDEX IF NOT EXISTS "employee_frequency_tenant_employee_idx"
  ON "hr"."employee_frequency"("tenant_id", "employee_id", "year", "month");
CREATE INDEX IF NOT EXISTS "service_time_record_tenant_employee_idx"
  ON "hr"."service_time_record"("tenant_id", "employee_id", "starts_on" DESC);
CREATE INDEX IF NOT EXISTS "employee_complement_data_tenant_employee_idx"
  ON "hr"."employee_complement_data"("tenant_id", "employee_id");
CREATE INDEX IF NOT EXISTS "salary_level_history_tenant_employee_idx"
  ON "hr"."salary_level_history"("tenant_id", "employee_id", "effective_on" DESC);

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('public', 'user_account_cognito_sub_key', 'user_account', 'tenant_id, cognito_sub'),
        ('public', 'user_account_login_key', 'user_account', 'tenant_id, login'),
        ('public', 'user_account_cpf_key', 'user_account', 'tenant_id, cpf'),
        ('public', 'user_account_email_key', 'user_account', 'tenant_id, email'),
        ('public', 'access_profile_code_key', 'access_profile', 'tenant_id, code'),
        ('public', 'menu_item_code_key', 'menu_item', 'tenant_id, code'),
        ('public', 'system_parameter_key_key', 'system_parameter', 'tenant_id, key'),
        ('public', 'document_type_code_key', 'document_type', 'tenant_id, code'),
        ('public', 'report_definition_code_key', 'report_definition', 'tenant_id, code'),
        ('hr', 'company_code_key', 'company', 'tenant_id, code'),
        ('hr', 'company_cnpj_key', 'company', 'tenant_id, cnpj'),
        ('hr', 'branch_code_key', 'branch', 'tenant_id, code'),
        ('hr', 'branch_cnpj_key', 'branch', 'tenant_id, cnpj'),
        ('hr', 'work_location_code_key', 'work_location', 'tenant_id, code'),
        ('hr', 'cost_center_code_key', 'cost_center', 'tenant_id, code'),
        ('hr', 'job_position_code_key', 'job_position', 'tenant_id, code'),
        ('hr', 'job_function_code_key', 'job_function', 'tenant_id, code'),
        ('hr', 'function_nature_code_key', 'function_nature', 'tenant_id, code'),
        ('hr', 'salary_range_code_key', 'salary_range', 'tenant_id, code'),
        ('hr', 'salary_reference_code_key', 'salary_reference', 'tenant_id, code'),
        ('hr', 'functional_status_code_key', 'functional_status', 'tenant_id, code'),
        ('hr', 'employment_link_code_key', 'employment_link', 'tenant_id, code'),
        ('hr', 'contract_type_code_key', 'contract_type', 'tenant_id, code'),
        ('hr', 'reason_code_key', 'reason', 'tenant_id, code'),
        ('hr', 'absence_reason_code_key', 'absence_reason', 'tenant_id, code'),
        ('hr', 'termination_reason_code_key', 'termination_reason', 'tenant_id, code'),
        ('hr', 'vacation_type_code_key', 'vacation_type', 'tenant_id, code'),
        ('hr', 'shift_code_key', 'shift', 'tenant_id, code'),
        ('hr', 'union_entity_code_key', 'union_entity', 'tenant_id, code'),
        ('hr', 'union_entity_cnpj_key', 'union_entity', 'tenant_id, cnpj'),
        ('hr', 'bank_code_key', 'bank', 'tenant_id, code'),
        ('hr', 'legal_nature_code_key', 'legal_nature', 'tenant_id, code'),
        ('hr', 'legislation_code_key', 'legislation', 'tenant_id, code'),
        ('hr', 'act_classification_code_key', 'act_classification', 'tenant_id, code'),
        ('hr', 'transit_benefit_code_key', 'transit_benefit', 'tenant_id, code'),
        ('hr', 'employee_registration_key', 'employee', 'tenant_id, registration'),
        ('hr', 'employee_cpf_key', 'employee', 'tenant_id, cpf'),
        ('hr', 'employee_frequency_employee_id_year_month_key', 'employee_frequency', 'tenant_id, employee_id, year, month'),
        ('hr', 'education_institution_code_key', 'education_institution', 'tenant_id, code'),
        ('hr', 'education_institution_cnpj_key', 'education_institution', 'tenant_id, cnpj'),
        ('hr', 'internship_program_code_key', 'internship_program', 'tenant_id, code'),
        ('hr', 'agreement_code_key', 'agreement', 'tenant_id, code'),
        ('hr', 'business_day_code_key', 'business_day', 'tenant_id, code'),
        ('hr', 'file_export_job_code_key', 'file_export_job', 'tenant_id, code'),
        ('hr', 'consignment_import_job_code_key', 'consignment_import_job', 'tenant_id, code'),
        ('hr', 'employee_payroll_item_import_job_code_key', 'employee_payroll_item_import_job', 'tenant_id, code'),
        ('hr', 'competence_period_code_key', 'competence_period', 'tenant_id, code'),
        ('hr', 'competence_period_competence_year_competence_month_key', 'competence_period', 'tenant_id, competence_year, competence_month'),
        ('payroll', 'payroll_type_code_key', 'payroll_type', 'tenant_id, code'),
        ('payroll', 'processing_type_code_key', 'processing_type', 'tenant_id, code'),
        ('payroll', 'payroll_run_competence_year_competence_month_branch_id_payr_key', 'payroll_run', 'tenant_id, competence_year, competence_month, branch_id, payroll_type_id, processing_type_id'),
        ('payroll', 'payroll_earning_deduction_code_key', 'payroll_earning_deduction', 'tenant_id, code')
    ) AS t(schema_name, index_name, table_name, column_list)
  LOOP
    IF to_regclass(format('%I.%I', rec.schema_name, rec.table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP INDEX IF EXISTS %I.%I', rec.schema_name, rec.index_name);
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I.%I (%s)',
      rec.index_name,
      rec.schema_name,
      rec.table_name,
      rec.column_list
    );
  END LOOP;
END
$$;

ALTER TABLE "payroll"."payroll_earning_deduction"
  ADD COLUMN IF NOT EXISTS "formula_alias" TEXT,
  ADD COLUMN IF NOT EXISTS "formula_function_name" TEXT,
  ADD COLUMN IF NOT EXISTS "formula_expression" TEXT,
  ADD COLUMN IF NOT EXISTS "formula_function_ddl" TEXT,
  ADD COLUMN IF NOT EXISTS "formula_dependencies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "formula_ready" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "formula_error" TEXT;

DROP INDEX IF EXISTS payroll.payroll_earning_deduction_formula_alias_uq;
CREATE UNIQUE INDEX IF NOT EXISTS payroll_earning_deduction_formula_alias_uq
  ON payroll.payroll_earning_deduction (tenant_id, formula_alias)
  WHERE formula_alias IS NOT NULL;

DROP INDEX IF EXISTS payroll.payroll_earning_deduction_formula_function_name_uq;
CREATE UNIQUE INDEX IF NOT EXISTS payroll_earning_deduction_formula_function_name_uq
  ON payroll.payroll_earning_deduction (tenant_id, formula_function_name)
  WHERE formula_function_name IS NOT NULL;
