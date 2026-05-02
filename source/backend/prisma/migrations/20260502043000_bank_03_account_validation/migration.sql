CREATE TYPE hr.employee_bank_account_validation_status AS ENUM ('PENDING', 'VALID', 'REJECTED');
CREATE TYPE hr.employee_bank_account_holder_kind AS ENUM ('SELF', 'DEPENDENT');

ALTER TABLE hr.employee_dependent
  ADD COLUMN IF NOT EXISTS payroll_credit_authorized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS authorization_document_id uuid;

CREATE TABLE hr.employee_bank_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE CASCADE,
  bank_id uuid NOT NULL REFERENCES hr.bank(id) ON DELETE RESTRICT,
  agency text NOT NULL,
  agency_digit text,
  account_number text NOT NULL,
  account_digit text NOT NULL,
  holder_kind hr.employee_bank_account_holder_kind NOT NULL DEFAULT 'SELF',
  holder_cpf text NOT NULL,
  dependent_id uuid REFERENCES hr.employee_dependent(id) ON DELETE RESTRICT,
  validation_status hr.employee_bank_account_validation_status NOT NULL DEFAULT 'PENDING',
  validation_error_code text,
  validated_at timestamptz,
  validated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_bank_account_holder_consistency CHECK (
    (holder_kind = 'SELF' AND dependent_id IS NULL)
    OR (holder_kind = 'DEPENDENT' AND dependent_id IS NOT NULL)
  )
);

CREATE INDEX employee_bank_account_employee_idx
  ON hr.employee_bank_account (tenant_id, employee_id, validation_status);

CREATE TABLE hr.employee_bank_account_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES hr.employee_bank_account(id) ON DELETE CASCADE,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  before_json jsonb,
  after_json jsonb NOT NULL
);

CREATE INDEX employee_bank_account_history_account_idx
  ON hr.employee_bank_account_history (tenant_id, account_id, changed_at DESC);

CREATE OR REPLACE FUNCTION hr.sgp_employee_bank_account_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_account_id uuid;
BEGIN
  v_account_id := COALESCE(NEW.id, OLD.id);

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO hr.employee_bank_account_history (
      tenant_id,
      account_id,
      changed_by,
      before_json,
      after_json
    )
    VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.validated_by,
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW)
    );
  END IF;

  PERFORM public.sgp_append_audit_event(
    CASE WHEN TG_OP = 'DELETE' THEN 'DELETE' ELSE CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'UPDATE' END END,
    'hr.employee_bank_account',
    v_account_id::text,
    NULL,
    public.sgp_current_user_sub(),
    public.sgp_current_setting_text('app.current_login'),
    'hr.employee_bank_account',
    public.sgp_current_setting_text('app.request_id'),
    jsonb_build_object('operation', TG_OP)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER employee_bank_account_audit
  AFTER INSERT OR UPDATE OR DELETE ON hr.employee_bank_account
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_employee_bank_account_audit();

ALTER TABLE hr.employee_bank_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.employee_bank_account FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_employee_bank_account_rw ON hr.employee_bank_account;
CREATE POLICY p_employee_bank_account_rw ON hr.employee_bank_account
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['hr.bank_account.read', 'hr.bank_account.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['hr.bank_account.write'])
  );

ALTER TABLE hr.employee_bank_account_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.employee_bank_account_history FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_employee_bank_account_history_rw ON hr.employee_bank_account_history;
CREATE POLICY p_employee_bank_account_history_rw ON hr.employee_bank_account_history
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['hr.bank_account.read', 'hr.bank_account.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['hr.bank_account.write'])
  );
