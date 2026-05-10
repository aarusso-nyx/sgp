import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { RunPayrollSimulationDto } from './simulacao.dto';
import { domainError } from '../../common/errors/domain-error';

interface SimulationLineRow extends QueryResultRow {
  earning_deduction_id: string;
  code: string;
  description: string;
  kind: string;
  amount: string;
  quantity: string;
  source: string;
}

interface CountRow extends QueryResultRow {
  payroll_runs: string;
  payroll_run_lines: string;
}

export interface PayrollSimulationLine {
  earningDeductionId: string;
  code: string;
  description: string;
  kind: string;
  currentAmount: string;
  amount: string;
  delta: string;
  quantity: string;
  source: string;
}

export interface PayrollSimulationResult {
  tenantId: string;
  employmentLinkId: string;
  competence: string;
  totals: {
    currentEarnings: string;
    currentDeductions: string;
    currentNet: string;
    simulatedEarnings: string;
    simulatedDeductions: string;
    simulatedNet: string;
    netDelta: string;
  };
  lines: PayrollSimulationLine[];
  persistenceCheck: {
    payrollRunsBefore: string;
    payrollRunsAfter: string;
    payrollRunLinesBefore: string;
    payrollRunLinesAfter: string;
  };
}

class RollbackSimulation extends Error {
  constructor() {
    super('rollback_simulation');
  }
}

@Injectable()
export class SimulacaoService {
  constructor(private readonly databaseService: DatabaseService) {}

  async run(input: RunPayrollSimulationDto): Promise<PayrollSimulationResult> {
    this.ensureDatabase();
    const competence = this.normalizeCompetence(input.competence);
    const overrides = this.normalizeOverrides(input.overrides ?? {});
    let result: PayrollSimulationResult | undefined;

    try {
      await this.databaseService.transaction(async (client) => {
        await client.query('SAVEPOINT payroll_simulation_dry_run');
        const before = await this.countPayrollRows(client, input.tenantId);
        const baseline = await this.querySimulation(
          client,
          input.tenantId,
          input.employmentLinkId,
          competence,
          {},
        );
        const simulated = await this.querySimulation(
          client,
          input.tenantId,
          input.employmentLinkId,
          competence,
          overrides,
        );
        await client.query('ROLLBACK TO SAVEPOINT payroll_simulation_dry_run');
        const after = await this.countPayrollRows(client, input.tenantId);

        result = this.toResult(
          input,
          competence,
          baseline,
          simulated,
          before,
          after,
        );
        if (
          before.payroll_runs !== after.payroll_runs ||
          before.payroll_run_lines !== after.payroll_run_lines
        ) {
          throw domainError.internal(
            'INTERNAL_INVARIANT',
            'Payroll simulation changed payroll_run tables',
          );
        }

        throw new RollbackSimulation();
      });
    } catch (error) {
      if (error instanceof RollbackSimulation && result) {
        return result;
      }
      throw error;
    }

    throw domainError.internal(
      'INTERNAL_INVARIANT',
      'Payroll simulation transaction did not roll back',
    );
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for payroll simulation',
      );
    }
  }

  private normalizeCompetence(value: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('competence must use YYYY-MM-DD format');
    }
    return value;
  }

  private normalizeOverrides(
    overrides: NonNullable<RunPayrollSimulationDto['overrides']>,
  ): Record<string, string | number> {
    const normalized: Record<string, string | number> = {};
    if (overrides.baseSalary !== undefined) {
      normalized.baseSalary = this.normalizeDecimal(
        overrides.baseSalary,
        'baseSalary',
      );
    }
    if (overrides.dependentCount !== undefined) {
      normalized.dependentCount = overrides.dependentCount;
    }
    if (overrides.rubricId) {
      normalized.rubricId = overrides.rubricId;
    }
    if (overrides.rubricAmount !== undefined) {
      normalized.rubricAmount = this.normalizeDecimal(
        overrides.rubricAmount,
        'rubricAmount',
      );
    }
    if (overrides.rubricQuantity !== undefined) {
      normalized.rubricQuantity = this.normalizeDecimal(
        overrides.rubricQuantity,
        'rubricQuantity',
      );
    }
    return normalized;
  }

  private normalizeDecimal(value: string, field: string): string {
    const decimal = new Decimal(value);
    if (!decimal.isFinite()) {
      throw new BadRequestException(`${field} must be a finite decimal`);
    }
    return decimal.toFixed(2);
  }

  private async countPayrollRows(
    client: {
      query<T extends QueryResultRow>(
        sql: string,
        values: unknown[],
      ): Promise<{ rows: T[] }>;
    },
    tenantId: string,
  ): Promise<CountRow> {
    const counts = await client.query<CountRow>(
      `
      SELECT
        (
          SELECT count(*)::text
          FROM payroll.payroll_run
          WHERE tenant_id = $1::uuid
        ) AS payroll_runs,
        (
          SELECT count(*)::text
          FROM payroll.employee_payroll_item
          WHERE tenant_id = $1::uuid
        ) AS payroll_run_lines
      `,
      [tenantId],
    );
    return counts.rows[0] ?? { payroll_runs: '0', payroll_run_lines: '0' };
  }

  private async querySimulation(
    client: PoolClient,
    tenantId: string,
    employmentLinkId: string,
    competence: string,
    overrides: Record<string, string | number>,
  ): Promise<SimulationLineRow[]> {
    const result = await client.query<SimulationLineRow>(
      `
      SELECT *
      FROM payroll_calc.simulate_payroll($1::uuid, $2::uuid, $3::date, $4::jsonb)
      `,
      [tenantId, employmentLinkId, competence, JSON.stringify(overrides)],
    );
    return result.rows;
  }

  private toResult(
    input: RunPayrollSimulationDto,
    competence: string,
    baseline: SimulationLineRow[],
    simulated: SimulationLineRow[],
    before: CountRow,
    after: CountRow,
  ): PayrollSimulationResult {
    const baselineById = new Map(
      baseline.map((row) => [row.earning_deduction_id, row]),
    );
    const lines = simulated.map((row) => {
      const current =
        baselineById.get(row.earning_deduction_id)?.amount ?? '0.00';
      const delta = new Decimal(row.amount).minus(current).toFixed(2);
      return {
        earningDeductionId: row.earning_deduction_id,
        code: row.code,
        description: row.description,
        kind: row.kind,
        currentAmount: current,
        amount: new Decimal(row.amount).toFixed(2),
        delta,
        quantity: row.quantity,
        source: row.source,
      };
    });
    const totals = this.totalLines(lines);
    return {
      tenantId: input.tenantId,
      employmentLinkId: input.employmentLinkId,
      competence,
      totals,
      lines,
      persistenceCheck: {
        payrollRunsBefore: before.payroll_runs,
        payrollRunsAfter: after.payroll_runs,
        payrollRunLinesBefore: before.payroll_run_lines,
        payrollRunLinesAfter: after.payroll_run_lines,
      },
    };
  }

  private totalLines(
    lines: PayrollSimulationLine[],
  ): PayrollSimulationResult['totals'] {
    const totals = lines.reduce(
      (accumulator, line) => {
        const current = new Decimal(line.currentAmount);
        const simulated = new Decimal(line.amount);
        if (line.kind === 'DEDUCTION') {
          accumulator.currentDeductions =
            accumulator.currentDeductions.plus(current);
          accumulator.simulatedDeductions =
            accumulator.simulatedDeductions.plus(simulated);
        } else {
          accumulator.currentEarnings =
            accumulator.currentEarnings.plus(current);
          accumulator.simulatedEarnings =
            accumulator.simulatedEarnings.plus(simulated);
        }
        return accumulator;
      },
      {
        currentEarnings: new Decimal(0),
        currentDeductions: new Decimal(0),
        simulatedEarnings: new Decimal(0),
        simulatedDeductions: new Decimal(0),
      },
    );
    const currentNet = totals.currentEarnings.minus(totals.currentDeductions);
    const simulatedNet = totals.simulatedEarnings.minus(
      totals.simulatedDeductions,
    );
    return {
      currentEarnings: totals.currentEarnings.toFixed(2),
      currentDeductions: totals.currentDeductions.toFixed(2),
      currentNet: currentNet.toFixed(2),
      simulatedEarnings: totals.simulatedEarnings.toFixed(2),
      simulatedDeductions: totals.simulatedDeductions.toFixed(2),
      simulatedNet: simulatedNet.toFixed(2),
      netDelta: simulatedNet.minus(currentNet).toFixed(2),
    };
  }
}
