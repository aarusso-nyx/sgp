import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { formatDateOnlyUtc } from './tenant-timezone.util';
import { TimesheetPayrollAggregate } from './payroll-bridge.types';

interface TimesheetPeriodStatusRow extends QueryResultRow {
  tenant_id: string;
  employee_id: string;
  period_start: Date | string;
  period_end: Date | string;
  status: string;
}

interface AggregateRow extends QueryResultRow {
  tenant_id: string;
  employee_id: string;
  period_start: Date | string;
  period_end: Date | string;
  worked_minutes: number | string;
  expected_minutes: number | string;
  overtime_50_minutes: number | string;
  overtime_100_minutes: number | string;
  night_minutes: number | string;
  late_minutes: number | string;
  absence_unpaid_minutes: number | string;
  absence_paid_minutes: number | string;
  hour_bank_settlement_minutes: number | string;
}

@Injectable()
export class TimesheetAggregatorService {
  constructor(private readonly databaseService: DatabaseService) {}

  async aggregate(
    timesheetPeriodId: string,
  ): Promise<TimesheetPayrollAggregate> {
    this.ensureDatabase();
    const period = await this.loadClosedPeriod(timesheetPeriodId);
    const rows = await this.databaseService.query<AggregateRow>(
      `
      SELECT tenant_id::text, employee_id::text, period_start, period_end,
             worked_minutes, expected_minutes, overtime_50_minutes, overtime_100_minutes,
             night_minutes, late_minutes, absence_unpaid_minutes, absence_paid_minutes,
             hour_bank_settlement_minutes
      FROM ponto.fn_aggregate_timesheet($1::uuid, $2::uuid, $3::date, $4::date)
      `,
      [
        period.tenant_id,
        period.employee_id,
        formatDateOnlyUtc(period.period_start),
        formatDateOnlyUtc(period.period_end),
      ],
    );
    return this.toAggregate(rows[0]!);
  }

  async loadClosedPeriod(
    timesheetPeriodId: string,
  ): Promise<TimesheetPeriodStatusRow> {
    const rows = await this.databaseService.query<TimesheetPeriodStatusRow>(
      `
      SELECT tenant_id::text, employee_id::text, period_start, period_end, status::text
      FROM ponto.timesheet_period
      WHERE timesheet_period_id = $1::uuid
      `,
      [timesheetPeriodId],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Timesheet period was not found.');
    }
    if (row.status !== 'CLOSED') {
      throw new BadRequestException(
        'Payroll bridge requires a CLOSED timesheet period.',
      );
    }
    return row;
  }

  private toAggregate(row: AggregateRow): TimesheetPayrollAggregate {
    return {
      tenantId: row.tenant_id,
      employeeId: row.employee_id,
      periodStart: formatDateOnlyUtc(row.period_start),
      periodEnd: formatDateOnlyUtc(row.period_end),
      workedMinutes: Number(row.worked_minutes),
      expectedMinutes: Number(row.expected_minutes),
      overtime50Minutes: Number(row.overtime_50_minutes),
      overtime100Minutes: Number(row.overtime_100_minutes),
      nightMinutes: Number(row.night_minutes),
      lateMinutes: Number(row.late_minutes),
      absenceUnpaidMinutes: Number(row.absence_unpaid_minutes),
      absencePaidMinutes: Number(row.absence_paid_minutes),
      hourBankSettlementMinutes: Number(row.hour_bank_settlement_minutes),
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
