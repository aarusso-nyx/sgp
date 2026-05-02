-- Step 3 revisit: tenant identity, tenant-scoped tables, and RLS-ready defaults.

CREATE TABLE IF NOT EXISTS "public"."tenant" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_slug_key" ON "public"."tenant"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_code_key" ON "public"."tenant"("code");
CREATE INDEX IF NOT EXISTS "tenant_status_idx" ON "public"."tenant"("status");

CREATE OR REPLACE FUNCTION public.sgp_current_setting_text(name text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting(name, true), '');
$$;

CREATE OR REPLACE FUNCTION public.sgp_current_tenant_uuid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN public.sgp_current_setting_text('app.current_tenant_id') ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.sgp_current_setting_text('app.current_tenant_id')::uuid
    WHEN public.sgp_current_setting_text('app.current_tenant') ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN public.sgp_current_setting_text('app.current_tenant')::uuid
    ELSE NULL
  END;
$$;

DO $$
DECLARE
  default_tenant_id CONSTANT uuid := '00000000-0000-0000-0000-000000000100';
  rec RECORD;
  fk_name text;
BEGIN
  INSERT INTO public.tenant (id, slug, code, name, status)
  VALUES (
    default_tenant_id,
    'default',
    'DEFAULT',
    'Default Tenant',
    'ACTIVE'::"RecordStatus"
  )
  ON CONFLICT (id) DO UPDATE
  SET
    slug = EXCLUDED.slug,
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    updated_at = now();

  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('public', 'user_account'),
        ('public', 'access_profile'),
        ('public', 'profile_assignment'),
        ('public', 'user_group_snapshot'),
        ('public', 'menu_item'),
        ('public', 'audit_event'),
        ('public', 'system_parameter'),
        ('public', 'document_type'),
        ('public', 'document_attachment'),
        ('public', 'document_upload_session'),
        ('public', 'report_definition'),
        ('public', 'report_request'),
        ('public', 'generated_report_file'),
        ('public', 'document_download_audit'),
        ('public', 'notification'),
        ('hr', 'company'),
        ('hr', 'branch'),
        ('hr', 'work_location'),
        ('hr', 'cost_center'),
        ('hr', 'legal_responsible'),
        ('hr', 'job_position'),
        ('hr', 'job_function'),
        ('hr', 'function_nature'),
        ('hr', 'salary_range'),
        ('hr', 'salary_reference'),
        ('hr', 'functional_status'),
        ('hr', 'employment_link'),
        ('hr', 'contract_type'),
        ('hr', 'reason'),
        ('hr', 'absence_reason'),
        ('hr', 'termination_reason'),
        ('hr', 'vacation_type'),
        ('hr', 'shift'),
        ('hr', 'union_entity'),
        ('hr', 'bank'),
        ('hr', 'legal_nature'),
        ('hr', 'legislation'),
        ('hr', 'act_classification'),
        ('hr', 'transit_benefit'),
        ('hr', 'employee'),
        ('hr', 'employee_status_history'),
        ('hr', 'employee_transfer'),
        ('hr', 'vacation_record'),
        ('hr', 'leave_record'),
        ('hr', 'education_institution'),
        ('hr', 'internship_program'),
        ('hr', 'agreement'),
        ('hr', 'internship_record'),
        ('hr', 'business_day'),
        ('hr', 'file_export_job'),
        ('hr', 'consignment_import_job'),
        ('hr', 'employee_payroll_item_import_job'),
        ('hr', 'competence_period'),
        ('payroll', 'payroll_type'),
        ('payroll', 'processing_type'),
        ('payroll', 'payroll_run'),
        ('payroll', 'payroll_run_status_history'),
        ('payroll', 'payroll_earning_deduction'),
        ('payroll', 'employee_payroll_item'),
        ('payroll', 'payroll_financial_record'),
        ('payroll', 'payment_remittance_file'),
        ('payroll', 'blocked_payment')
    ) AS t(schema_name, table_name)
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

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I.%I (tenant_id)',
      format('%s_%s_tenant_id_idx', rec.schema_name, rec.table_name),
      rec.schema_name,
      rec.table_name
    );
  END LOOP;
END
$$;

CREATE INDEX IF NOT EXISTS "user_account_tenant_login_idx"
  ON "public"."user_account"("tenant_id", "login");
CREATE INDEX IF NOT EXISTS "access_profile_tenant_code_idx"
  ON "public"."access_profile"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "menu_item_tenant_code_idx"
  ON "public"."menu_item"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "audit_event_tenant_occurred_at_idx"
  ON "public"."audit_event"("tenant_id", "occurred_at" DESC);
CREATE INDEX IF NOT EXISTS "system_parameter_tenant_module_key_idx"
  ON "public"."system_parameter"("tenant_id", "module_key");
CREATE INDEX IF NOT EXISTS "document_attachment_tenant_created_at_idx"
  ON "public"."document_attachment"("tenant_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "document_upload_session_tenant_expires_at_idx"
  ON "public"."document_upload_session"("tenant_id", "expires_at" DESC);
CREATE INDEX IF NOT EXISTS "report_definition_tenant_code_idx"
  ON "public"."report_definition"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "report_request_tenant_requested_at_idx"
  ON "public"."report_request"("tenant_id", "requested_at" DESC);
CREATE INDEX IF NOT EXISTS "generated_report_file_tenant_generated_at_idx"
  ON "public"."generated_report_file"("tenant_id", "generated_at" DESC);
CREATE INDEX IF NOT EXISTS "document_download_audit_tenant_downloaded_at_idx"
  ON "public"."document_download_audit"("tenant_id", "downloaded_at" DESC);
CREATE INDEX IF NOT EXISTS "notification_tenant_read_at_idx"
  ON "public"."notification"("tenant_id", "read_at", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "company_tenant_code_idx"
  ON "hr"."company"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "branch_tenant_code_idx"
  ON "hr"."branch"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "work_location_tenant_code_idx"
  ON "hr"."work_location"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "cost_center_tenant_code_idx"
  ON "hr"."cost_center"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "job_position_tenant_code_idx"
  ON "hr"."job_position"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "job_function_tenant_code_idx"
  ON "hr"."job_function"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "functional_status_tenant_code_idx"
  ON "hr"."functional_status"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "employment_link_tenant_code_idx"
  ON "hr"."employment_link"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "contract_type_tenant_code_idx"
  ON "hr"."contract_type"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "employee_tenant_registration_idx"
  ON "hr"."employee"("tenant_id", "registration");
CREATE INDEX IF NOT EXISTS "employee_tenant_created_at_idx"
  ON "hr"."employee"("tenant_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "employee_status_history_tenant_employee_idx"
  ON "hr"."employee_status_history"("tenant_id", "employee_id", "starts_on" DESC);
CREATE INDEX IF NOT EXISTS "employee_transfer_tenant_employee_idx"
  ON "hr"."employee_transfer"("tenant_id", "employee_id", "effective_on" DESC);
CREATE INDEX IF NOT EXISTS "vacation_record_tenant_employee_idx"
  ON "hr"."vacation_record"("tenant_id", "employee_id", "starts_on" DESC);
CREATE INDEX IF NOT EXISTS "leave_record_tenant_employee_idx"
  ON "hr"."leave_record"("tenant_id", "employee_id", "starts_on" DESC);
CREATE INDEX IF NOT EXISTS "agreement_tenant_code_idx"
  ON "hr"."agreement"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "internship_record_tenant_employee_idx"
  ON "hr"."internship_record"("tenant_id", "employee_id", "starts_on" DESC);
CREATE INDEX IF NOT EXISTS "business_day_tenant_business_date_idx"
  ON "hr"."business_day"("tenant_id", "business_date");
CREATE INDEX IF NOT EXISTS "competence_period_tenant_competence_idx"
  ON "hr"."competence_period"("tenant_id", "competence_year", "competence_month");

CREATE INDEX IF NOT EXISTS "payroll_type_tenant_code_idx"
  ON "payroll"."payroll_type"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "processing_type_tenant_code_idx"
  ON "payroll"."processing_type"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "payroll_run_tenant_competence_idx"
  ON "payroll"."payroll_run"("tenant_id", "competence_year", "competence_month", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "payroll_run_status_history_tenant_run_idx"
  ON "payroll"."payroll_run_status_history"("tenant_id", "payroll_run_id", "changed_at" DESC);
CREATE INDEX IF NOT EXISTS "payroll_earning_deduction_tenant_code_idx"
  ON "payroll"."payroll_earning_deduction"("tenant_id", "code");
CREATE INDEX IF NOT EXISTS "employee_payroll_item_tenant_competence_idx"
  ON "payroll"."employee_payroll_item"("tenant_id", "competence_year", "competence_month", "employee_id");
CREATE INDEX IF NOT EXISTS "payroll_financial_record_tenant_competence_idx"
  ON "payroll"."payroll_financial_record"("tenant_id", "competence_year", "competence_month", "employee_id");
CREATE INDEX IF NOT EXISTS "payment_remittance_file_tenant_competence_idx"
  ON "payroll"."payment_remittance_file"("tenant_id", "competence_year", "competence_month", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "blocked_payment_tenant_competence_idx"
  ON "payroll"."blocked_payment"("tenant_id", "competence_year", "competence_month", "employee_id");
