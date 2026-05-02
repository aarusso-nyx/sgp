CREATE TYPE "PaymentReturnFileStatus" AS ENUM ('PROCESSING', 'PROCESSED', 'FAILED');

ALTER TABLE payroll.payment_remittance_detail
  ADD COLUMN IF NOT EXISTS last_occurrence_code text,
  ADD COLUMN IF NOT EXISTS last_internal_status text,
  ADD COLUMN IF NOT EXISTS last_settled_at timestamptz;

ALTER TABLE payroll.employee_payroll_item
  ADD COLUMN IF NOT EXISTS payment_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_payroll_item_payment_status_check'
  ) THEN
    ALTER TABLE payroll.employee_payroll_item
      ADD CONSTRAINT employee_payroll_item_payment_status_check
      CHECK (payment_status IS NULL OR payment_status IN ('PROCESSED', 'REJECTED', 'RETURNED'));
  END IF;
END
$$;

CREATE TABLE payroll.payment_return_file (
  return_file_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE RESTRICT,
  remittance_file_id uuid NOT NULL REFERENCES payroll.payment_remittance_file(id) ON DELETE RESTRICT,
  bank_code smallint NOT NULL,
  file_hash text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  processed_by uuid REFERENCES public.user_account(id) ON DELETE SET NULL,
  status "PaymentReturnFileStatus" NOT NULL DEFAULT 'PROCESSING',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_return_file_hash_check CHECK (file_hash ~ '^[a-f0-9]{64}$')
);

CREATE TABLE payroll.payment_return_detail (
  return_detail_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE RESTRICT,
  return_file_id uuid NOT NULL REFERENCES payroll.payment_return_file(return_file_id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  remittance_detail_id uuid NOT NULL REFERENCES payroll.payment_remittance_detail(id) ON DELETE RESTRICT,
  occurrence_code text NOT NULL,
  internal_status text NOT NULL,
  message text NOT NULL DEFAULT '',
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  amount numeric(14, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_return_detail_sequence_positive_check CHECK (sequence > 0),
  CONSTRAINT payment_return_detail_amount_nonnegative_check CHECK (amount >= 0),
  CONSTRAINT payment_return_detail_internal_status_check CHECK (
    internal_status IN (
      'ACCEPTED',
      'REJECTED_INVALID_ACCOUNT',
      'REJECTED_INSUFFICIENT_FUNDS',
      'RETURNED_OTHER'
    )
  )
);

CREATE UNIQUE INDEX payment_return_file_hash_uq
  ON payroll.payment_return_file (tenant_id, file_hash);
CREATE INDEX payment_return_file_remittance_idx
  ON payroll.payment_return_file (tenant_id, remittance_file_id, processed_at DESC);
CREATE UNIQUE INDEX payment_return_detail_return_sequence_uq
  ON payroll.payment_return_detail (tenant_id, return_file_id, sequence);
CREATE INDEX payment_return_detail_employee_idx
  ON payroll.payment_return_detail (tenant_id, employee_id, created_at DESC);

CREATE OR REPLACE FUNCTION payroll.sgp_payment_return_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
  v_tenant_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'payment_return_file' THEN
    IF TG_OP = 'DELETE' THEN
      v_id := OLD.return_file_id;
      v_tenant_id := OLD.tenant_id;
    ELSE
      v_id := NEW.return_file_id;
      v_tenant_id := NEW.tenant_id;
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      v_id := OLD.return_detail_id;
      v_tenant_id := OLD.tenant_id;
    ELSE
      v_id := NEW.return_detail_id;
      v_tenant_id := NEW.tenant_id;
    END IF;
  END IF;

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

DROP TRIGGER IF EXISTS payment_return_file_audit ON payroll.payment_return_file;
CREATE TRIGGER payment_return_file_audit
  AFTER INSERT OR UPDATE OR DELETE ON payroll.payment_return_file
  FOR EACH ROW EXECUTE FUNCTION payroll.sgp_payment_return_audit();

DROP TRIGGER IF EXISTS payment_return_detail_audit ON payroll.payment_return_detail;
CREATE TRIGGER payment_return_detail_audit
  AFTER INSERT OR UPDATE OR DELETE ON payroll.payment_return_detail
  FOR EACH ROW EXECUTE FUNCTION payroll.sgp_payment_return_audit();

ALTER TABLE payroll.payment_return_file ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.payment_return_file FORCE ROW LEVEL SECURITY;
ALTER TABLE payroll.payment_return_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll.payment_return_detail FORCE ROW LEVEL SECURITY;

CREATE POLICY payment_return_file_rw ON payroll.payment_return_file
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payment.return.read', 'payment.return.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payment.return.write'])
    )
  );

CREATE POLICY payment_return_detail_rw ON payroll.payment_return_detail
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payment.return.read', 'payment.return.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payment.return.write'])
    )
  );

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('payment.return.read', 'payment', 'return', 'read', '#!/folha/retorno-bancario/**', 'Read processed payroll CNAB return files and details.'),
  ('payment.return.write', 'payment', 'return', 'write', '#!/folha/retorno-bancario/**', 'Process payroll CNAB return files and reprocess rejected payments.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();
