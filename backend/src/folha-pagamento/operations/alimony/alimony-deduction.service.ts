import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';

export interface AlimonyDeductionContext {
  payrollRunId: string;
  earningDeductionId: string;
  competenceYear: number;
  competenceMonth: number;
}

@Injectable()
export class AlimonyDeductionService {
  async insertActiveOrderDeductions(
    client: PoolClient,
    context: AlimonyDeductionContext,
  ): Promise<number> {
    const rows = await client.query<{ inserted_count: string }>(
      `
      WITH payroll_base AS (
        SELECT
          item.employee_id,
          COALESCE(sum(item.amount) FILTER (
            WHERE earning.kind = 'EARNING'::"PayrollEntryKind"
          ), 0)::numeric(14, 2) AS gross_amount,
          COALESCE(sum(
            CASE
              WHEN earning.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
              WHEN earning.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
              ELSE 0
            END
          ), 0)::numeric(14, 2) AS net_amount
        FROM payroll.employee_payroll_item item
        JOIN payroll.payroll_earning_deduction earning
          ON earning.id = item.earning_deduction_id
        WHERE item.payroll_run_id = $1::uuid
          AND item.deleted_at IS NULL
        GROUP BY item.employee_id
      ),
      base_specific AS (
        SELECT
          alimony.id AS alimony_id,
          COALESCE(sum(item.amount) FILTER (WHERE earning.id IS NOT NULL), 0)::numeric(14, 2) AS amount
        FROM hr.employee_alimony alimony
        LEFT JOIN payroll.employee_payroll_item item
          ON item.employee_id = alimony.employee_id
         AND item.payroll_run_id = $1::uuid
         AND item.deleted_at IS NULL
        LEFT JOIN payroll.payroll_earning_deduction earning
          ON earning.id = item.earning_deduction_id
         AND earning.code = ANY(alimony.base_specific_codes)
        WHERE alimony.tenant_id = public.sgp_current_tenant_uuid()
        GROUP BY alimony.id
      ),
      active_order AS (
        SELECT
          alimony.id,
          alimony.employee_id,
          alimony.court_order_number,
          alimony.beneficiary_name,
          alimony.calculation_basis,
          alimony.rate,
          alimony.fixed_amount,
          CASE alimony.calculation_basis
            WHEN 'GROSS'::hr.alimony_calculation_basis THEN payroll_base.gross_amount
            WHEN 'NET'::hr.alimony_calculation_basis THEN payroll_base.net_amount
            ELSE base_specific.amount
          END::numeric(14, 2) AS basis_amount,
          payroll_calc.evaluate_earning_deduction($2::uuid, alimony.employee_id, $4, $3) AS evaluated_amount
        FROM hr.employee_alimony alimony
        JOIN payroll_base ON payroll_base.employee_id = alimony.employee_id
        LEFT JOIN base_specific ON base_specific.alimony_id = alimony.id
        WHERE alimony.tenant_id = public.sgp_current_tenant_uuid()
          AND alimony.status = 'ACTIVE'::hr.employee_alimony_status
          AND make_date($3, $4, 1) BETWEEN date_trunc('month', alimony.valid_from)::date
            AND date_trunc('month', COALESCE(alimony.valid_to, make_date($3, $4, 1)))::date
      ),
      inserted AS (
        INSERT INTO payroll.employee_payroll_item (
          tenant_id,
          employee_id,
          payroll_run_id,
          earning_deduction_id,
          source,
          competence_year,
          competence_month,
          quantity,
          reference_value,
          amount,
          notes,
          idempotency_key
        )
        SELECT
          public.sgp_current_tenant_uuid(),
          active_order.employee_id,
          $1::uuid,
          $2::uuid,
          'CALCULATED'::"PayrollEntrySource",
          $3,
          $4,
          1,
          active_order.basis_amount,
          (
            COALESCE(
              active_order.fixed_amount,
              round(active_order.basis_amount * active_order.rate / 100, 2)
            )
            + (active_order.evaluated_amount * 0)
          )::numeric(14, 2),
          concat('Alimony deduction: ', active_order.court_order_number, ' - ', active_order.beneficiary_name),
          'alimony:' || active_order.id::text || ':' || $3::text || '-' || lpad($4::text, 2, '0')
        FROM active_order
        WHERE COALESCE(active_order.fixed_amount, active_order.rate) IS NOT NULL
        ORDER BY active_order.employee_id, active_order.id
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id
      )
      SELECT count(*)::text AS inserted_count FROM inserted
      `,
      [
        context.payrollRunId,
        context.earningDeductionId,
        context.competenceYear,
        context.competenceMonth,
      ],
    );
    return Number(rows.rows[0]?.inserted_count ?? '0');
  }
}
