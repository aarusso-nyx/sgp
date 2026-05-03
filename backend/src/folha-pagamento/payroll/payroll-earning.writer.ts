import { DatabaseService } from '../../database/database.service';

interface EarningDefinition {
  code: string;
  description: string;
  formulaAlias: string;
  formulaExpression: string;
}

const TERMINATION_EARNINGS: EarningDefinition[] = [
  {
    code: 'RESC_SALDO',
    description: 'Saldo salario rescisao',
    formulaAlias: 'termination_balance_salary',
    formulaExpression: 'MONTHLY_SALARY / 30 * TERMINATION_DAY',
  },
  {
    code: 'RESC_FERIAS_PROP',
    description: 'Ferias proporcionais rescisao',
    formulaAlias: 'termination_vacation_proportional',
    formulaExpression: 'MONTHLY_SALARY / 12 * PROPORTIONAL_MONTHS',
  },
  {
    code: 'RESC_FERIAS_TERCO',
    description: 'Um terco ferias proporcionais rescisao',
    formulaAlias: 'termination_vacation_third',
    formulaExpression: 'VACATION_PROPORTIONAL / 3',
  },
  {
    code: 'RESC_13_PROP',
    description: 'Decimo terceiro proporcional rescisao',
    formulaAlias: 'termination_thirteenth_proportional',
    formulaExpression: 'MONTHLY_SALARY / 12 * PROPORTIONAL_MONTHS',
  },
];

export class PayrollEarningWriter {
  constructor(private readonly databaseService: DatabaseService) {}

  async ensureAdvanceEarning(): Promise<string> {
    const rows = await this.databaseService.query<{ id: string }>(
      `
      INSERT INTO payroll.payroll_earning_deduction (
        tenant_id,
        code,
        description,
        kind,
        taxable,
        active,
        formula_alias,
        formula_expression,
        formula_ready
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        'ADIANTAMENTO',
        'Adiantamento de pagamento',
        'EARNING'::"PayrollEntryKind",
        false,
        true,
        'advance_payment_amount',
        'MONTHLY_SALARY / 2',
        true
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        description = EXCLUDED.description,
        kind = EXCLUDED.kind,
        taxable = EXCLUDED.taxable,
        active = true,
        formula_alias = EXCLUDED.formula_alias,
        formula_expression = EXCLUDED.formula_expression,
        formula_ready = true,
        updated_at = now()
      RETURNING id::text
      `,
    );
    return rows[0]?.id ?? '';
  }

  async ensureTerminationEarnings(): Promise<Map<string, string>> {
    const ids = new Map<string, string>();
    for (const entry of TERMINATION_EARNINGS) {
      const rows = await this.databaseService.query<{ id: string }>(
        `
        INSERT INTO payroll.payroll_earning_deduction (
          tenant_id,
          code,
          description,
          kind,
          taxable,
          active,
          formula_alias,
          formula_function_name,
          formula_expression,
          formula_dependencies,
          formula_ready
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1,
          $2,
          'EARNING'::"PayrollEntryKind",
          true,
          true,
          $3,
          $4,
          $5,
          $6::text[],
          true
        )
        ON CONFLICT (tenant_id, code) DO UPDATE
        SET
          description = EXCLUDED.description,
          kind = EXCLUDED.kind,
          taxable = EXCLUDED.taxable,
          active = EXCLUDED.active,
          formula_alias = EXCLUDED.formula_alias,
          formula_function_name = EXCLUDED.formula_function_name,
          formula_expression = EXCLUDED.formula_expression,
          formula_dependencies = EXCLUDED.formula_dependencies,
          formula_ready = EXCLUDED.formula_ready,
          updated_at = now()
        RETURNING id::text
        `,
        [
          entry.code,
          entry.description,
          entry.formulaAlias,
          `calc_${entry.formulaAlias}`,
          entry.formulaExpression,
          [
            'salary_reference.amount',
            'employee.hired_on',
            'employee.terminated_on',
          ],
        ],
      );
      ids.set(entry.code, rows[0]?.id ?? '');
    }
    return ids;
  }
}
