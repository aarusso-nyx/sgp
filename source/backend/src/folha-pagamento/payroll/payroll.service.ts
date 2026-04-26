import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import {
  CalculatePayrollRunDto,
  CreateAdvancePaymentDto,
  CreatePayrollRunDto,
  PopulatePayrollRunDto,
  UpdatePayrollRunStatusDto,
} from './payroll.dto';

export interface PayrollRunSummary {
  id: string;
  competenceYear: number;
  competenceMonth: number;
  processingType: string | null;
  payrollType: string | null;
  branch: string | null;
  paymentDate: string | null;
  status: string;
  employeeCount: number;
  totalNet: string;
  createdAt: string;
  updatedAt: string;
}

interface PayrollRunRow extends QueryResultRow {
  id: string;
  competence_year: number;
  competence_month: number;
  processing_type: string | null;
  payroll_type: string | null;
  branch_name: string | null;
  payment_date: Date | string | null;
  status: string;
  employee_count: number;
  total_net: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

interface PayrollRunDetailRow extends PayrollRunRow {
  branch_id: string | null;
  payroll_type_id: string;
  payroll_type_code: string | null;
  processing_type_id: string;
  processing_type_code: string | null;
}

interface TerminatedEmployeeRow extends QueryResultRow {
  employee_id: string;
  functional_status_id: string | null;
  branch_id: string | null;
  salary_amount: string | null;
  hired_on: Date | string | null;
  terminated_on: Date | string | null;
}

interface FinancialTotalsRow extends QueryResultRow {
  employee_count: string;
  total_earnings: string;
  total_deductions: string;
  total_net: string;
}

interface EligibleEmployeeRow extends QueryResultRow {
  employee_id: string;
  branch_id: string | null;
  work_location_id: string | null;
  functional_status_id: string | null;
  job_position_id: string | null;
  employment_link_id: string | null;
  salary_amount: string | null;
}

interface PayrollMappingRow extends QueryResultRow {
  earning_deduction_id: string;
  code: string;
  description: string;
  kind: string;
  formula_expression: string | null;
  default_amount: string | null;
  default_quantity: string | null;
}

interface AdvanceInsertRow extends QueryResultRow {
  id: string;
}

export interface AdvancePaymentResult {
  requestId: string;
  paymentId: string;
  employeeId: string;
  payrollRunId: string;
  amount: string;
  requestStatus: string;
  paymentStatus: string;
}

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

@Injectable()
export class PayrollService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listRuns(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<PayrollRunSummary>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM payroll.payroll_run pr
      LEFT JOIN hr.branch b ON b.id = pr.branch_id
      LEFT JOIN payroll.payroll_type pt ON pt.id = pr.payroll_type_id
      LEFT JOIN payroll.processing_type ptt ON ptt.id = pr.processing_type_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              pr.competence_year::text,
              lpad(pr.competence_month::text, 2, '0'),
              coalesce(b.name, ''),
              coalesce(pt.description, ''),
              coalesce(ptt.description, ''),
              pr.status::text
            )) LIKE $1
      `,
      [searchTerm],
    );

    const rows = await this.databaseService.query<PayrollRunRow>(
      `
      SELECT
        pr.id,
        pr.competence_year,
        pr.competence_month,
        ptt.description AS processing_type,
        pt.description AS payroll_type,
        b.name AS branch_name,
        NULL::date AS payment_date,
        pr.status::text AS status,
        pr.employee_count,
        pr.total_net::text AS total_net,
        pr.created_at,
        pr.updated_at
      FROM payroll.payroll_run pr
      LEFT JOIN hr.branch b ON b.id = pr.branch_id
      LEFT JOIN payroll.payroll_type pt ON pt.id = pr.payroll_type_id
      LEFT JOIN payroll.processing_type ptt ON ptt.id = pr.processing_type_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              pr.competence_year::text,
              lpad(pr.competence_month::text, 2, '0'),
              coalesce(b.name, ''),
              coalesce(pt.description, ''),
              coalesce(ptt.description, ''),
              pr.status::text
            )) LIKE $1
      ORDER BY pr.competence_year DESC, pr.competence_month DESC, pr.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );

    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.toSummary(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async createRun(input: CreatePayrollRunDto): Promise<PayrollRunSummary> {
    this.ensureDatabase();
    try {
      const rows = await this.databaseService.query<PayrollRunRow>(
        `
        INSERT INTO payroll.payroll_run (
          competence_year,
          competence_month,
          payroll_type_id,
          processing_type_id,
          branch_id,
          status
        )
        VALUES (
          $1,
          $2,
          $3::uuid,
          $4::uuid,
          NULLIF($5, '')::uuid,
          'DRAFT'::"PayrollRunStatus"
        )
        RETURNING
          id,
          competence_year,
          competence_month,
          NULL::text AS processing_type,
          NULL::text AS payroll_type,
          NULL::text AS branch_name,
          NULL::date AS payment_date,
          status::text AS status,
          employee_count,
          total_net::text AS total_net,
          created_at,
          updated_at
        `,
        [
          input.competenceYear,
          input.competenceMonth,
          input.payrollTypeId,
          input.processingTypeId,
          input.branchId ?? '',
        ],
      );
      return this.toSummary(rows[0]);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        throw new ConflictException(
          'A payroll run already exists for this competence',
        );
      }
      throw error;
    }
  }

  async updateRunStatus(
    id: string,
    input: UpdatePayrollRunStatusDto,
  ): Promise<PayrollRunSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<PayrollRunRow>(
      `
      UPDATE payroll.payroll_run
      SET status = $2::"PayrollRunStatus",
          updated_at = now(),
          closed_at = CASE
            WHEN $2::"PayrollRunStatus" = 'CLOSED'::"PayrollRunStatus" THEN now()
            ELSE closed_at
          END
      WHERE id = $1::uuid
      RETURNING
        id,
        competence_year,
        competence_month,
        NULL::text AS processing_type,
        NULL::text AS payroll_type,
        NULL::text AS branch_name,
        NULL::date AS payment_date,
        status::text AS status,
        employee_count,
        total_net::text AS total_net,
        created_at,
        updated_at
      `,
      [id, input.status],
    );

    const row = rows[0];
    if (!row) throw new NotFoundException('Payroll run not found');
    return this.toSummary(row);
  }

  async populateRun(
    id: string,
    input: PopulatePayrollRunDto,
  ): Promise<PayrollRunSummary> {
    this.ensureDatabase();
    const run = await this.getRunDetail(id);
    const replaceCalculatedItems = input.replaceCalculatedItems !== false;

    if (replaceCalculatedItems) {
      await this.databaseService.query(
        `
        DELETE FROM payroll.employee_payroll_item
        WHERE payroll_run_id = $1::uuid
          AND source = 'CALCULATED'::"PayrollEntrySource"
        `,
        [id],
      );
    }

    const employees = await this.databaseService.query<EligibleEmployeeRow>(
      `
      SELECT
        e.id::text AS employee_id,
        e.branch_id::text AS branch_id,
        e.work_location_id::text AS work_location_id,
        e.functional_status_id::text AS functional_status_id,
        e.job_position_id::text AS job_position_id,
        e.employment_link_id::text AS employment_link_id,
        sr.amount::text AS salary_amount
      FROM hr.employee e
      LEFT JOIN hr.salary_reference sr ON sr.id = e.salary_reference_id
      WHERE e.lifecycle_status IN (
          'ACTIVE'::"EmployeeLifecycleStatus",
          'ON_LEAVE'::"EmployeeLifecycleStatus"
        )
        AND (
          ($1::uuid IS NULL AND e.branch_id IS NULL)
          OR e.branch_id = $1::uuid
        )
      `,
      [run.branch_id],
    );

    for (const employee of employees) {
      const mappings = await this.resolvePayrollMappings(run, employee);
      for (const mapping of mappings) {
        const quantity = Number(mapping.default_quantity ?? '1');
        const amount = this.resolveMappedAmount(
          mapping,
          Number(employee.salary_amount ?? '0'),
          quantity,
        );
        if (amount <= 0) {
          continue;
        }
        await this.databaseService.query(
          `
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
            notes
          )
          VALUES (
            public.sgp_current_tenant_uuid(),
            $1::uuid,
            $2::uuid,
            $3::uuid,
            'CALCULATED'::"PayrollEntrySource",
            $4,
            $5,
            $6::decimal,
            NULLIF($7, '')::decimal,
            $8::decimal,
            $9
          )
          `,
          [
            employee.employee_id,
            run.id,
            mapping.earning_deduction_id,
            run.competence_year,
            run.competence_month,
            quantity,
            employee.salary_amount ?? '',
            amount.toFixed(2),
            `Mass population from linkage ${mapping.code}`,
          ],
        );
      }
    }

    await this.refreshPayrollRunAggregates(run.id);
    return this.getSummary(run.id);
  }

  async createAdvancePayment(
    payrollRunId: string,
    input: CreateAdvancePaymentDto,
  ): Promise<AdvancePaymentResult> {
    this.ensureDatabase();
    const run = await this.getRunDetail(payrollRunId);
    const approvedAmount = input.approvedAmount ?? input.requestedAmount;
    const requestedOn =
      input.requestedOn ?? new Date().toISOString().slice(0, 10);

    const requestRows = await this.databaseService.query<AdvanceInsertRow>(
      `
      INSERT INTO payroll.advance_request (
        tenant_id,
        employee_id,
        payroll_run_id,
        requested_amount,
        approved_amount,
        requested_on,
        processed_on,
        status,
        notes
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3::decimal,
        $4::decimal,
        $5::date,
        $5::date,
        'APPROVED'::"AdvanceRequestStatus",
        $6
      )
      RETURNING id::text
      `,
      [
        input.employeeId,
        payrollRunId,
        input.requestedAmount,
        approvedAmount,
        requestedOn,
        input.notes?.trim() || '',
      ],
    );
    const requestId = requestRows[0]?.id;

    const paymentRows = await this.databaseService.query<AdvanceInsertRow>(
      `
      INSERT INTO payroll.advance_payment (
        tenant_id,
        request_id,
        employee_id,
        payroll_run_id,
        amount,
        payment_date,
        status,
        notes
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::decimal,
        $5::date,
        'GENERATED'::"AdvancePaymentStatus",
        $6
      )
      RETURNING id::text
      `,
      [
        requestId,
        input.employeeId,
        payrollRunId,
        approvedAmount,
        requestedOn,
        input.notes?.trim() || '',
      ],
    );
    const paymentId = paymentRows[0]?.id;

    const advanceEarningId = await this.ensureAdvanceEarning();
    await this.databaseService.query(
      `
      INSERT INTO payroll.employee_payroll_item (
        tenant_id,
        employee_id,
        payroll_run_id,
        earning_deduction_id,
        source,
        competence_year,
        competence_month,
        amount,
        notes
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3::uuid,
        'ADJUSTMENT'::"PayrollEntrySource",
        $4,
        $5,
        $6::decimal,
        $7
      )
      `,
      [
        input.employeeId,
        payrollRunId,
        advanceEarningId,
        run.competence_year,
        run.competence_month,
        approvedAmount,
        `Advance payment ${paymentId}`,
      ],
    );

    await this.databaseService.query(
      `
      UPDATE payroll.advance_request
      SET status = 'PROCESSED'::"AdvanceRequestStatus",
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [requestId],
    );

    await this.refreshPayrollRunAggregates(payrollRunId);

    return {
      requestId: requestId ?? '',
      paymentId: paymentId ?? '',
      employeeId: input.employeeId,
      payrollRunId,
      amount: Number(approvedAmount).toFixed(2),
      requestStatus: 'PROCESSED',
      paymentStatus: 'GENERATED',
    };
  }

  async calculateRun(
    id: string,
    input: CalculatePayrollRunDto,
  ): Promise<PayrollRunSummary> {
    this.ensureDatabase();
    const run = await this.getRunDetail(id);
    const mode = (input.mode ?? 'TOTAL').toUpperCase();
    if (mode === 'TOTAL') {
      await this.databaseService.query(
        `
        DELETE FROM payroll.employee_payroll_item
        WHERE payroll_run_id = $1::uuid
          AND source = 'CALCULATED'::"PayrollEntrySource"
        `,
        [id],
      );
    }

    if (
      run.processing_type_code === 'RESCISAO' ||
      run.payroll_type_code === 'RESCISAO'
    ) {
      await this.calculateTerminationRun(run);
    }

    const totals = await this.databaseService.query<FinancialTotalsRow>(
      `
      SELECT
        count(DISTINCT employee_id)::text AS employee_count,
        coalesce(sum(CASE WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::text AS total_earnings,
        coalesce(sum(CASE WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::text AS total_deductions,
        coalesce(sum(CASE
          WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
          WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
          ELSE 0
        END), 0)::text AS total_net
      FROM payroll.employee_payroll_item item
      JOIN payroll.payroll_earning_deduction ed
        ON ed.id = item.earning_deduction_id
      WHERE item.payroll_run_id = $1::uuid
      `,
      [id],
    );

    const summary = totals[0] ?? {
      employee_count: '0',
      total_earnings: '0',
      total_deductions: '0',
      total_net: '0',
    };

    const rows = await this.databaseService.query<PayrollRunRow>(
      `
      UPDATE payroll.payroll_run
      SET
        employee_count = $2::int,
        total_earnings = $3::decimal,
        total_deductions = $4::decimal,
        total_net = $5::decimal,
        status = 'GENERATED'::"PayrollRunStatus",
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id,
        competence_year,
        competence_month,
        NULL::text AS processing_type,
        NULL::text AS payroll_type,
        NULL::text AS branch_name,
        NULL::date AS payment_date,
        status::text AS status,
        employee_count,
        total_net::text AS total_net,
        created_at,
        updated_at
      `,
      [
        id,
        summary.employee_count,
        summary.total_earnings,
        summary.total_deductions,
        summary.total_net,
      ],
    );

    await this.databaseService.query(
      `
      INSERT INTO payroll.payroll_run_status_history (
        tenant_id,
        payroll_run_id,
        status,
        note,
        metadata
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        'GENERATED'::"PayrollRunStatus",
        $2,
        $3::jsonb
      )
      `,
      [
        id,
        'Payroll calculated',
        JSON.stringify({
          mode,
          totalNet: summary.total_net,
          employeeCount: summary.employee_count,
        }),
      ],
    );

    await this.refreshWorkLocationRollups(id);

    return this.toSummary(rows[0]);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for payroll operations',
      );
    }
  }

  private toSummary(row: PayrollRunRow): PayrollRunSummary {
    return {
      id: row.id,
      competenceYear: row.competence_year,
      competenceMonth: row.competence_month,
      processingType: row.processing_type,
      payrollType: row.payroll_type,
      branch: row.branch_name,
      paymentDate: row.payment_date ? this.toIso(row.payment_date) : null,
      status: row.status,
      employeeCount: row.employee_count,
      totalNet: row.total_net,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private async getRunDetail(id: string): Promise<PayrollRunDetailRow> {
    const rows = await this.databaseService.query<PayrollRunDetailRow>(
      `
      SELECT
        pr.id,
        pr.competence_year,
        pr.competence_month,
        ptt.description AS processing_type,
        pt.description AS payroll_type,
        b.name AS branch_name,
        NULL::date AS payment_date,
        pr.status::text AS status,
        pr.employee_count,
        pr.total_net::text AS total_net,
        pr.created_at,
        pr.updated_at,
        pr.branch_id::text AS branch_id,
        pr.payroll_type_id::text AS payroll_type_id,
        pt.code AS payroll_type_code,
        pr.processing_type_id::text AS processing_type_id,
        ptt.code AS processing_type_code
      FROM payroll.payroll_run pr
      JOIN payroll.payroll_type pt ON pt.id = pr.payroll_type_id
      JOIN payroll.processing_type ptt ON ptt.id = pr.processing_type_id
      LEFT JOIN hr.branch b ON b.id = pr.branch_id
      WHERE pr.id = $1::uuid
      `,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Payroll run not found');
    return rows[0];
  }

  private async calculateTerminationRun(
    run: PayrollRunDetailRow,
  ): Promise<void> {
    const earnings = await this.ensureTerminationEarnings();
    const employees = await this.databaseService.query<TerminatedEmployeeRow>(
      `
      SELECT
        e.id::text AS employee_id,
        e.functional_status_id::text AS functional_status_id,
        e.branch_id::text AS branch_id,
        sr.amount::text AS salary_amount,
        e.hired_on,
        e.terminated_on
      FROM hr.employee e
      LEFT JOIN hr.salary_reference sr ON sr.id = e.salary_reference_id
      WHERE e.lifecycle_status = 'TERMINATED'::"EmployeeLifecycleStatus"
        AND e.terminated_on IS NOT NULL
        AND EXTRACT(YEAR FROM e.terminated_on) = $1
        AND EXTRACT(MONTH FROM e.terminated_on) = $2
        AND (
          ($3::uuid IS NULL AND e.branch_id IS NULL)
          OR e.branch_id = $3::uuid
        )
      `,
      [run.competence_year, run.competence_month, run.branch_id],
    );

    for (const employee of employees) {
      const terminatedOn = employee.terminated_on
        ? new Date(employee.terminated_on)
        : null;
      const hiredOn = employee.hired_on ? new Date(employee.hired_on) : null;
      if (!terminatedOn) continue;

      const monthlySalary = Number(employee.salary_amount ?? '0');
      const terminationDay = terminatedOn.getUTCDate();
      const proportionalMonths = this.calculateProportionalMonths(
        hiredOn,
        terminatedOn,
      );
      const vacationProportional = this.roundCurrency(
        (monthlySalary / 12) * proportionalMonths,
      );
      const items: Array<[string, number]> = [
        [
          'RESC_SALDO',
          this.roundCurrency((monthlySalary / 30) * terminationDay),
        ],
        ['RESC_FERIAS_PROP', vacationProportional],
        ['RESC_FERIAS_TERCO', this.roundCurrency(vacationProportional / 3)],
        [
          'RESC_13_PROP',
          this.roundCurrency((monthlySalary / 12) * proportionalMonths),
        ],
      ];

      let totalEarnings = 0;
      for (const [code, amount] of items) {
        totalEarnings += amount;
        await this.databaseService.query(
          `
          INSERT INTO payroll.employee_payroll_item (
            tenant_id,
            employee_id,
            payroll_run_id,
            earning_deduction_id,
            source,
            competence_year,
            competence_month,
            amount,
            notes
          )
          VALUES (
            public.sgp_current_tenant_uuid(),
            $1::uuid,
            $2::uuid,
            $3::uuid,
            'CALCULATED'::"PayrollEntrySource",
            $4,
            $5,
            $6::decimal,
            $7
          )
          `,
          [
            employee.employee_id,
            run.id,
            earnings.get(code) ?? '',
            run.competence_year,
            run.competence_month,
            amount.toFixed(2),
            `Termination calculation ${code}`,
          ],
        );
      }

      await this.databaseService.query(
        `
        INSERT INTO payroll.payroll_financial_record (
          tenant_id,
          employee_id,
          payroll_run_id,
          branch_id,
          functional_status_id,
          competence_year,
          competence_month,
          total_earnings,
          total_deductions,
          net_amount,
          metadata
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1::uuid,
          $2::uuid,
          NULLIF($3, '')::uuid,
          NULLIF($4, '')::uuid,
          $5,
          $6,
          $7::decimal,
          0::decimal,
          $7::decimal,
          $8::jsonb
        )
        ON CONFLICT (employee_id, competence_year, competence_month, payroll_run_id)
        DO UPDATE SET
          total_earnings = EXCLUDED.total_earnings,
          total_deductions = EXCLUDED.total_deductions,
          net_amount = EXCLUDED.net_amount,
          metadata = EXCLUDED.metadata,
          generated_at = now()
        `,
        [
          employee.employee_id,
          run.id,
          employee.branch_id ?? '',
          employee.functional_status_id ?? '',
          run.competence_year,
          run.competence_month,
          this.roundCurrency(totalEarnings).toFixed(2),
          JSON.stringify({
            origin: 'termination',
            proportionalMonths,
            terminationDay,
          }),
        ],
      );
    }
  }

  private async resolvePayrollMappings(
    run: PayrollRunDetailRow,
    employee: EligibleEmployeeRow,
  ): Promise<PayrollMappingRow[]> {
    return this.databaseService.query<PayrollMappingRow>(
      `
      SELECT DISTINCT ON (mapped.earning_deduction_id)
        mapped.earning_deduction_id,
        mapped.code,
        mapped.description,
        mapped.kind,
        mapped.formula_expression,
        mapped.default_amount,
        mapped.default_quantity
      FROM (
        SELECT
          ed.id::text AS earning_deduction_id,
          ed.code,
          ed.description,
          ed.kind::text AS kind,
          ed.formula_expression,
          pte.default_amount::text AS default_amount,
          pte.default_quantity::text AS default_quantity,
          1 AS priority
        FROM payroll.payroll_type_earning pte
        JOIN payroll.payroll_earning_deduction ed
          ON ed.id = pte.earning_deduction_id
        WHERE pte.payroll_type_id = $1::uuid
          AND pte.status = 'ACTIVE'::"RecordStatus"
          AND (pte.starts_on IS NULL OR pte.starts_on <= make_date($2, $3, 1))
          AND (pte.ends_on IS NULL OR pte.ends_on >= make_date($2, $3, 1))
        UNION ALL
        SELECT
          ed.id::text AS earning_deduction_id,
          ed.code,
          ed.description,
          ed.kind::text AS kind,
          ed.formula_expression,
          ele.default_amount::text AS default_amount,
          ele.default_quantity::text AS default_quantity,
          2 AS priority
        FROM payroll.employment_link_earning ele
        JOIN payroll.payroll_earning_deduction ed
          ON ed.id = ele.earning_deduction_id
        WHERE ele.employment_link_id = $4::uuid
          AND ele.status = 'ACTIVE'::"RecordStatus"
          AND (ele.starts_on IS NULL OR ele.starts_on <= make_date($2, $3, 1))
          AND (ele.ends_on IS NULL OR ele.ends_on >= make_date($2, $3, 1))
        UNION ALL
        SELECT
          ed.id::text AS earning_deduction_id,
          ed.code,
          ed.description,
          ed.kind::text AS kind,
          ed.formula_expression,
          jpe.default_amount::text AS default_amount,
          jpe.default_quantity::text AS default_quantity,
          3 AS priority
        FROM payroll.job_position_earning jpe
        JOIN payroll.payroll_earning_deduction ed
          ON ed.id = jpe.earning_deduction_id
        WHERE jpe.job_position_id = $5::uuid
          AND jpe.status = 'ACTIVE'::"RecordStatus"
          AND (jpe.starts_on IS NULL OR jpe.starts_on <= make_date($2, $3, 1))
          AND (jpe.ends_on IS NULL OR jpe.ends_on >= make_date($2, $3, 1))
      ) mapped
      ORDER BY mapped.earning_deduction_id, mapped.priority
      `,
      [
        run.payroll_type_id,
        run.competence_year,
        run.competence_month,
        employee.employment_link_id,
        employee.job_position_id,
      ],
    );
  }

  private resolveMappedAmount(
    mapping: PayrollMappingRow,
    monthlySalary: number,
    quantity: number,
  ): number {
    if (mapping.default_amount !== null) {
      return this.roundCurrency(Number(mapping.default_amount) * quantity);
    }

    const expression = (mapping.formula_expression ?? '').toUpperCase();
    if (!expression) {
      return 0;
    }
    if (expression.includes('MONTHLY_SALARY / 2')) {
      return this.roundCurrency((monthlySalary / 2) * quantity);
    }
    if (expression.includes('MONTHLY_SALARY / 12')) {
      return this.roundCurrency((monthlySalary / 12) * quantity);
    }
    if (expression.includes('MONTHLY_SALARY')) {
      return this.roundCurrency(monthlySalary * quantity);
    }
    if (expression.includes('REFERENCE_VALUE')) {
      return this.roundCurrency(monthlySalary * quantity);
    }
    return 0;
  }

  private async refreshPayrollRunAggregates(id: string): Promise<void> {
    const totals = await this.databaseService.query<FinancialTotalsRow>(
      `
      SELECT
        count(DISTINCT employee_id)::text AS employee_count,
        coalesce(sum(CASE WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::text AS total_earnings,
        coalesce(sum(CASE WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::text AS total_deductions,
        coalesce(sum(CASE
          WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
          WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
          ELSE 0
        END), 0)::text AS total_net
      FROM payroll.employee_payroll_item item
      JOIN payroll.payroll_earning_deduction ed
        ON ed.id = item.earning_deduction_id
      WHERE item.payroll_run_id = $1::uuid
      `,
      [id],
    );

    const summary = totals[0] ?? {
      employee_count: '0',
      total_earnings: '0',
      total_deductions: '0',
      total_net: '0',
    };

    await this.databaseService.query(
      `
      UPDATE payroll.payroll_run
      SET
        employee_count = $2::int,
        total_earnings = $3::decimal,
        total_deductions = $4::decimal,
        total_net = $5::decimal,
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [
        id,
        summary.employee_count,
        summary.total_earnings,
        summary.total_deductions,
        summary.total_net,
      ],
    );

    await this.refreshWorkLocationRollups(id);
  }

  private async refreshWorkLocationRollups(id: string): Promise<void> {
    await this.databaseService.query(
      `DELETE FROM payroll.payroll_run_work_location WHERE payroll_run_id = $1::uuid`,
      [id],
    );
    await this.databaseService.query(
      `
      INSERT INTO payroll.payroll_run_work_location (
        tenant_id,
        payroll_run_id,
        work_location_id,
        employee_count,
        total_earnings,
        total_deductions,
        total_net,
        metadata
      )
      SELECT
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        e.work_location_id,
        count(DISTINCT item.employee_id)::int,
        coalesce(sum(CASE WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::decimal,
        coalesce(sum(CASE WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN item.amount ELSE 0 END), 0)::decimal,
        coalesce(sum(CASE
          WHEN ed.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
          WHEN ed.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
          ELSE 0
        END), 0)::decimal,
        jsonb_build_object('origin', 'payroll_run')
      FROM payroll.employee_payroll_item item
      JOIN hr.employee e ON e.id = item.employee_id
      JOIN payroll.payroll_earning_deduction ed
        ON ed.id = item.earning_deduction_id
      WHERE item.payroll_run_id = $1::uuid
      GROUP BY e.work_location_id
      `,
      [id],
    );
  }

  private async getSummary(id: string): Promise<PayrollRunSummary> {
    const rows = await this.databaseService.query<PayrollRunRow>(
      `
      SELECT
        pr.id,
        pr.competence_year,
        pr.competence_month,
        ptt.description AS processing_type,
        pt.description AS payroll_type,
        b.name AS branch_name,
        NULL::date AS payment_date,
        pr.status::text AS status,
        pr.employee_count,
        pr.total_net::text AS total_net,
        pr.created_at,
        pr.updated_at
      FROM payroll.payroll_run pr
      LEFT JOIN hr.branch b ON b.id = pr.branch_id
      LEFT JOIN payroll.payroll_type pt ON pt.id = pr.payroll_type_id
      LEFT JOIN payroll.processing_type ptt ON ptt.id = pr.processing_type_id
      WHERE pr.id = $1::uuid
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Payroll run not found');
    }
    return this.toSummary(rows[0]);
  }

  private async ensureAdvanceEarning(): Promise<string> {
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

  private async ensureTerminationEarnings(): Promise<Map<string, string>> {
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

  private calculateProportionalMonths(
    hiredOn: Date | null,
    terminatedOn: Date,
  ): number {
    const monthIndex = terminatedOn.getUTCMonth() + 1;
    const day = terminatedOn.getUTCDate();
    let proportional = day >= 15 ? monthIndex : monthIndex - 1;
    if (hiredOn && hiredOn.getUTCFullYear() === terminatedOn.getUTCFullYear()) {
      proportional -= hiredOn.getUTCMonth();
    }
    return Math.max(1, Math.min(12, proportional));
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
