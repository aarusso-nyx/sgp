import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { formatDateOnlyUtc } from '../payroll-bridge/tenant-timezone.util';
import { OpenTimesheetPeriodDto } from '../ponto.dto';

interface TimesheetPeriodRow extends QueryResultRow {
  timesheet_period_id: string;
  employee_id: string;
  period_start: Date | string;
  period_end: Date | string;
  status: string;
  worked_minutes: number;
  overtime_50_minutes: number;
  overtime_100_minutes: number;
  night_minutes: number;
  absence_minutes: number;
}

export interface TimesheetPeriodSummary {
  timesheetPeriodId: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  workedMinutes: number;
  overtime50Minutes: number;
  overtime100Minutes: number;
  nightMinutes: number;
  absenceMinutes: number;
}

@Injectable()
export class TimesheetPeriodService {
  constructor(private readonly databaseService: DatabaseService) {}

  async open(input: OpenTimesheetPeriodDto): Promise<TimesheetPeriodSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<TimesheetPeriodRow>(
      `
      INSERT INTO ponto.timesheet_period (employee_id, period_start, period_end, status)
      SELECT employee_id, $2::date, $3::date, 'OPEN'::ponto.timesheet_period_status
      FROM unnest($1::uuid[]) AS employee_id
      ON CONFLICT (tenant_id, employee_id, period_start, period_end) DO UPDATE
      SET status = 'OPEN'::ponto.timesheet_period_status,
          updated_at = now()
      RETURNING timesheet_period_id::text, employee_id::text, period_start, period_end,
                status::text, worked_minutes, overtime_50_minutes, overtime_100_minutes,
                night_minutes, absence_minutes
      `,
      [input.employeeIds, input.periodStart, input.periodEnd],
    );
    return rows.map((row) => this.toSummary(row));
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toSummary(row: TimesheetPeriodRow): TimesheetPeriodSummary {
    return {
      timesheetPeriodId: row.timesheet_period_id,
      employeeId: row.employee_id,
      periodStart: formatDateOnlyUtc(row.period_start),
      periodEnd: formatDateOnlyUtc(row.period_end),
      status: row.status,
      workedMinutes: row.worked_minutes,
      overtime50Minutes: row.overtime_50_minutes,
      overtime100Minutes: row.overtime_100_minutes,
      nightMinutes: row.night_minutes,
      absenceMinutes: row.absence_minutes,
    };
  }
}
