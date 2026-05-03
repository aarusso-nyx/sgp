import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { roundMoney, toMoney } from '../../common/money/money';
import { DatabaseService } from '../../database/database.service';
import { PayrollEarningWriter } from './payroll-earning.writer';
import { isActivePayrollItemIdempotencyConflict } from './payroll-idempotency';
import { PayrollItemReader } from './payroll-item.reader';
import { PayrollLineWriter } from './payroll-line.writer';
import {
  CalculatePayrollRunDto,
  CreateAdvancePaymentDto,
  CreatePayrollRunDto,
  PopulatePayrollRunDto,
  UpdatePayrollRunStatusDto,
} from './payroll.dto';
import {
  PayrollMappingRow,
  PayrollRunDetailRow,
  PayrollRunRow,
} from './payroll.types';

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

export interface PayrollRunExecutionHistory {
  id: string;
  status: string;
  changedAt: string;
  note: string;
  kind: string | null;
  employeeCount: string | null;
  totalNet: string | null;
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

@Injectable()
export class PayrollService {
  private readonly itemReader: PayrollItemReader;
  private readonly earningWriter: PayrollEarningWriter;
  private readonly lineWriter: PayrollLineWriter;

  constructor(private readonly databaseService: DatabaseService) {
    this.itemReader = new PayrollItemReader(databaseService);
    this.earningWriter = new PayrollEarningWriter(databaseService);
    this.lineWriter = new PayrollLineWriter(databaseService);
  }

  async listRuns(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<PayrollRunSummary>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const total = await this.itemReader.countRuns(searchTerm);
    const rows = await this.itemReader.listRuns(searchTerm, pageSize, offset);

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
      return this.toSummary(await this.itemReader.createRun(input));
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

  async listRunHistory(id: string): Promise<PayrollRunExecutionHistory[]> {
    this.ensureDatabase();
    const rows = await this.itemReader.listRunHistory(id);

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      changedAt: this.toIso(row.changed_at),
      note: row.note,
      kind: row.kind,
      employeeCount: row.employee_count,
      totalNet: row.total_net,
    }));
  }

  async updateRunStatus(
    id: string,
    input: UpdatePayrollRunStatusDto,
  ): Promise<PayrollRunSummary> {
    this.ensureDatabase();
    const rows = await this.lineWriter.updateRunStatus(id, input.status);
    const row = rows[0];
    if (!row) throw new NotFoundException('Payroll run not found');
    return this.toSummary(row);
  }

  async populateRun(
    id: string,
    input: PopulatePayrollRunDto,
  ): Promise<PayrollRunSummary> {
    this.ensureDatabase();
    try {
      const run = await this.itemReader.getRunDetail(id);
      const replaceCalculatedItems = input.replaceCalculatedItems !== false;

      if (replaceCalculatedItems) {
        await this.lineWriter.prepareRunForReprocessing(id, run.status);
        await this.lineWriter.softDeleteCalculatedItems(
          id,
          'payroll.populate.reprocessed',
          'Payroll population reprocessed',
        );
      }

      const employees = await this.itemReader.listEligibleEmployees(run);
      for (const employee of employees) {
        const mappings = await this.itemReader.resolvePayrollMappings(
          run,
          employee,
        );
        for (const mapping of mappings) {
          const quantity = toMoney(mapping.default_quantity ?? '1');
          const amount = this.resolveMappedAmount(
            mapping,
            employee.salary_amount ?? '0',
            quantity,
          );
          if (amount.lte(0)) {
            continue;
          }
          await this.lineWriter.insertMappedPayrollItem(
            run,
            employee,
            mapping,
            quantity,
            amount,
          );
        }
      }

      await this.refreshPayrollRunAggregates(run.id);
      return this.toSummary(await this.itemReader.getSummary(run.id));
    } catch (error: unknown) {
      if (isActivePayrollItemIdempotencyConflict(error)) {
        throw new ConflictException(
          'Payroll run reprocessing conflicted with another execution',
        );
      }
      throw error;
    }
  }

  async createAdvancePayment(
    payrollRunId: string,
    input: CreateAdvancePaymentDto,
  ): Promise<AdvancePaymentResult> {
    this.ensureDatabase();
    const run = await this.itemReader.getRunDetail(payrollRunId);
    const approvedAmount = input.approvedAmount ?? input.requestedAmount;
    const requestedOn =
      input.requestedOn ?? new Date().toISOString().slice(0, 10);

    const requestId = await this.lineWriter.createAdvanceRequest({
      employeeId: input.employeeId,
      payrollRunId,
      requestedAmount: input.requestedAmount,
      approvedAmount,
      requestedOn,
      notes: input.notes,
    });
    const paymentId = await this.lineWriter.createAdvancePayment({
      requestId,
      employeeId: input.employeeId,
      payrollRunId,
      approvedAmount,
      requestedOn,
      notes: input.notes,
    });

    const advanceEarningId = await this.earningWriter.ensureAdvanceEarning();
    await this.lineWriter.insertAdvancePayrollItem({
      employeeId: input.employeeId,
      payrollRunId,
      earningId: advanceEarningId,
      competenceYear: run.competence_year,
      competenceMonth: run.competence_month,
      approvedAmount,
      paymentId,
    });

    await this.lineWriter.markAdvanceRequestProcessed(requestId);
    await this.refreshPayrollRunAggregates(payrollRunId);

    return {
      requestId,
      paymentId,
      employeeId: input.employeeId,
      payrollRunId,
      amount: roundMoney(approvedAmount).toFixed(2),
      requestStatus: 'PROCESSED',
      paymentStatus: 'GENERATED',
    };
  }

  async calculateRun(
    id: string,
    input: CalculatePayrollRunDto,
  ): Promise<PayrollRunSummary> {
    this.ensureDatabase();
    try {
      const run = await this.itemReader.getRunDetail(id);
      const mode = (input.mode ?? 'TOTAL').toUpperCase();
      const recalculated = run.status === 'GENERATED';
      if (mode === 'TOTAL') {
        await this.lineWriter.prepareRunForReprocessing(id, run.status);
        await this.lineWriter.softDeleteCalculatedItems(
          id,
          'payroll.run.reprocessed',
          'Payroll run recalculated',
        );
      }

      if (
        run.processing_type_code === 'RESCISAO' ||
        run.payroll_type_code === 'RESCISAO'
      ) {
        await this.calculateTerminationRun(run);
      }

      const totals = await this.itemReader.getFinancialTotals(id);
      const row = await this.lineWriter.finalizeCalculation(id, totals);
      await this.lineWriter.insertCalculationHistory({
        id,
        recalculated,
        mode,
        totals,
      });
      await this.lineWriter.refreshWorkLocationRollups(id);

      return this.toSummary(row);
    } catch (error: unknown) {
      if (isActivePayrollItemIdempotencyConflict(error)) {
        throw new ConflictException(
          'Payroll run reprocessing conflicted with another execution',
        );
      }
      throw error;
    }
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

  private resolveMappedAmount(
    mapping: PayrollMappingRow,
    monthlySalary: string,
    quantity: ReturnType<typeof toMoney>,
  ): ReturnType<typeof roundMoney> {
    if (mapping.default_amount !== null) {
      return roundMoney(toMoney(mapping.default_amount).times(quantity));
    }

    const expression = (mapping.formula_expression ?? '').toUpperCase();
    if (!expression) {
      return roundMoney(0);
    }
    const salary = toMoney(monthlySalary);
    if (expression.includes('MONTHLY_SALARY / 2')) {
      return roundMoney(salary.div(2).times(quantity));
    }
    if (expression.includes('MONTHLY_SALARY / 12')) {
      return roundMoney(salary.div(12).times(quantity));
    }
    if (expression.includes('MONTHLY_SALARY')) {
      return roundMoney(salary.times(quantity));
    }
    if (expression.includes('REFERENCE_VALUE')) {
      return roundMoney(salary.times(quantity));
    }
    return roundMoney(0);
  }

  private async refreshPayrollRunAggregates(id: string): Promise<void> {
    const totals = await this.itemReader.getFinancialTotals(id);
    await this.lineWriter.updateRunAggregates(id, totals);
    await this.lineWriter.refreshWorkLocationRollups(id);
  }

  private async calculateTerminationRun(
    run: PayrollRunDetailRow,
  ): Promise<void> {
    const earnings = await this.earningWriter.ensureTerminationEarnings();
    const employees = await this.itemReader.listTerminatedEmployees(run);

    for (const employee of employees) {
      const terminatedOn = employee.terminated_on
        ? new Date(employee.terminated_on)
        : null;
      const hiredOn = employee.hired_on ? new Date(employee.hired_on) : null;
      if (!terminatedOn) continue;

      const monthlySalary = toMoney(employee.salary_amount ?? '0');
      const terminationDay = terminatedOn.getUTCDate();
      const proportionalMonths = this.calculateProportionalMonths(
        hiredOn,
        terminatedOn,
      );
      const vacationProportional = roundMoney(
        monthlySalary.div(12).times(proportionalMonths),
      );
      const items: Array<[string, ReturnType<typeof roundMoney>]> = [
        ['RESC_SALDO', roundMoney(monthlySalary.div(30).times(terminationDay))],
        ['RESC_FERIAS_PROP', vacationProportional],
        ['RESC_FERIAS_TERCO', roundMoney(vacationProportional.div(3))],
        [
          'RESC_13_PROP',
          roundMoney(monthlySalary.div(12).times(proportionalMonths)),
        ],
      ];

      let totalEarnings = toMoney(0);
      for (const [code, amount] of items) {
        totalEarnings = totalEarnings.plus(amount);
        await this.lineWriter.insertTerminationPayrollItem({
          employee,
          run,
          earningId: earnings.get(code) ?? '',
          amount,
          code,
        });
      }

      await this.lineWriter.upsertTerminationFinancialRecord({
        employee,
        run,
        totalEarnings,
        proportionalMonths,
        terminationDay,
      });
    }
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
}
