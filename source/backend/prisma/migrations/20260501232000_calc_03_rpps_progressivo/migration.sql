CREATE INDEX IF NOT EXISTS tax_rate_rpps_competence_idx
  ON public.tax_rate (tenant_id, kind, competence_start, competence_end, bracket_min)
  WHERE kind = 'RPPS';

CREATE UNIQUE INDEX IF NOT EXISTS tax_rate_rpps_bracket_uq
  ON public.tax_rate (tenant_id, kind, competence_start, bracket_min)
  WHERE kind = 'RPPS';

CREATE OR REPLACE FUNCTION payroll_calc.rpps_ceiling(
  p_tenant_id uuid
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(value->>'amount', '')::numeric,
    NULLIF(value#>>'{}', '')::numeric,
    0
  )
  FROM public.system_parameter
  WHERE tenant_id = p_tenant_id
    AND key = 'TETO_RPPS'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION payroll_calc.compute_rpps(
  p_tenant_id uuid,
  p_employment_link_id uuid,
  p_base_amount numeric,
  p_competence date
)
RETURNS numeric(14, 2)
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_contract_type text;
  v_effective_base numeric;
  v_ceiling numeric;
  v_amount numeric := 0;
  v_slice numeric;
  v_upper numeric;
  v_original_tenant text;
  v_rate record;
BEGIN
  SELECT link.contract_type
  INTO v_contract_type
  FROM hr.employment_link link
  WHERE link.id = p_employment_link_id
    AND link.tenant_id = p_tenant_id;

  IF COALESCE(v_contract_type, '') <> 'statutory' THEN
    v_original_tenant := current_setting('app.current_tenant_id', true);
    PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
    PERFORM public.sgp_append_audit_event(
      'CREATE', 'payroll.rpps', p_employment_link_id::text, NULL::uuid,
      NULLIF(current_setting('app.current_user_sub', true), ''),
      NULLIF(current_setting('app.current_login', true), ''),
      'payroll_calc.compute_rpps',
      NULLIF(current_setting('app.request_id', true), ''),
      jsonb_build_object(
        'event', 'payroll.rpps.bypassed',
        'employmentLinkId', p_employment_link_id,
        'contractType', v_contract_type,
        'competence', p_competence
      ),
      NULL::text, NULL::text, NULL::text
    );
    PERFORM set_config('app.current_tenant_id', COALESCE(v_original_tenant, ''), true);
    RETURN 0.00;
  END IF;

  v_ceiling := COALESCE(payroll_calc.rpps_ceiling(p_tenant_id), 0);
  v_effective_base := greatest(COALESCE(p_base_amount, 0), 0);
  IF v_ceiling > 0 THEN
    v_effective_base := least(v_effective_base, v_ceiling);
  END IF;

  IF v_effective_base <= 0 THEN
    RETURN 0.00;
  END IF;

  FOR v_rate IN
    SELECT bracket_min, bracket_max, rate
    FROM public.tax_rate rate
    WHERE rate.tenant_id = p_tenant_id
      AND rate.kind = 'RPPS'
      AND rate.status = 'ACTIVE'::public."RecordStatus"
      AND rate.competence_start <= p_competence
      AND (rate.competence_end IS NULL OR rate.competence_end >= p_competence)
      AND rate.bracket_min <= v_effective_base
    ORDER BY rate.competence_start DESC, rate.bracket_min ASC
  LOOP
    v_upper := least(v_effective_base, COALESCE(v_rate.bracket_max, v_effective_base));
    v_slice := greatest(v_upper - v_rate.bracket_min + 0.01, 0);
    IF v_rate.bracket_min = 0 THEN
      v_slice := greatest(v_upper, 0);
    END IF;
    v_amount := v_amount + (v_slice * COALESCE(v_rate.rate, 0) / 100);
  END LOOP;

  RETURN round(v_amount, 2)::numeric(14, 2);
END;
$$;

CREATE OR REPLACE FUNCTION payroll_calc.base_rpps(
  p_employee_id uuid,
  p_competence date
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  WITH item_base AS (
    SELECT COALESCE(sum(CASE
      WHEN ped.kind = 'EARNING'::public."PayrollEntryKind"
        AND (ped.incidences ? 'rpps' OR ped.incidences ? 'official_social_security')
      THEN item.amount ELSE 0 END), 0) AS amount
    FROM payroll.employee_payroll_item item
    JOIN payroll.payroll_earning_deduction ped ON ped.id = item.earning_deduction_id
    WHERE item.employee_id = p_employee_id
      AND item.competence_year = EXTRACT(YEAR FROM p_competence)::integer
      AND item.competence_month = EXTRACT(MONTH FROM p_competence)::integer
  )
  SELECT CASE
    WHEN item_base.amount > 0 THEN item_base.amount
    ELSE payroll_calc.base_salary(p_employee_id, p_competence)
  END
  FROM item_base;
$$;

CREATE OR REPLACE FUNCTION payroll_calc.f_rpps_progressive(
  p_employee_id uuid,
  p_month integer,
  p_year integer
)
RETURNS numeric
LANGUAGE sql
VOLATILE
AS $$
  SELECT payroll_calc.compute_rpps(
    employee.tenant_id,
    employee.employment_link_id,
    payroll_calc.base_rpps(employee.id, make_date(p_year, p_month, 1)),
    make_date(p_year, p_month, 1)
  )
  FROM hr.employee employee
  WHERE employee.id = p_employee_id;
$$;

DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  FOR v_tenant_id IN SELECT id FROM public.tenant LOOP
    INSERT INTO public.system_parameter (
      tenant_id, key, value, description, module_key
    )
    VALUES (
      v_tenant_id, 'TETO_RPPS', '{"amount":8157.41}'::jsonb,
      'Teto da base de contribuição RPPS.', 'payroll'
    )
    ON CONFLICT (tenant_id, key) DO NOTHING;

    INSERT INTO public.tax_rate (
      tenant_id, code, name, description, scope, reference_year, rate_percent,
      kind, competence_start, competence_end, bracket_min, bracket_max, rate,
      deduction_amount, dependent_deduction, metadata, status
    )
    VALUES
      (v_tenant_id, 'RPPS-2025-01', 'RPPS 2025 faixa 1', 'Tabela progressiva RPPS 2025', 'RPPS', 2025, 7.500000, 'RPPS', DATE '2025-01-01', NULL, 0.00, 1518.00, 7.500000, 0.00, 0.00, '{"source":"calc-03-initial-load"}', 'ACTIVE'::public."RecordStatus"),
      (v_tenant_id, 'RPPS-2025-02', 'RPPS 2025 faixa 2', 'Tabela progressiva RPPS 2025', 'RPPS', 2025, 9.000000, 'RPPS', DATE '2025-01-01', NULL, 1518.01, 2793.88, 9.000000, 0.00, 0.00, '{"source":"calc-03-initial-load"}', 'ACTIVE'::public."RecordStatus"),
      (v_tenant_id, 'RPPS-2025-03', 'RPPS 2025 faixa 3', 'Tabela progressiva RPPS 2025', 'RPPS', 2025, 12.000000, 'RPPS', DATE '2025-01-01', NULL, 2793.89, 4190.83, 12.000000, 0.00, 0.00, '{"source":"calc-03-initial-load"}', 'ACTIVE'::public."RecordStatus"),
      (v_tenant_id, 'RPPS-2025-04', 'RPPS 2025 faixa 4', 'Tabela progressiva RPPS 2025', 'RPPS', 2025, 14.000000, 'RPPS', DATE '2025-01-01', NULL, 4190.84, 8157.41, 14.000000, 0.00, 0.00, '{"source":"calc-03-initial-load"}', 'ACTIVE'::public."RecordStatus"),
      (v_tenant_id, 'RPPS-2025-05', 'RPPS 2025 faixa 5', 'Tabela progressiva RPPS 2025', 'RPPS', 2025, 14.500000, 'RPPS', DATE '2025-01-01', NULL, 8157.42, 13969.49, 14.500000, 0.00, 0.00, '{"source":"calc-03-initial-load"}', 'ACTIVE'::public."RecordStatus"),
      (v_tenant_id, 'RPPS-2025-06', 'RPPS 2025 faixa 6', 'Tabela progressiva RPPS 2025', 'RPPS', 2025, 16.500000, 'RPPS', DATE '2025-01-01', NULL, 13969.50, 27938.95, 16.500000, 0.00, 0.00, '{"source":"calc-03-initial-load"}', 'ACTIVE'::public."RecordStatus"),
      (v_tenant_id, 'RPPS-2025-07', 'RPPS 2025 faixa 7', 'Tabela progressiva RPPS 2025', 'RPPS', 2025, 19.000000, 'RPPS', DATE '2025-01-01', NULL, 27938.96, 54384.58, 19.000000, 0.00, 0.00, '{"source":"calc-03-initial-load"}', 'ACTIVE'::public."RecordStatus"),
      (v_tenant_id, 'RPPS-2025-08', 'RPPS 2025 faixa 8', 'Tabela progressiva RPPS 2025', 'RPPS', 2025, 22.000000, 'RPPS', DATE '2025-01-01', NULL, 54384.59, NULL, 22.000000, 0.00, 0.00, '{"source":"calc-03-initial-load"}', 'ACTIVE'::public."RecordStatus")
    ON CONFLICT (tenant_id, code) DO NOTHING;

    PERFORM set_config('app.current_tenant_id', v_tenant_id::text, true);
    PERFORM public.sgp_append_audit_event(
      'CREATE', 'system.tax_rate', NULL, NULL::uuid,
      'migration', 'migration', 'public.tax_rate', NULL,
      jsonb_build_object('event', 'calc03.rpps.initial_load', 'referenceYear', 2025),
      NULL::text, NULL::text, NULL::text
    );

    INSERT INTO payroll.payroll_earning_deduction (
      tenant_id, code, description, kind, taxable, active, incidences, starts_on,
      formula_alias, formula_function_name, formula_expression,
      formula_function_ddl, formula_dependencies, formula_ready
    )
    VALUES (
      v_tenant_id, 'RPPS', 'Contribuição previdenciária RPPS', 'DEDUCTION'::public."PayrollEntryKind",
      false, true, '{"rpps":true,"official_social_security":true}', DATE '2025-01-01',
      'rpps', 'f_rpps_progressive', NULL,
      'CREATE OR REPLACE FUNCTION payroll_calc.f_rpps_progressive(uuid, integer, integer) RETURNS numeric LANGUAGE sql VOLATILE AS $function$ SELECT payroll_calc.compute_rpps(employee.tenant_id, employee.employment_link_id, payroll_calc.base_rpps(employee.id, make_date($3, $2, 1)), make_date($3, $2, 1)) FROM hr.employee employee WHERE employee.id = $1; $function$;',
      ARRAY['BASE_RPPS'], true
    )
    ON CONFLICT (tenant_id, code) DO UPDATE
    SET formula_alias = EXCLUDED.formula_alias,
        formula_function_name = EXCLUDED.formula_function_name,
        formula_expression = EXCLUDED.formula_expression,
        formula_function_ddl = EXCLUDED.formula_function_ddl,
        formula_dependencies = EXCLUDED.formula_dependencies,
        incidences = EXCLUDED.incidences,
        formula_ready = true,
        formula_error = NULL,
        updated_at = now();
  END LOOP;
END
$$;
