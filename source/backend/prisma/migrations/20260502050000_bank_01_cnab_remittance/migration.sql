ALTER TYPE "PaymentRemittanceStatus" ADD VALUE IF NOT EXISTS 'RETURNED';

ALTER TABLE payroll.payment_remittance_file
  ADD COLUMN IF NOT EXISTS bank_code smallint,
  ADD COLUMN IF NOT EXISTS layout_version text,
  ADD COLUMN IF NOT EXISTS record_count integer,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS generated_by uuid,
  ALTER COLUMN total_amount TYPE numeric(14, 2);

CREATE TABLE payroll.payment_remittance_detail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE RESTRICT,
  file_id uuid NOT NULL REFERENCES payroll.payment_remittance_file(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  amount numeric(14, 2) NOT NULL,
  bank_code smallint NOT NULL,
  branch text NOT NULL,
  account text NOT NULL,
  occurrence_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_remittance_detail_amount_nonnegative_check CHECK (amount >= 0),
  CONSTRAINT payment_remittance_detail_sequence_positive_check CHECK (sequence > 0)
);

CREATE UNIQUE INDEX payment_remittance_detail_file_sequence_uq
  ON payroll.payment_remittance_detail (tenant_id, file_id, sequence);
CREATE INDEX payment_remittance_detail_employee_idx
  ON payroll.payment_remittance_detail (tenant_id, employee_id, created_at DESC);
CREATE INDEX payment_remittance_file_bank_competence_idx
  ON payroll.payment_remittance_file (tenant_id, bank_code, competence_year, competence_month);

CREATE OR REPLACE FUNCTION payroll.sgp_payment_remittance_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
  v_tenant_id uuid;
BEGIN
  v_id := COALESCE(NEW.id, OLD.id);
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);

  PERFORM set_config('app.current_tenant_id', COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), v_tenant_id::text), true);
  PERFORM public.sgp_append_audit_event(
    CASE
      WHEN TG_OP = 'DELETE' THEN 'DELETE'
      WHEN TG_OP = 'INSERT' THEN 'CREATE'
      ELSE 'UPDATE'
    END,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_id::text,
    NULL,
    public.sgp_current_user_sub(),
    public.sgp_current_setting_text('app.current_login'),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    public.sgp_current_setting_text('app.request_id'),
    jsonb_build_object('operation', TG_OP)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_remittance_file_audit ON payroll.payment_remittance_file;
CREATE TRIGGER payment_remittance_file_audit
  AFTER INSERT OR UPDATE OR DELETE ON payroll.payment_remittance_file
  FOR EACH ROW EXECUTE FUNCTION payroll.sgp_payment_remittance_audit();

DROP TRIGGER IF EXISTS payment_remittance_detail_audit ON payroll.payment_remittance_detail;
CREATE TRIGGER payment_remittance_detail_audit
  AFTER INSERT OR UPDATE OR DELETE ON payroll.payment_remittance_detail
  FOR EACH ROW EXECUTE FUNCTION payroll.sgp_payment_remittance_audit();

ALTER TABLE payroll.payment_remittance_file ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.payment_remittance_file FORCE ROW LEVEL SECURITY;
ALTER TABLE payroll.payment_remittance_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.payment_remittance_detail FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_remittance_file_select ON payroll.payment_remittance_file;
DROP POLICY IF EXISTS payment_remittance_file_write ON payroll.payment_remittance_file;
DROP POLICY IF EXISTS payment_remittance_file_rw ON payroll.payment_remittance_file;
CREATE POLICY payment_remittance_file_rw ON payroll.payment_remittance_file
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payment.remittance.read', 'payment.remittance.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payment.remittance.write'])
    )
  );

DROP POLICY IF EXISTS payment_remittance_detail_rw ON payroll.payment_remittance_detail;
CREATE POLICY payment_remittance_detail_rw ON payroll.payment_remittance_detail
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payment.remittance.read', 'payment.remittance.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payment.remittance.write'])
    )
  );

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('payment.remittance.read', 'payment', 'remittance', 'read', '#!/folha/remessa-bancaria/**', 'Read generated payroll CNAB remittance files and details.'),
  ('payment.remittance.write', 'payment', 'remittance', 'write', '#!/folha/remessa-bancaria/**', 'Generate payroll CNAB remittance files.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();
