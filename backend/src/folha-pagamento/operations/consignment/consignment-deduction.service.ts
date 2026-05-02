import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';

export interface ConsignmentDeductionContext {
  payrollRunId: string;
  competenceYear: number;
  competenceMonth: number;
  earningDeductionId: string;
}

@Injectable()
export class ConsignmentDeductionService {
  async insertActiveLoanDeductions(
    client: PoolClient,
    context: ConsignmentDeductionContext,
  ): Promise<number> {
    const rows = await client.query<{ inserted_count: string }>(
      `
      WITH inserted AS (
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
          loan.employee_id,
          $1::uuid,
          $2::uuid,
          'CALCULATED'::"PayrollEntrySource",
          $3,
          $4,
          1,
          loan.monthly_amount,
          (loan.monthly_amount + (payroll_calc.evaluate_earning_deduction($2::uuid, loan.employee_id, $4, $3) * 0))::numeric(14, 2),
          'Consignment deduction: ' || loan.contract_number,
          'consignment:' || loan.loan_id::text || ':' || $3::text || '-' || lpad($4::text, 2, '0')
        FROM payment.consignment_loan loan
        WHERE loan.tenant_id = public.sgp_current_tenant_uuid()
          AND loan.status = 'ACTIVE'
          AND make_date($3, $4, 1) BETWEEN date_trunc('month', loan.valid_from)::date AND date_trunc('month', loan.valid_to)::date
          AND loan.installments_paid < loan.installments_total
        ORDER BY
          CASE loan.kind WHEN 'PAYROLL_LOAN' THEN 1 WHEN 'OTHER' THEN 2 ELSE 3 END,
          loan.valid_from,
          loan.contract_number
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
