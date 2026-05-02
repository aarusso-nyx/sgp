import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { ApplyPayrollBridgeDto } from '../ponto.dto';
import {
  PayrollBridgeApplyResult,
  PayrollBridgeLine,
  PayrollBridgePreview,
} from './payroll-bridge.types';
import { formatInstantIso } from './tenant-timezone.util';
import { PayrollLineBuilderService } from './payroll-line-builder.service';
import { TimesheetAggregatorService } from './timesheet-aggregator.service';

interface PayrollRunRow extends QueryResultRow {
  competence_month: number;
  competence_year: number;
}

interface BridgeEventRow extends QueryResultRow {
  payroll_bridge_event_id: string;
  applied_at: Date | string;
  applied_lines: PayrollBridgeLine[] | string;
}

@Injectable()
export class PayrollBridgeService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly aggregatorService: TimesheetAggregatorService,
    private readonly lineBuilderService: PayrollLineBuilderService,
  ) {}

  async preview(input: ApplyPayrollBridgeDto): Promise<PayrollBridgePreview> {
    this.ensureDatabase();
    const aggregate = await this.aggregatorService.aggregate(
      input.timesheetPeriodId,
    );
    const run = await this.loadPayrollRun(input.payrollRunId);
    const lines = await this.lineBuilderService.buildLines(
      aggregate,
      Number(run.competence_month),
      Number(run.competence_year),
    );
    const existing = await this.findExistingEvent(
      aggregate.tenantId,
      input.payrollRunId,
      aggregate.employeeId,
      input.timesheetPeriodId,
    );
    return {
      timesheetPeriodId: input.timesheetPeriodId,
      payrollRunId: input.payrollRunId,
      aggregate,
      lines,
      alreadyApplied: Boolean(existing),
    };
  }

  async apply(input: ApplyPayrollBridgeDto): Promise<PayrollBridgeApplyResult> {
    this.ensureDatabase();
    const preview = await this.preview(input);
    const existing = await this.findExistingEvent(
      preview.aggregate.tenantId,
      input.payrollRunId,
      preview.aggregate.employeeId,
      input.timesheetPeriodId,
    );
    if (existing) {
      return {
        ...preview,
        alreadyApplied: true,
        payrollBridgeEventId: existing.payroll_bridge_event_id,
        appliedAt: formatInstantIso(existing.applied_at),
        lines: this.parseLines(existing.applied_lines),
      };
    }

    const inserted = await this.databaseService.transaction(async (client) => {
      for (const line of preview.lines) {
        await this.insertPayrollLine(client, input, preview, line);
      }
      const rows = await client.query<BridgeEventRow>(
        `
        INSERT INTO ponto.payroll_bridge_event (
          tenant_id,
          payroll_run_id,
          employee_id,
          timesheet_period_id,
          applied_lines
        )
        VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::jsonb)
        ON CONFLICT (tenant_id, payroll_run_id, employee_id, timesheet_period_id)
        DO UPDATE SET applied_lines = ponto.payroll_bridge_event.applied_lines
        RETURNING payroll_bridge_event_id::text, applied_at, applied_lines
        `,
        [
          preview.aggregate.tenantId,
          input.payrollRunId,
          preview.aggregate.employeeId,
          input.timesheetPeriodId,
          JSON.stringify(preview.lines),
        ],
      );
      return rows.rows[0];
    });

    return {
      ...preview,
      payrollBridgeEventId: inserted.payroll_bridge_event_id,
      appliedAt: formatInstantIso(inserted.applied_at),
    };
  }

  private async insertPayrollLine(
    client: PoolClient,
    input: ApplyPayrollBridgeDto,
    preview: PayrollBridgePreview,
    line: PayrollBridgeLine,
  ): Promise<void> {
    await client.query(
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
        notes,
        idempotency_key
      )
      SELECT $1::uuid,
             $2::uuid,
             run.id,
             $4::uuid,
             'CALCULATED'::public."PayrollEntrySource",
             run.competence_year,
             run.competence_month,
             $5::numeric(12,4),
             $6::numeric(14,2),
             $7::numeric(14,2),
             $8,
             $9
      FROM payroll.payroll_run run
      WHERE run.id = $3::uuid
        AND run.tenant_id = $1::uuid
      ON CONFLICT DO NOTHING
      `,
      [
        preview.aggregate.tenantId,
        preview.aggregate.employeeId,
        input.payrollRunId,
        line.earningDeductionId,
        line.quantityHours,
        line.referenceValue,
        line.kind === 'DEDUCTION' ? `-${line.amount}` : line.amount,
        `PONTO-07 ${line.code} from timesheet ${input.timesheetPeriodId}`,
        `ponto07:${input.payrollRunId}:${preview.aggregate.employeeId}:${input.timesheetPeriodId}:${line.code}`,
      ],
    );
  }

  private async loadPayrollRun(payrollRunId: string): Promise<PayrollRunRow> {
    const rows = await this.databaseService.query<PayrollRunRow>(
      `
      SELECT competence_month, competence_year
      FROM payroll.payroll_run
      WHERE id = $1::uuid
      `,
      [payrollRunId],
    );
    if (!rows[0]) {
      throw new Error('Payroll run was not found.');
    }
    return rows[0];
  }

  private async findExistingEvent(
    tenantId: string,
    payrollRunId: string,
    employeeId: string,
    timesheetPeriodId: string,
  ): Promise<BridgeEventRow | undefined> {
    const rows = await this.databaseService.query<BridgeEventRow>(
      `
      SELECT payroll_bridge_event_id::text, applied_at, applied_lines
      FROM ponto.payroll_bridge_event
      WHERE tenant_id = $1::uuid
        AND payroll_run_id = $2::uuid
        AND employee_id = $3::uuid
        AND timesheet_period_id = $4::uuid
      `,
      [tenantId, payrollRunId, employeeId, timesheetPeriodId],
    );
    return rows[0];
  }

  private parseLines(value: PayrollBridgeLine[] | string): PayrollBridgeLine[] {
    if (typeof value === 'string') {
      return JSON.parse(value) as PayrollBridgeLine[];
    }
    return value;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
