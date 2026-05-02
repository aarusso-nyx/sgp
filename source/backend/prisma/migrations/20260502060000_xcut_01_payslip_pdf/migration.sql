DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportKind') THEN
    CREATE TYPE public."ReportKind" AS ENUM ('PAYSLIP');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PdfACompliance') THEN
    CREATE TYPE public."PdfACompliance" AS ENUM ('PDF_A_1B', 'PDF_A_2B', 'NONE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SignatureKind') THEN
    CREATE TYPE public."SignatureKind" AS ENUM ('NONE', 'ICP_BRASIL_A1', 'ICP_BRASIL_A3', 'GOV_BR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayslipBatchStatus') THEN
    CREATE TYPE public."PayslipBatchStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');
  END IF;
END
$$;

ALTER TABLE public.generated_report_file
  ADD COLUMN IF NOT EXISTS report_kind public."ReportKind",
  ADD COLUMN IF NOT EXISTS competence date,
  ADD COLUMN IF NOT EXISTS employee_id uuid,
  ADD COLUMN IF NOT EXISTS payroll_run_id uuid,
  ADD COLUMN IF NOT EXISTS pdf_a_compliance public."PdfACompliance" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS signature_kind public."SignatureKind" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS retention_until date,
  ADD COLUMN IF NOT EXISTS file_hash text;

ALTER TABLE public.generated_report_file
  ADD CONSTRAINT generated_report_file_employee_fk
    FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE SET NULL,
  ADD CONSTRAINT generated_report_file_payroll_run_fk
    FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS generated_report_file_payslip_employee_idx
  ON public.generated_report_file (tenant_id, employee_id, competence)
  WHERE report_kind = 'PAYSLIP';
CREATE INDEX IF NOT EXISTS generated_report_file_payslip_run_idx
  ON public.generated_report_file (tenant_id, payroll_run_id)
  WHERE report_kind = 'PAYSLIP';
CREATE INDEX IF NOT EXISTS generated_report_file_hash_idx
  ON public.generated_report_file (file_hash);

CREATE TABLE IF NOT EXISTS public.payslip_batch (
  batch_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  competence date NOT NULL,
  payroll_run_id uuid NOT NULL REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL DEFAULT now(),
  requested_by uuid REFERENCES public.user_account(id) ON DELETE SET NULL,
  status public."PayslipBatchStatus" NOT NULL DEFAULT 'QUEUED',
  file_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  error_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payslip_batch_tenant_competence_idx
  ON public.payslip_batch (tenant_id, competence DESC, requested_at DESC);
CREATE INDEX IF NOT EXISTS payslip_batch_payroll_run_idx
  ON public.payslip_batch (payroll_run_id);

CREATE OR REPLACE FUNCTION public.sgp_current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    CASE
      WHEN public.sgp_current_setting_text('app.current_employee_id') ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN public.sgp_current_setting_text('app.current_employee_id')::uuid
      ELSE NULL
    END,
    (
      SELECT employee.id
      FROM public.user_account account
      JOIN hr.employee employee
        ON employee.tenant_id = account.tenant_id
       AND employee.cpf = account.cpf
      WHERE account.tenant_id = public.sgp_current_tenant_uuid()
        AND account.cognito_sub = public.sgp_current_user_sub()
      LIMIT 1
    )
  );
$$;

ALTER TABLE IF EXISTS public.generated_report_file ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.generated_report_file FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS generated_report_file_select ON public.generated_report_file;
CREATE POLICY generated_report_file_select ON public.generated_report_file
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(
        ARRAY[
          'relatorio.read',
          'relatorio.generate',
          'auditoria.read',
          'documents.download',
          'report.payslip.read',
          'report.payslip.write'
        ]
      )
    )
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND report_kind = 'PAYSLIP'
      AND employee_id = public.sgp_current_employee_id()
      AND public.sgp_has_any_permission(ARRAY['portal.paystub.read'])
    )
  );
DROP POLICY IF EXISTS generated_report_file_write ON public.generated_report_file;
CREATE POLICY generated_report_file_write ON public.generated_report_file
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(
        ARRAY['relatorio.generate', 'report.payslip.write']
      )
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(
        ARRAY['relatorio.generate', 'report.payslip.write']
      )
    )
  );

ALTER TABLE IF EXISTS public.payslip_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payslip_batch FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payslip_batch_select ON public.payslip_batch;
CREATE POLICY payslip_batch_select ON public.payslip_batch
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(
        ARRAY['report.payslip.read', 'report.payslip.write', 'relatorio.read', 'relatorio.generate']
      )
    )
  );
DROP POLICY IF EXISTS payslip_batch_write ON public.payslip_batch;
CREATE POLICY payslip_batch_write ON public.payslip_batch
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['report.payslip.write', 'relatorio.generate'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['report.payslip.write', 'relatorio.generate'])
    )
  );

CREATE OR REPLACE FUNCTION public.audit_report_file_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after public.generated_report_file;
  row_before public.generated_report_file;
BEGIN
  row_after := NEW;
  row_before := OLD;
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    (CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END)::text,
    'public.generated_report_file'::text,
    COALESCE(row_after.id, row_before.id)::text,
    NULL::uuid,
    NULL::text,
    NULL::text,
    'public.generated_report_file'::text,
    NULL::text,
    jsonb_build_object(
      'reportKind', COALESCE(row_after.report_kind, row_before.report_kind)::text,
      'fileHash', COALESCE(row_after.file_hash, row_before.file_hash)
    )::jsonb,
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS trg_generated_report_file_audit ON public.generated_report_file;
CREATE TRIGGER trg_generated_report_file_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.generated_report_file
  FOR EACH ROW EXECUTE FUNCTION public.audit_report_file_mutation();

CREATE OR REPLACE FUNCTION public.audit_payslip_batch_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after public.payslip_batch;
  row_before public.payslip_batch;
BEGIN
  row_after := NEW;
  row_before := OLD;
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    (CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END)::text,
    'public.payslip_batch'::text,
    COALESCE(row_after.batch_id, row_before.batch_id)::text,
    NULL::uuid,
    NULL::text,
    NULL::text,
    'public.payslip_batch'::text,
    NULL::text,
    jsonb_build_object(
      'status', COALESCE(row_after.status, row_before.status)::text,
      'fileCount', COALESCE(row_after.file_count, row_before.file_count),
      'errorCount', COALESCE(row_after.error_count, row_before.error_count)
    )::jsonb,
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS trg_payslip_batch_audit ON public.payslip_batch;
CREATE TRIGGER trg_payslip_batch_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.payslip_batch
  FOR EACH ROW EXECUTE FUNCTION public.audit_payslip_batch_mutation();
