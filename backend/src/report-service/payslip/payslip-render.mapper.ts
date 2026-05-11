import type { PayslipDocument } from './payslip-template';
import type { PayslipSourceRow } from './payslip-render.types';

export class PayslipRenderMapper {
  sourceSql(whereClause: string): string {
    return `
      SELECT
        run.tenant_id::text,
        coalesce(company.legal_name, branch.name, 'Ente publico') AS tenant_name,
        employee.id::text AS employee_id,
        employee.registration,
        employee.name AS employee_name,
        employee.cpf,
        coalesce(link.name, link.code, '') AS employment_link,
        employee.bank_agency,
        employee.bank_account,
        run.id::text AS payroll_run_id,
        make_date(run.competence_year, run.competence_month, 1)::text AS competence_date,
        financial.total_earnings::text,
        financial.total_deductions::text,
        financial.net_amount::text,
        coalesce(sum(CASE WHEN earning.taxable THEN item.amount ELSE 0 END), 0)::numeric(14,2)::text AS irrf_base,
        coalesce(sum(CASE WHEN earning.kind IN ('EARNING'::public."PayrollEntryKind", 'BASE'::public."PayrollEntryKind") THEN item.amount ELSE 0 END), 0)::numeric(14,2)::text AS inss_base,
        '0.00'::text AS fgts_deposit,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'code', earning.code,
              'description', earning.description,
              'reference', coalesce(item.quantity::text, item.reference_value::text, ''),
              'kind', earning.kind::text,
              'amount', item.amount::text
            )
            ORDER BY earning.kind::text, earning.code
          ) FILTER (WHERE item.id IS NOT NULL),
          '[]'::jsonb
        ) AS lines
      FROM payroll.payroll_run run
      JOIN payroll.payroll_financial_record financial
        ON financial.tenant_id = run.tenant_id
       AND financial.payroll_run_id = run.id
      JOIN hr.v_employee_pii_decrypted employee
        ON employee.tenant_id = run.tenant_id
       AND employee.id = financial.employee_id
      LEFT JOIN hr.branch branch ON branch.id = employee.branch_id
      LEFT JOIN hr.company company ON company.id = branch.company_id
      LEFT JOIN hr.employment_link link ON link.id = employee.employment_link_id
      LEFT JOIN payroll.v_payroll_run_line_active item
        ON item.tenant_id = run.tenant_id
       AND item.payroll_run_id = run.id
       AND item.employee_id = employee.id
      LEFT JOIN payroll.payroll_earning_deduction earning
        ON earning.id = item.earning_deduction_id
      ${whereClause}
      GROUP BY
        run.tenant_id,
        company.legal_name,
        branch.name,
        employee.id,
        employee.registration,
        employee.name,
        employee.cpf,
        link.name,
        link.code,
        employee.bank_agency,
        employee.bank_account,
        run.id,
        run.competence_year,
        run.competence_month,
        financial.total_earnings,
        financial.total_deductions,
        financial.net_amount
    `;
  }

  toDocument(row: PayslipSourceRow): PayslipDocument {
    const lines = Array.isArray(row.lines) ? row.lines : [];
    return {
      tenantName: row.tenant_name ?? 'Ente publico',
      legalReference:
        'Demonstrativo remuneratorio oficial conforme catalogo de saidas oficiais SGP.',
      employee: {
        id: row.employee_id,
        registration: row.registration,
        name: row.employee_name,
        cpf: row.cpf ?? '',
        employmentLink: row.employment_link ?? '',
        bankAgency: row.bank_agency ?? '',
        bankAccount: row.bank_account ?? '',
      },
      payrollRunId: row.payroll_run_id,
      competence: row.competence_date,
      totals: {
        earnings: row.total_earnings,
        deductions: row.total_deductions,
        net: row.net_amount,
        irrfBase: row.irrf_base,
        inssBase: row.inss_base,
        fgtsDeposit: row.fgts_deposit,
      },
      lines: lines.map((line) => {
        const item = line as Record<string, string | undefined>;
        const isDeduction = item.kind === 'DEDUCTION';
        return {
          code: item.code ?? '',
          description: item.description ?? '',
          reference: item.reference ?? '',
          earning: isDeduction ? '' : (item.amount ?? ''),
          deduction: isDeduction ? (item.amount ?? '') : '',
        };
      }),
    };
  }
}
