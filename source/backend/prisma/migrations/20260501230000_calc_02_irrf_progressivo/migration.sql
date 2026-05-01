ALTER TABLE public.tax_rate
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'GENERIC',
  ADD COLUMN IF NOT EXISTS competence_start date,
  ADD COLUMN IF NOT EXISTS competence_end date,
  ADD COLUMN IF NOT EXISTS bracket_min numeric(14, 2),
  ADD COLUMN IF NOT EXISTS bracket_max numeric(14, 2),
  ADD COLUMN IF NOT EXISTS rate numeric(18, 6),
  ADD COLUMN IF NOT EXISTS deduction_amount numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dependent_deduction numeric(14, 2) NOT NULL DEFAULT 0;

UPDATE public.tax_rate
SET rate = COALESCE(rate, rate_percent);

ALTER TABLE public.tax_rate
  ALTER COLUMN rate SET DEFAULT 0,
  ALTER COLUMN rate SET NOT NULL;

CREATE INDEX IF NOT EXISTS tax_rate_irrf_competence_idx
  ON public.tax_rate (tenant_id, kind, competence_start, competence_end, bracket_min)
  WHERE kind = 'IRRF';

CREATE UNIQUE INDEX IF NOT EXISTS tax_rate_irrf_bracket_uq
  ON public.tax_rate (tenant_id, kind, competence_start, bracket_min)
  WHERE kind = 'IRRF';

ALTER TABLE public.tax_rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rate FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tax_rate_select ON public.tax_rate;
DROP POLICY IF EXISTS tax_rate_write ON public.tax_rate;
CREATE POLICY tax_rate_select ON public.tax_rate
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'gestao.read',
        'gestao.write',
        'system.tax-rate.read',
        'system.tax-rate.write'
      ])
    )
  );
CREATE POLICY tax_rate_write ON public.tax_rate
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['system.tax-rate.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['system.tax-rate.write'])
    )
  );

CREATE OR REPLACE FUNCTION payroll_calc.compute_irrf(
  p_tenant_id uuid,
  p_base_amount numeric,
  p_dependents integer,
  p_competence date
)
RETURNS numeric(14, 2)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_row public.tax_rate%ROWTYPE;
  v_base numeric;
BEGIN
  SELECT *
  INTO v_row
  FROM public.tax_rate rate
  WHERE rate.tenant_id = p_tenant_id
    AND rate.kind = 'IRRF'
    AND rate.status = 'ACTIVE'::public."RecordStatus"
    AND rate.competence_start <= p_competence
    AND (rate.competence_end IS NULL OR rate.competence_end >= p_competence)
  ORDER BY rate.competence_start DESC, rate.bracket_min ASC
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN 0.00;
  END IF;

  v_base := greatest(
    COALESCE(p_base_amount, 0) - (greatest(COALESCE(p_dependents, 0), 0) * COALESCE(v_row.dependent_deduction, 0)),
    0
  );

  SELECT *
  INTO v_row
  FROM public.tax_rate rate
  WHERE rate.tenant_id = p_tenant_id
    AND rate.kind = 'IRRF'
    AND rate.status = 'ACTIVE'::public."RecordStatus"
    AND rate.competence_start <= p_competence
    AND (rate.competence_end IS NULL OR rate.competence_end >= p_competence)
    AND rate.bracket_min <= v_base
    AND (rate.bracket_max IS NULL OR rate.bracket_max >= v_base)
  ORDER BY rate.competence_start DESC, rate.bracket_min DESC
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN 0.00;
  END IF;

  RETURN greatest(round((v_base * COALESCE(v_row.rate, 0) / 100) - COALESCE(v_row.deduction_amount, 0), 2), 0)::numeric(14, 2);
END;
$$;

CREATE OR REPLACE FUNCTION payroll_calc.base_irrf(
  p_employee_id uuid,
  p_competence date
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  WITH item_base AS (
    SELECT
      COALESCE(sum(CASE WHEN ped.kind = 'EARNING'::public."PayrollEntryKind" AND ped.taxable THEN item.amount ELSE 0 END), 0)
      - COALESCE(sum(CASE WHEN ped.kind = 'DEDUCTION'::public."PayrollEntryKind" AND (ped.code IN ('RPPS', 'RGPS', 'INSS') OR ped.incidences ? 'official_social_security') THEN item.amount ELSE 0 END), 0) AS amount
    FROM payroll.employee_payroll_item item
    JOIN payroll.payroll_earning_deduction ped ON ped.id = item.earning_deduction_id
    WHERE item.employee_id = p_employee_id
      AND item.competence_year = EXTRACT(YEAR FROM p_competence)::integer
      AND item.competence_month = EXTRACT(MONTH FROM p_competence)::integer
      AND ped.code <> 'IRRF'
  )
  SELECT CASE
    WHEN item_base.amount > 0 THEN item_base.amount
    ELSE payroll_calc.base_salary(p_employee_id, p_competence)
  END
  FROM item_base;
$$;

CREATE OR REPLACE FUNCTION payroll_calc.f_irrf_progressive(
  p_employee_id uuid,
  p_month integer,
  p_year integer
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT payroll_calc.compute_irrf(
    public.sgp_current_tenant_uuid(),
    payroll_calc.base_irrf(p_employee_id, make_date(p_year, p_month, 1)),
    payroll_calc.dependent_count(p_employee_id)::integer,
    make_date(p_year, p_month, 1)
  );
$$;

DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  FOR v_tenant_id IN SELECT id FROM public.tenant LOOP
    INSERT INTO public.tax_rate (
      tenant_id, code, name, description, scope, reference_year, rate_percent,
      kind, competence_start, competence_end, bracket_min, bracket_max, rate,
      deduction_amount, dependent_deduction, metadata, status
    )
    VALUES
      (v_tenant_id, 'IRRF-2025-01', 'IRRF 2025 faixa 1', 'Tabela progressiva mensal IRRF 2025', 'IRRF', 2025, 0.000000, 'IRRF', DATE '2025-01-01', NULL, 0.00, 2259.20, 0.000000, 0.00, 189.59, '{"source":"calc-02-initial-load"}', 'ACTIVE'::public."RecordStatus"),
      (v_tenant_id, 'IRRF-2025-02', 'IRRF 2025 faixa 2', 'Tabela progressiva mensal IRRF 2025', 'IRRF', 2025, 7.500000, 'IRRF', DATE '2025-01-01', NULL, 2259.21, 2826.65, 7.500000, 169.44, 189.59, '{"source":"calc-02-initial-load"}', 'ACTIVE'::public."RecordStatus"),
      (v_tenant_id, 'IRRF-2025-03', 'IRRF 2025 faixa 3', 'Tabela progressiva mensal IRRF 2025', 'IRRF', 2025, 15.000000, 'IRRF', DATE '2025-01-01', NULL, 2826.66, 3751.05, 15.000000, 381.44, 189.59, '{"source":"calc-02-initial-load"}', 'ACTIVE'::public."RecordStatus"),
      (v_tenant_id, 'IRRF-2025-04', 'IRRF 2025 faixa 4', 'Tabela progressiva mensal IRRF 2025', 'IRRF', 2025, 22.500000, 'IRRF', DATE '2025-01-01', NULL, 3751.06, 4664.68, 22.500000, 662.77, 189.59, '{"source":"calc-02-initial-load"}', 'ACTIVE'::public."RecordStatus"),
      (v_tenant_id, 'IRRF-2025-05', 'IRRF 2025 faixa 5', 'Tabela progressiva mensal IRRF 2025', 'IRRF', 2025, 27.500000, 'IRRF', DATE '2025-01-01', NULL, 4664.69, NULL, 27.500000, 896.00, 189.59, '{"source":"calc-02-initial-load"}', 'ACTIVE'::public."RecordStatus")
    ON CONFLICT (tenant_id, code) DO NOTHING;

    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);
    PERFORM public.sgp_append_audit_event(
      'CREATE', 'system.tax_rate', NULL, NULL::uuid,
      'migration', 'migration', 'public.tax_rate', NULL,
      jsonb_build_object('event', 'calc02.irrf.initial_load', 'referenceYear', 2025),
      NULL::text, NULL::text, NULL::text
    );

    INSERT INTO payroll.payroll_earning_deduction (
      tenant_id, code, description, kind, taxable, active, incidences, starts_on,
      formula_alias, formula_function_name, formula_expression,
      formula_function_ddl, formula_dependencies, formula_ready
    )
    VALUES (
      v_tenant_id, 'IRRF', 'Imposto de Renda Retido na Fonte', 'DEDUCTION'::public."PayrollEntryKind",
      false, true, '{"income_tax":true}', DATE '2025-01-01',
      'irrf', 'f_irrf_progressive', NULL,
      'CREATE OR REPLACE FUNCTION payroll_calc.f_irrf_progressive(uuid, integer, integer) RETURNS numeric LANGUAGE sql STABLE AS $function$ SELECT payroll_calc.compute_irrf(public.sgp_current_tenant_uuid(), payroll_calc.base_irrf($1, make_date($3, $2, 1)), payroll_calc.dependent_count($1)::integer, make_date($3, $2, 1)); $function$;',
      ARRAY['BASE_IRRF', 'DEPENDENTES'], true
    )
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET formula_alias = EXCLUDED.formula_alias,
        formula_function_name = EXCLUDED.formula_function_name,
        formula_expression = EXCLUDED.formula_expression,
        formula_function_ddl = EXCLUDED.formula_function_ddl,
        formula_dependencies = EXCLUDED.formula_dependencies,
        formula_ready = true,
        formula_error = NULL,
        updated_at = now();
  END LOOP;
END
$$;
