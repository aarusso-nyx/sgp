CREATE TYPE hr.alimony_calculation_basis AS ENUM ('GROSS', 'NET', 'BASE_SPECIFIC');
CREATE TYPE hr.employee_alimony_status AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED');

ALTER TABLE hr.employee_alimony
  ADD COLUMN IF NOT EXISTS court_order_number text,
  ADD COLUMN IF NOT EXISTS court_id text,
  ADD COLUMN IF NOT EXISTS judge_name text,
  ADD COLUMN IF NOT EXISTS beneficiary_bank_code smallint,
  ADD COLUMN IF NOT EXISTS beneficiary_branch text,
  ADD COLUMN IF NOT EXISTS beneficiary_account text,
  ADD COLUMN IF NOT EXISTS judicial_account boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS calculation_basis hr.alimony_calculation_basis NOT NULL DEFAULT 'GROSS',
  ADD COLUMN IF NOT EXISTS rate numeric(18, 6),
  ADD COLUMN IF NOT EXISTS fixed_amount numeric(14, 2),
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS valid_to date,
  ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_specific_codes text[] NOT NULL DEFAULT ARRAY[]::text[];

UPDATE hr.employee_alimony
SET court_order_number = COALESCE(court_order_number, court_process_number),
    fixed_amount = COALESCE(fixed_amount, NULLIF(amount, 0)),
    valid_from = COALESCE(valid_from, starts_on),
    valid_to = COALESCE(valid_to, ends_on);

ALTER TABLE hr.employee_alimony
  ALTER COLUMN valid_from SET NOT NULL,
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE hr.employee_alimony_status
    USING CASE
      WHEN status::text = 'ACTIVE' THEN 'ACTIVE'::hr.employee_alimony_status
      WHEN status::text = 'INACTIVE' THEN 'SUSPENDED'::hr.employee_alimony_status
      ELSE 'TERMINATED'::hr.employee_alimony_status
    END,
  ALTER COLUMN status SET DEFAULT 'ACTIVE'::hr.employee_alimony_status;

ALTER TABLE hr.employee_alimony
  ADD CONSTRAINT employee_alimony_amount_source_check
  CHECK (
    (fixed_amount IS NOT NULL AND rate IS NULL)
    OR (fixed_amount IS NULL AND rate IS NOT NULL)
  ) NOT VALID,
  ADD CONSTRAINT employee_alimony_rate_check
  CHECK (rate IS NULL OR (rate > 0 AND rate <= 100)) NOT VALID,
  ADD CONSTRAINT employee_alimony_fixed_amount_check
  CHECK (fixed_amount IS NULL OR fixed_amount >= 0) NOT VALID,
  ADD CONSTRAINT employee_alimony_valid_range_check
  CHECK (valid_to IS NULL OR valid_to >= valid_from) NOT VALID;

CREATE TABLE hr.employee_alimony_history (
  history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE RESTRICT,
  alimony_id uuid NOT NULL REFERENCES hr.employee_alimony(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE CASCADE,
  operation text NOT NULL,
  versioned_at timestamptz NOT NULL DEFAULT now(),
  versioned_by text,
  previous_record jsonb NOT NULL,
  CONSTRAINT employee_alimony_history_operation_check CHECK (operation IN ('UPDATE', 'DELETE'))
);

CREATE INDEX employee_alimony_tenant_employee_status_idx
  ON hr.employee_alimony (tenant_id, employee_id, status, priority, valid_from);
CREATE INDEX employee_alimony_beneficiary_cpf_idx
  ON hr.employee_alimony (tenant_id, beneficiary_cpf)
  WHERE beneficiary_cpf IS NOT NULL;
CREATE INDEX employee_alimony_history_alimony_idx
  ON hr.employee_alimony_history (tenant_id, alimony_id, versioned_at DESC);

CREATE OR REPLACE FUNCTION hr.sgp_employee_alimony_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
  v_tenant_id uuid;
  v_action text;
BEGIN
  v_id := COALESCE(NEW.id, OLD.id);
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  v_action := CASE
    WHEN TG_OP = 'DELETE' THEN 'DELETE'
    WHEN TG_OP = 'INSERT' THEN 'CREATE'
    ELSE 'UPDATE'
  END;

  PERFORM set_config('app.current_tenant_id', COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), v_tenant_id::text), true);

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    INSERT INTO hr.employee_alimony_history (
      tenant_id,
      alimony_id,
      employee_id,
      operation,
      versioned_by,
      previous_record
    )
    VALUES (
      OLD.tenant_id,
      OLD.id,
      OLD.employee_id,
      TG_OP,
      public.sgp_current_user_sub(),
      to_jsonb(OLD)
    );
  END IF;

  PERFORM public.sgp_append_audit_event(
    v_action,
    'hr.employee_alimony',
    v_id::text,
    NULL,
    public.sgp_current_user_sub(),
    public.sgp_current_setting_text('app.current_login'),
    'hr.employee_alimony',
    public.sgp_current_setting_text('app.request_id'),
    jsonb_build_object('operation', TG_OP, 'court_order_number', COALESCE(NEW.court_order_number, OLD.court_order_number)),
    'hr.alimony.order.mutated',
    NULL,
    NULL
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employee_alimony_audit ON hr.employee_alimony;
CREATE TRIGGER employee_alimony_audit
  AFTER INSERT OR UPDATE OR DELETE ON hr.employee_alimony
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_employee_alimony_mutation();

ALTER TABLE hr.employee_alimony ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.employee_alimony FORCE ROW LEVEL SECURITY;
ALTER TABLE hr.employee_alimony_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.employee_alimony_history FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_alimony_rw ON hr.employee_alimony;
CREATE POLICY employee_alimony_rw ON hr.employee_alimony
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['hr.alimony.read', 'hr.alimony.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['hr.alimony.write'])
    )
  );

DROP POLICY IF EXISTS employee_alimony_history_rw ON hr.employee_alimony_history;
CREATE POLICY employee_alimony_history_rw ON hr.employee_alimony_history
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['hr.alimony.read', 'hr.alimony.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['hr.alimony.write'])
    )
  );

ALTER TABLE payroll.payment_remittance_detail
  ADD COLUMN IF NOT EXISTS purpose_code text,
  ADD COLUMN IF NOT EXISTS alimony_id uuid REFERENCES hr.employee_alimony(id) ON DELETE SET NULL;

CREATE INDEX payment_remittance_detail_alimony_idx
  ON payroll.payment_remittance_detail (tenant_id, alimony_id)
  WHERE alimony_id IS NOT NULL;

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('hr.alimony.read', 'hr', 'alimony', 'read', '/api/v1/employees/*/alimonies', 'Read employee court-ordered alimony deductions and judicial beneficiary accounts.'),
  ('hr.alimony.write', 'hr', 'alimony', 'write', '/api/v1/employees/*/alimonies', 'Mutate employee court-ordered alimony deductions and preserve order history.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO payroll.payroll_earning_deduction (
  tenant_id,
  code,
  description,
  kind,
  taxable,
  active,
  incidences,
  starts_on,
  subject_to_ceiling,
  formula_alias,
  formula_function_name,
  formula_expression,
  formula_function_ddl,
  formula_dependencies,
  formula_ready
)
SELECT
  tenant.id,
  'ALIMONY_DEDUCTION',
  'Court ordered alimony deduction',
  'DEDUCTION'::"PayrollEntryKind",
  false,
  true,
  '{"monthly_payroll":true,"alimony":true,"deduction_order":"before_legal_and_consignment"}'::jsonb,
  DATE '2025-01-01',
  false,
  'alimony_deduction',
  'f_alimony_deduction',
  '0',
  'CREATE OR REPLACE FUNCTION payroll_calc.f_alimony_deduction(uuid, integer, integer) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = payroll_calc, hr, payroll, public, pg_catalog AS $function$ SELECT 0::numeric(14,2); $function$;',
  ARRAY['REFERENCE_VALUE'],
  true
FROM public.tenant tenant
ON CONFLICT (tenant_id, code) DO UPDATE
SET description = EXCLUDED.description,
    kind = EXCLUDED.kind,
    taxable = EXCLUDED.taxable,
    active = true,
    incidences = EXCLUDED.incidences,
    starts_on = EXCLUDED.starts_on,
    subject_to_ceiling = EXCLUDED.subject_to_ceiling,
    formula_alias = EXCLUDED.formula_alias,
    formula_function_name = EXCLUDED.formula_function_name,
    formula_expression = EXCLUDED.formula_expression,
    formula_function_ddl = EXCLUDED.formula_function_ddl,
    formula_dependencies = EXCLUDED.formula_dependencies,
    formula_ready = true,
    formula_error = NULL,
    updated_at = now();
