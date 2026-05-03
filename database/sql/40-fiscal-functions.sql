CREATE FUNCTION fiscal.assert_no_dctfweb_for_competence(p_tenant_id uuid, p_competence date) RETURNS void
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM fiscal.dctfweb_declaration declaration
    WHERE declaration.tenant_id = p_tenant_id
      AND declaration.competence = date_trunc('month', p_competence)::date
      AND declaration.status IN ('TRANSMITTED'::fiscal.dctfweb_declaration_status, 'ACCEPTED'::fiscal.dctfweb_declaration_status)
  ) THEN
    RAISE EXCEPTION 'GPS residual duplicates transmitted or accepted DCTFWeb for competence %', p_competence
      USING ERRCODE = 'P0001', HINT = 'GPSDuplicatesDCTFWebError';
  END IF;
END
$$;

CREATE FUNCTION fiscal.recompute_yearly_income(p_tenant_id uuid, p_employee_id uuid, p_year_base integer) RETURNS fiscal.yearly_income_aggregate
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_tenant_id uuid;
  v_result fiscal.yearly_income_aggregate;
BEGIN
  SELECT employee.tenant_id
  INTO v_tenant_id
  FROM hr.employee employee
  WHERE employee.id = p_employee_id
    AND (p_tenant_id IS NULL OR employee.tenant_id = p_tenant_id);

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Employee % not found for yearly income recompute', p_employee_id;
  END IF;

  IF NOT (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(v_tenant_id)
      AND (
        public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.write', 'fiscal.yearly_income.read', 'report.payslip.read'])
        OR p_employee_id = public.sgp_current_employee_id()
      )
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions for yearly income recompute';
  END IF;

  WITH item_totals AS (
    SELECT
      item.tenant_id,
      item.employee_id,
      item.competence_year AS year_base,
      COALESCE(sum(item.amount) FILTER (
        WHERE earning.kind = 'EARNING'::public."PayrollEntryKind"
          AND earning.taxable = true
      ), 0)::numeric(14,2) AS taxable_total,
      COALESCE(sum(item.amount) FILTER (
        WHERE earning.kind = 'EARNING'::public."PayrollEntryKind"
          AND earning.taxable = true
          AND (
            earning.code ILIKE '%13%'
            OR earning.description ILIKE '%decimo%'
            OR earning.description ILIKE '%décimo%'
          )
      ), 0)::numeric(14,2) AS thirteenth_salary,
      COALESCE(sum(item.amount) FILTER (
        WHERE earning.kind = 'EARNING'::public."PayrollEntryKind"
          AND earning.taxable = true
          AND (
            earning.description ILIKE '%ferias%'
            OR earning.description ILIKE '%férias%'
          )
      ), 0)::numeric(14,2) AS vacation_total,
      COALESCE(sum(item.amount) FILTER (
        WHERE earning.kind = 'EARNING'::public."PayrollEntryKind"
          AND earning.taxable = true
          AND (
            earning.description ILIKE '%rescis%'
            OR item.notes ILIKE '%rescis%'
          )
      ), 0)::numeric(14,2) AS severance_total,
      COALESCE(sum(item.amount) FILTER (
        WHERE earning.kind = 'EARNING'::public."PayrollEntryKind"
          AND earning.taxable = false
      ), 0)::numeric(14,2) AS exempt_total,
      COALESCE(sum(item.amount) FILTER (
        WHERE earning.kind = 'DEDUCTION'::public."PayrollEntryKind"
          AND (
            earning.description ILIKE '%inss%'
            OR earning.description ILIKE '%rpps%'
            OR earning.description ILIKE '%previd%'
          )
      ), 0)::numeric(14,2) AS inss_rpps_total,
      COALESCE(sum(item.amount) FILTER (
        WHERE earning.kind = 'DEDUCTION'::public."PayrollEntryKind"
          AND (
            earning.description ILIKE '%irrf%'
            OR earning.description ILIKE '%imposto de renda%'
          )
      ), 0)::numeric(14,2) AS irrf_total
    FROM payroll.v_payroll_run_line_active item
    JOIN payroll.payroll_earning_deduction earning
      ON earning.id = item.earning_deduction_id
    JOIN payroll.payroll_run run
      ON run.id = item.payroll_run_id
     AND run.tenant_id = item.tenant_id
     AND run.status IN (
       'GENERATED'::public."PayrollRunStatus",
       'APPROVED'::public."PayrollRunStatus",
       'PAID'::public."PayrollRunStatus",
       'CLOSED'::public."PayrollRunStatus"
     )
    WHERE item.tenant_id = v_tenant_id
      AND item.employee_id = p_employee_id
      AND item.competence_year = p_year_base
    GROUP BY item.tenant_id, item.employee_id, item.competence_year
  ),
  dependent_totals AS (
    SELECT
      dependent.tenant_id,
      dependent.employee_id,
      count(*)::integer AS dependents_count
    FROM hr.employee_dependent dependent
    WHERE dependent.tenant_id = v_tenant_id
      AND dependent.employee_id = p_employee_id
      AND dependent.income_tax_dependent = true
    GROUP BY dependent.tenant_id, dependent.employee_id
  ),
  source AS (
    SELECT
      v_tenant_id AS tenant_id,
      p_employee_id AS employee_id,
      p_year_base AS year_base,
      COALESCE(item_totals.taxable_total, 0)::numeric(14,2) AS taxable_total,
      COALESCE(item_totals.thirteenth_salary, 0)::numeric(14,2) AS thirteenth_salary,
      COALESCE(item_totals.vacation_total, 0)::numeric(14,2) AS vacation_total,
      COALESCE(item_totals.severance_total, 0)::numeric(14,2) AS severance_total,
      COALESCE(item_totals.exempt_total, 0)::numeric(14,2) AS exempt_total,
      COALESCE(item_totals.inss_rpps_total, 0)::numeric(14,2) AS inss_rpps_total,
      COALESCE(item_totals.irrf_total, 0)::numeric(14,2) AS irrf_total,
      COALESCE(dependent_totals.dependents_count, 0)::integer AS dependents_count
    FROM (SELECT 1) seed
    LEFT JOIN item_totals
      ON item_totals.tenant_id = v_tenant_id
     AND item_totals.employee_id = p_employee_id
     AND item_totals.year_base = p_year_base
    LEFT JOIN dependent_totals
      ON dependent_totals.tenant_id = v_tenant_id
     AND dependent_totals.employee_id = p_employee_id
  )
  INSERT INTO fiscal.yearly_income_aggregate (
    tenant_id,
    employee_id,
    year_base,
    taxable_total,
    thirteenth_salary,
    vacation_total,
    severance_total,
    exempt_total,
    inss_rpps_total,
    irrf_total,
    dependents_count,
    recomputed_at
  )
  SELECT
    tenant_id,
    employee_id,
    year_base,
    taxable_total,
    thirteenth_salary,
    vacation_total,
    severance_total,
    exempt_total,
    inss_rpps_total,
    irrf_total,
    dependents_count,
    now()
  FROM source
  ON CONFLICT (tenant_id, employee_id, year_base) DO UPDATE
  SET taxable_total = EXCLUDED.taxable_total,
      thirteenth_salary = EXCLUDED.thirteenth_salary,
      vacation_total = EXCLUDED.vacation_total,
      severance_total = EXCLUDED.severance_total,
      exempt_total = EXCLUDED.exempt_total,
      inss_rpps_total = EXCLUDED.inss_rpps_total,
      irrf_total = EXCLUDED.irrf_total,
      dependents_count = EXCLUDED.dependents_count,
      recomputed_at = now()
  RETURNING * INTO v_result;

  PERFORM set_config('app.current_tenant_id', v_result.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    'GENERATE',
    'fiscal.yearly_income_aggregate',
    v_result.employee_id::text || ':' || v_result.year_base::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'fiscal.yearly_income_aggregate',
    NULLIF(current_setting('app.request_id', true), ''),
    to_jsonb(v_result),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN v_result;
END
$$;

CREATE FUNCTION fiscal.sgp_dctfweb_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  resource_id text;
  tenant_value uuid;
BEGIN
  row_after := NEW;
  row_before := OLD;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(
    after_json ->> 'id',
    before_json ->> 'id',
    after_json ->> 'declaracao_id',
    before_json ->> 'declaracao_id',
    after_json ->> 'event_id',
    before_json ->> 'event_id',
    after_json ->> 'source_event_id',
    before_json ->> 'source_event_id'
  );
  tenant_value := COALESCE(row_after.tenant_id, row_before.tenant_id);

  PERFORM set_config('app.current_tenant_id', tenant_value::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION fiscal.sgp_dctfweb_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE FUNCTION fiscal.sgp_dirf_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  resource_id text;
  tenant_value uuid;
BEGIN
  row_after := NEW;
  row_before := OLD;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(
    after_json ->> 'id',
    before_json ->> 'id',
    after_json ->> 'dirf_arquivo_id',
    before_json ->> 'dirf_arquivo_id',
    after_json ->> 'dirf_beneficiario_id',
    before_json ->> 'dirf_beneficiario_id'
  );
  tenant_value := COALESCE(row_after.tenant_id, row_before.tenant_id);

  PERFORM set_config('app.current_tenant_id', tenant_value::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION fiscal.sgp_dirf_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE FUNCTION fiscal.sgp_gps_audit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  resource_id text;
  tenant_value uuid;
BEGIN
  row_after := NEW;
  row_before := OLD;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
  tenant_value := COALESCE(row_after.tenant_id, row_before.tenant_id);

  PERFORM set_config('app.current_tenant_id', tenant_value::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE FUNCTION fiscal.sgp_gps_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
