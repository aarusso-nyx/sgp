CREATE SCHEMA IF NOT EXISTS fiscal;

CREATE TABLE fiscal.yearly_income_aggregate (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  employee_id uuid NOT NULL,
  year_base integer NOT NULL,
  taxable_total numeric(14,2) NOT NULL DEFAULT 0,
  thirteenth_salary numeric(14,2) NOT NULL DEFAULT 0,
  vacation_total numeric(14,2) NOT NULL DEFAULT 0,
  severance_total numeric(14,2) NOT NULL DEFAULT 0,
  exempt_total numeric(14,2) NOT NULL DEFAULT 0,
  inss_rpps_total numeric(14,2) NOT NULL DEFAULT 0,
  irrf_total numeric(14,2) NOT NULL DEFAULT 0,
  dependents_count integer NOT NULL DEFAULT 0,
  recomputed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yearly_income_aggregate_pkey PRIMARY KEY (tenant_id, employee_id, year_base),
  CONSTRAINT yearly_income_aggregate_employee_fk FOREIGN KEY (employee_id)
    REFERENCES hr.employee(id),
  CONSTRAINT yearly_income_aggregate_year_chk CHECK (year_base BETWEEN 2000 AND 2100),
  CONSTRAINT yearly_income_aggregate_money_chk CHECK (
    taxable_total >= 0
    AND thirteenth_salary >= 0
    AND vacation_total >= 0
    AND severance_total >= 0
    AND exempt_total >= 0
    AND inss_rpps_total >= 0
    AND irrf_total >= 0
    AND dependents_count >= 0
  )
);

CREATE INDEX yearly_income_aggregate_year_idx
  ON fiscal.yearly_income_aggregate (tenant_id, year_base, employee_id);

CREATE OR REPLACE FUNCTION fiscal.recompute_yearly_income(
  p_tenant_id uuid,
  p_employee_id uuid,
  p_year_base integer
)
RETURNS fiscal.yearly_income_aggregate
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE VIEW fiscal.v_yearly_income
WITH (security_invoker = true) AS
SELECT
  aggregate.tenant_id::text,
  COALESCE(company.legal_name, branch.name, 'Ente publico') AS tenant_name,
  COALESCE(company.cnpj, '') AS tenant_document,
  aggregate.employee_id::text,
  employee.registration,
  employee.name AS employee_name,
  employee.cpf,
  COALESCE(link.name, link.code, '') AS employment_link,
  aggregate.year_base,
  aggregate.taxable_total,
  aggregate.thirteenth_salary,
  aggregate.vacation_total,
  aggregate.severance_total,
  aggregate.exempt_total,
  aggregate.inss_rpps_total,
  aggregate.irrf_total,
  aggregate.dependents_count,
  (aggregate.taxable_total + aggregate.exempt_total)::numeric(14,2) AS s1210_total,
  aggregate.recomputed_at
FROM fiscal.yearly_income_aggregate aggregate
JOIN hr.employee employee
  ON employee.id = aggregate.employee_id
 AND employee.tenant_id = aggregate.tenant_id
LEFT JOIN hr.branch branch ON branch.id = employee.branch_id
LEFT JOIN hr.company company ON company.id = branch.company_id
LEFT JOIN hr.employment_link link ON link.id = employee.employment_link_id
WHERE public.sgp_tenant_matches(aggregate.tenant_id)
  AND (
    public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.read', 'fiscal.yearly_income.write', 'report.payslip.read'])
    OR (
      aggregate.employee_id = public.sgp_current_employee_id()
      AND public.sgp_has_any_permission(ARRAY['portal.yearly_income.read'])
    )
  );

ALTER TABLE fiscal.yearly_income_aggregate ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal.yearly_income_aggregate FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS yearly_income_aggregate_select ON fiscal.yearly_income_aggregate;
CREATE POLICY yearly_income_aggregate_select ON fiscal.yearly_income_aggregate
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.read', 'fiscal.yearly_income.write', 'report.payslip.read'])
    )
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND employee_id = public.sgp_current_employee_id()
      AND public.sgp_has_any_permission(ARRAY['portal.yearly_income.read'])
    )
  );

DROP POLICY IF EXISTS yearly_income_aggregate_write ON fiscal.yearly_income_aggregate;
CREATE POLICY yearly_income_aggregate_write ON fiscal.yearly_income_aggregate
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.write'])
    )
  );

DROP POLICY IF EXISTS generated_report_file_yearly_income_select ON public.generated_report_file;
CREATE POLICY generated_report_file_yearly_income_select ON public.generated_report_file
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND report_kind = 'YEARLY_INCOME_REPORT'::public."ReportKind"
      AND public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.read', 'fiscal.yearly_income.write', 'report.payslip.read'])
    )
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND report_kind = 'YEARLY_INCOME_REPORT'::public."ReportKind"
      AND employee_id = public.sgp_current_employee_id()
      AND public.sgp_has_any_permission(ARRAY['portal.yearly_income.read'])
    )
  );

DROP POLICY IF EXISTS generated_report_file_yearly_income_write ON public.generated_report_file;
CREATE POLICY generated_report_file_yearly_income_write ON public.generated_report_file
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND report_kind = 'YEARLY_INCOME_REPORT'::public."ReportKind"
      AND public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND report_kind = 'YEARLY_INCOME_REPORT'::public."ReportKind"
      AND public.sgp_has_any_permission(ARRAY['fiscal.yearly_income.write'])
    )
  );

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  (
    'fiscal.yearly_income.read',
    'fiscal',
    'yearly_income',
    'read',
    '/api/v1/admin/yearly-income-batches/**',
    'Read yearly income report aggregates and generated file metadata.'
  ),
  (
    'fiscal.yearly_income.write',
    'fiscal',
    'yearly_income',
    'write',
    '#!/folha/comprovantes-rendimentos',
    'Generate annual yearly income report PDFs in batch.'
  ),
  (
    'portal.yearly_income.read',
    'portal',
    'yearly_income',
    'read',
    '#!/portal/comprovante-rendimentos',
    'Read and download the authenticated employee yearly income report.'
  )
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('ADMIN', 'fiscal.yearly_income.read'),
    ('ADMIN', 'fiscal.yearly_income.write'),
    ('ADMIN', 'portal.yearly_income.read'),
    ('FOLHA_OPERADOR', 'fiscal.yearly_income.read'),
    ('FOLHA_OPERADOR', 'fiscal.yearly_income.write'),
    ('FOLHA_OPERADOR', 'portal.yearly_income.read'),
    ('AUDITOR', 'fiscal.yearly_income.read')
)
INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT access_profile.id, permission.id, true
FROM profile_permissions
JOIN public.access_profile
  ON access_profile.code = profile_permissions.profile_code
JOIN public.permission
  ON permission.key = profile_permissions.permission_key
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT USAGE ON SCHEMA fiscal TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON fiscal.yearly_income_aggregate TO sgp_app_role;
    GRANT SELECT ON fiscal.v_yearly_income TO sgp_app_role;
    GRANT EXECUTE ON FUNCTION fiscal.recompute_yearly_income(uuid, uuid, integer) TO sgp_app_role;
  END IF;
END
$$;
