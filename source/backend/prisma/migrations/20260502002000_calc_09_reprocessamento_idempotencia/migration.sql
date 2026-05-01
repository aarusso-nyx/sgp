ALTER TABLE payroll.employee_payroll_item
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

CREATE OR REPLACE FUNCTION payroll.employee_payroll_item_idempotency_key(
  p_tenant_id uuid,
  p_competence_year integer,
  p_competence_month integer,
  p_payroll_run_id uuid,
  p_employee_id uuid,
  p_earning_deduction_id uuid,
  p_source public."PayrollEntrySource"
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_source = 'CALCULATED'::public."PayrollEntrySource"
      AND p_payroll_run_id IS NOT NULL
    THEN
      p_tenant_id::text || ':' ||
      p_competence_year::text || ':' ||
      lpad(p_competence_month::text, 2, '0') || ':' ||
      p_payroll_run_id::text || ':' ||
      p_employee_id::text || ':' ||
      p_earning_deduction_id::text || ':' ||
      p_source::text
    ELSE NULL
  END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'payroll'
      AND table_name = 'employee_payroll_item'
      AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE payroll.employee_payroll_item
      ADD COLUMN idempotency_key text GENERATED ALWAYS AS (
        payroll.employee_payroll_item_idempotency_key(
          tenant_id,
          competence_year,
          competence_month,
          payroll_run_id,
          employee_id,
          earning_deduction_id,
          source
        )
      ) STORED;
  END IF;
END
$$;

WITH duplicated_active_lines AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY idempotency_key
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS duplicate_rank
  FROM payroll.employee_payroll_item
  WHERE deleted_at IS NULL
    AND idempotency_key IS NOT NULL
)
UPDATE payroll.employee_payroll_item item
SET deleted_at = now(),
    deleted_reason = 'calc09.migration.duplicate_active_idempotency',
    updated_at = now()
FROM duplicated_active_lines duplicated
WHERE item.id = duplicated.id
  AND duplicated.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS employee_payroll_item_active_idempotency_uq
  ON payroll.employee_payroll_item (idempotency_key)
  WHERE deleted_at IS NULL
    AND idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS employee_payroll_item_active_run_idx
  ON payroll.employee_payroll_item (payroll_run_id, employee_id)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW payroll.v_payroll_run_line_active
WITH (security_invoker = true) AS
SELECT *
FROM payroll.employee_payroll_item
WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION payroll.block_generated_payroll_item_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_payroll_run_id uuid;
  v_status public."PayrollRunStatus";
BEGIN
  IF public.sgp_bypass_rls() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_payroll_run_id := COALESCE(NEW.payroll_run_id, OLD.payroll_run_id);
  IF v_payroll_run_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT status INTO v_status
  FROM payroll.payroll_run
  WHERE id = v_payroll_run_id;

  IF v_status = 'GENERATED'::public."PayrollRunStatus" THEN
    RAISE EXCEPTION 'payroll run % is GENERATED and cannot have payroll items changed', v_payroll_run_id
      USING ERRCODE = '55000';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS block_generated_payroll_item_change ON payroll.employee_payroll_item;
CREATE TRIGGER block_generated_payroll_item_change
  BEFORE INSERT OR UPDATE OR DELETE ON payroll.employee_payroll_item
  FOR EACH ROW EXECUTE FUNCTION payroll.block_generated_payroll_item_change();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'payroll_run',
    'payroll_run_status_history',
    'employee_payroll_item',
    'payroll_financial_record',
    'payroll_run_work_location'
  ]
  LOOP
    EXECUTE format('ALTER TABLE payroll.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE payroll.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', 'calc09_' || table_name || '_select', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON payroll.%I FOR SELECT USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''folha.read'', ''folha.write'', ''payroll.run.execute'', ''auditoria.read''])))',
      'calc09_' || table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', 'calc09_' || table_name || '_write', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON payroll.%I FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''folha.write'', ''payroll.run.execute'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''folha.write'', ''payroll.run.execute''])))',
      'calc09_' || table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;
