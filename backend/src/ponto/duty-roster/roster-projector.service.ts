import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { formatDateOnlyUtc } from '../payroll-bridge/tenant-timezone.util';

interface ShiftProjectionRow extends QueryResultRow {
  shift_assignment_id: string;
  shift_pattern_id: string;
  anchor_date: Date | string;
  valid_from: Date | string;
  valid_to: Date | string | null;
  cycle_days: number;
  day_index: number;
  is_working: boolean;
  entry_time: string | null;
  exit_time: string | null;
  lunch_minutes: number | null;
  night_shift_flag: boolean;
  hazard_flag: boolean;
}

interface WorkScheduleProjectionRow extends QueryResultRow {
  weekday: number;
  entry_time: string | null;
  exit_time: string | null;
  total_minutes: number;
}

export interface RosterProjectionEntry {
  employeeId: string;
  workDate: string;
  expectedEntry: string | null;
  expectedExit: string | null;
  expectedMinutes: number;
  nightShiftFlag: boolean;
  hazardFlag: boolean;
  source: 'SHIFT_PATTERN' | 'WORK_SCHEDULE';
}

@Injectable()
export class RosterProjectorService {
  constructor(private readonly databaseService: DatabaseService) {}

  async projectEmployee(
    employeeId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<RosterProjectionEntry[]> {
    this.ensureDatabase();
    const shiftRows = await this.databaseService.query<ShiftProjectionRow>(
      `
      SELECT assignment.shift_assignment_id::text, assignment.shift_pattern_id::text,
             assignment.anchor_date, assignment.valid_from, assignment.valid_to,
             pattern.cycle_days, day.day_index, day.is_working, day.entry_time::text,
             day.exit_time::text, day.lunch_minutes, day.night_shift_flag, day.hazard_flag
      FROM ponto.shift_assignment assignment
      JOIN ponto.shift_pattern pattern
        ON pattern.shift_pattern_id = assignment.shift_pattern_id
       AND pattern.tenant_id = assignment.tenant_id
      JOIN ponto.shift_pattern_day day
        ON day.shift_pattern_id = pattern.shift_pattern_id
       AND day.tenant_id = pattern.tenant_id
      WHERE assignment.employee_id = $1::uuid
        AND assignment.valid_from <= $3::date
        AND COALESCE(assignment.valid_to, '9999-12-31'::date) >= $2::date
      ORDER BY assignment.valid_from DESC, day.day_index
      `,
      [employeeId, periodStart, periodEnd],
    );

    if (shiftRows.length > 0) {
      return this.projectShiftPattern(
        employeeId,
        periodStart,
        periodEnd,
        shiftRows,
      );
    }
    return this.projectWorkSchedule(employeeId, periodStart, periodEnd);
  }

  projectShiftPattern(
    employeeId: string,
    periodStart: string,
    periodEnd: string,
    rows: ShiftProjectionRow[],
  ): RosterProjectionEntry[] {
    const byAssignment = new Map<string, ShiftProjectionRow[]>();
    for (const row of rows) {
      const current = byAssignment.get(row.shift_assignment_id) ?? [];
      current.push(row);
      byAssignment.set(row.shift_assignment_id, current);
    }

    const assignments = [...byAssignment.values()].sort(
      (left, right) =>
        this.epochDay(right[0]!.valid_from) -
        this.epochDay(left[0]!.valid_from),
    );

    const output: RosterProjectionEntry[] = [];
    for (const date of this.eachDate(periodStart, periodEnd)) {
      const dateDay = this.epochDay(date);
      const assignment = assignments.find((candidate) => {
        const first = candidate[0]!;
        return (
          dateDay >= this.epochDay(first.valid_from) &&
          dateDay <= this.epochDay(first.valid_to ?? '9999-12-31')
        );
      });
      if (!assignment) continue;
      const first = assignment[0]!;
      const offset = this.positiveModulo(
        dateDay - this.epochDay(first.anchor_date),
        first.cycle_days,
      );
      const day = assignment.find(
        (candidate) => candidate.day_index === offset,
      );
      if (!day || !day.is_working) {
        output.push(this.emptyEntry(employeeId, date, 'SHIFT_PATTERN'));
        continue;
      }
      output.push({
        employeeId,
        workDate: date,
        expectedEntry: this.combineDateTime(date, day.entry_time),
        expectedExit: this.combineExitDateTime(
          date,
          day.entry_time,
          day.exit_time,
        ),
        expectedMinutes: this.expectedMinutes(
          day.entry_time,
          day.exit_time,
          day.lunch_minutes,
        ),
        nightShiftFlag: day.night_shift_flag,
        hazardFlag: day.hazard_flag,
        source: 'SHIFT_PATTERN',
      });
    }
    return output;
  }

  private async projectWorkSchedule(
    employeeId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<RosterProjectionEntry[]> {
    const rows = await this.databaseService.query<WorkScheduleProjectionRow>(
      `
      SELECT day.weekday, day.entry_time::text, day.exit_time::text, day.total_minutes
      FROM ponto.employee_schedule_assignment assignment
      JOIN ponto.work_schedule schedule
        ON schedule.work_schedule_id = assignment.work_schedule_id
       AND schedule.tenant_id = assignment.tenant_id
      JOIN ponto.work_shift shift
        ON shift.work_schedule_id = schedule.work_schedule_id
       AND shift.tenant_id = schedule.tenant_id
      JOIN ponto.day_schedule day
        ON day.work_shift_id = shift.work_shift_id
       AND day.tenant_id = shift.tenant_id
      WHERE assignment.employee_id = $1::uuid
        AND assignment.valid_from <= $3::date
        AND COALESCE(assignment.valid_to, '9999-12-31'::date) >= $2::date
      ORDER BY assignment.valid_from DESC, day.weekday
      `,
      [employeeId, periodStart, periodEnd],
    );
    if (rows.length === 0) return [];
    const byWeekday = new Map(rows.map((row) => [row.weekday, row]));
    return this.eachDate(periodStart, periodEnd).map((date) => {
      const day = byWeekday.get(new Date(`${date}T00:00:00.000Z`).getUTCDay());
      if (!day) return this.emptyEntry(employeeId, date, 'WORK_SCHEDULE');
      return {
        employeeId,
        workDate: date,
        expectedEntry: this.combineDateTime(date, day.entry_time),
        expectedExit: this.combineExitDateTime(
          date,
          day.entry_time,
          day.exit_time,
        ),
        expectedMinutes: day.total_minutes,
        nightShiftFlag: false,
        hazardFlag: false,
        source: 'WORK_SCHEDULE',
      };
    });
  }

  private emptyEntry(
    employeeId: string,
    workDate: string,
    source: RosterProjectionEntry['source'],
  ): RosterProjectionEntry {
    return {
      employeeId,
      workDate,
      expectedEntry: null,
      expectedExit: null,
      expectedMinutes: 0,
      nightShiftFlag: false,
      hazardFlag: false,
      source,
    };
  }

  private eachDate(periodStart: string, periodEnd: string): string[] {
    const dates: string[] = [];
    for (
      let cursor = this.epochDay(periodStart), end = this.epochDay(periodEnd);
      cursor <= end;
      cursor += 1
    ) {
      dates.push(formatDateOnlyUtc(new Date(cursor * 86_400_000)));
    }
    return dates;
  }

  private expectedMinutes(
    entryTime: string | null,
    exitTime: string | null,
    lunchMinutes: number | null,
  ): number {
    if (!entryTime || !exitTime) return 0;
    const entry = this.timeToMinutes(entryTime);
    let exit = this.timeToMinutes(exitTime);
    if (exit <= entry) exit += 24 * 60;
    return Math.max(0, exit - entry - (lunchMinutes ?? 0));
  }

  private combineDateTime(date: string, time: string | null): string | null {
    if (!time) return null;
    return `${date}T${time.slice(0, 8)}-03:00`;
  }

  private combineExitDateTime(
    date: string,
    entryTime: string | null,
    exitTime: string | null,
  ): string | null {
    if (!entryTime || !exitTime) return this.combineDateTime(date, exitTime);
    const exitDate =
      this.timeToMinutes(exitTime) <= this.timeToMinutes(entryTime)
        ? formatDateOnlyUtc(new Date((this.epochDay(date) + 1) * 86_400_000))
        : date;
    return this.combineDateTime(exitDate, exitTime);
  }

  private epochDay(value: Date | string): number {
    const date =
      typeof value === 'string' ? value.slice(0, 10) : formatDateOnlyUtc(value);
    return Math.floor(Date.parse(`${date}T00:00:00.000Z`) / 86_400_000);
  }

  private positiveModulo(value: number, divisor: number): number {
    return ((value % divisor) + divisor) % divisor;
  }

  private timeToMinutes(value: string): number {
    const [hours = '0', minutes = '0'] = value.split(':');
    return Number(hours) * 60 + Number(minutes);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
