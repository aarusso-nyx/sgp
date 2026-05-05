import { PoolClient } from 'pg';

import { CatalogRow } from '../folha-mensal.types';

export async function ensureMonthlyCatalog(
  client: PoolClient,
): Promise<CatalogRow> {
  const rows = await client.query<CatalogRow>(
    `
    WITH payroll_type_upsert AS (
      INSERT INTO payroll.payroll_type (tenant_id, code, description, status)
      VALUES (public.sgp_current_tenant_uuid(), 'MENSAL', 'Folha mensal', 'ACTIVE'::"RecordStatus")
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET description = EXCLUDED.description,
          status = EXCLUDED.status,
          updated_at = now()
      RETURNING id
    ),
    payroll_type_row AS (
      SELECT id FROM payroll_type_upsert
      UNION ALL
      SELECT id FROM payroll.payroll_type
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND code = 'MENSAL'
      LIMIT 1
    ),
    processing_type_upsert AS (
      INSERT INTO payroll.processing_type (tenant_id, code, description, payroll_type_id, status)
      SELECT public.sgp_current_tenant_uuid(), 'MENSAL', 'Folha mensal completa', id, 'ACTIVE'::"RecordStatus"
      FROM payroll_type_row
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET description = EXCLUDED.description,
          payroll_type_id = EXCLUDED.payroll_type_id,
          status = EXCLUDED.status,
          updated_at = now()
      RETURNING id
    ),
    processing_type_row AS (
      SELECT id FROM processing_type_upsert
      UNION ALL
      SELECT id FROM payroll.processing_type
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND code = 'MENSAL'
      LIMIT 1
    ),
    earning_upsert AS (
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
      VALUES (
        public.sgp_current_tenant_uuid(),
        'MONTHLY_BASE_SALARY',
        'Monthly base salary',
        'EARNING'::"PayrollEntryKind",
        true,
        true,
        '{"monthly_payroll":true,"base_salary":true}'::jsonb,
        DATE '2025-01-01',
        true,
        'monthly_base_salary',
        'f_monthly_base_salary',
        'round(base_salary(p_employee_id, make_date(p_year, p_month, 1)) * proportional_ratio(p_employee_id, p_month, p_year), 2)',
        'CREATE OR REPLACE FUNCTION payroll_calc.f_monthly_base_salary(uuid, integer, integer) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = payroll_calc, hr, payroll, public, pg_catalog AS $function$ SELECT round(payroll_calc.base_salary($1, make_date($3, $2, 1)) * payroll_calc.proportional_ratio($1, $2, $3), 2); $function$;',
        ARRAY['BASE_SALARY'],
        true
      )
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
          updated_at = now()
      RETURNING id
    ),
    earning_row AS (
      SELECT id FROM earning_upsert
      UNION ALL
      SELECT id FROM payroll.payroll_earning_deduction
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND code = 'MONTHLY_BASE_SALARY'
      LIMIT 1
    ),
    consignment_deduction_upsert AS (
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
      VALUES (
        public.sgp_current_tenant_uuid(),
        'CONSIGNMENT_LOAN_DEDUCTION',
        'Consignment loan deduction',
        'DEDUCTION'::"PayrollEntryKind",
        false,
        true,
        '{"monthly_payroll":true,"consignment":true,"deduction_order":"after_pension_and_legal"}'::jsonb,
        DATE '2025-01-01',
        false,
        'consignment_loan_deduction',
        'f_consignment_loan_deduction',
        '0',
        'CREATE OR REPLACE FUNCTION payroll_calc.f_consignment_loan_deduction(uuid, integer, integer) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = payroll_calc, hr, payroll, public, pg_catalog AS $function$ SELECT 0::numeric(14,2); $function$;',
        ARRAY['REFERENCE_VALUE'],
        true
      )
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
          updated_at = now()
      RETURNING id
    ),
    consignment_deduction_row AS (
      SELECT id FROM consignment_deduction_upsert
      UNION ALL
      SELECT id FROM payroll.payroll_earning_deduction
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND code = 'CONSIGNMENT_LOAN_DEDUCTION'
      LIMIT 1
    ),
    consignment_type_earning AS (
      INSERT INTO payroll.payroll_type_earning (
        tenant_id,
        payroll_type_id,
        earning_deduction_id,
        default_quantity,
        starts_on,
        status
      )
      SELECT
        public.sgp_current_tenant_uuid(),
        (SELECT id FROM payroll_type_row),
        (SELECT id FROM consignment_deduction_row),
        1,
        DATE '2025-01-01',
        'ACTIVE'::"RecordStatus"
      ON CONFLICT (tenant_id, payroll_type_id, earning_deduction_id) DO UPDATE
      SET default_quantity = EXCLUDED.default_quantity,
          starts_on = EXCLUDED.starts_on,
          status = EXCLUDED.status,
          updated_at = now()
      RETURNING id
    )
    INSERT INTO payroll.payroll_type_earning (
      tenant_id,
      payroll_type_id,
      earning_deduction_id,
      default_quantity,
      starts_on,
      status
    )
    SELECT
      public.sgp_current_tenant_uuid(),
      (SELECT id FROM payroll_type_row),
      (SELECT id FROM earning_row),
      1,
      DATE '2025-01-01',
      'ACTIVE'::"RecordStatus"
    ON CONFLICT (tenant_id, payroll_type_id, earning_deduction_id) DO UPDATE
    SET default_quantity = EXCLUDED.default_quantity,
        starts_on = EXCLUDED.starts_on,
        status = EXCLUDED.status,
        updated_at = now()
    RETURNING
      (SELECT id::text FROM payroll_type_row) AS payroll_type_id,
      (SELECT id::text FROM processing_type_row) AS processing_type_id,
      (SELECT id::text FROM earning_row) AS base_earning_id,
      (SELECT id::text FROM consignment_deduction_row) AS consignment_deduction_id
    `,
  );
  const row = rows.rows[0];
  if (!row) {
    throw new Error('Monthly payroll catalog could not be ensured');
  }
  return row;
}
