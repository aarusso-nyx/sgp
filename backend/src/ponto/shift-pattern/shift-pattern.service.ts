import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { formatDateOnlyUtc } from '../payroll-bridge/tenant-timezone.util';
import {
  AssignShiftPatternDto,
  CreateShiftPatternDto,
  ShiftPatternDayDto,
  UpdateShiftAssignmentDto,
} from '../ponto.dto';

interface ShiftPatternRow extends QueryResultRow {
  shift_pattern_id: string;
  code: string;
  name: string;
  cycle_days: number;
  kind: string;
}

interface ShiftPatternDayRow extends QueryResultRow {
  day_index: number;
  is_working: boolean;
  entry_time: string | null;
  exit_time: string | null;
  lunch_minutes: number | null;
  night_shift_flag: boolean;
  hazard_flag: boolean;
}

interface ShiftAssignmentRow extends QueryResultRow {
  shift_assignment_id: string;
  employee_id: string;
  shift_pattern_id: string;
  anchor_date: Date | string;
  valid_from: Date | string;
  valid_to: Date | string | null;
}

export interface ShiftPatternDaySummary {
  dayIndex: number;
  isWorking: boolean;
  entryTime: string | null;
  exitTime: string | null;
  lunchMinutes: number | null;
  nightShiftFlag: boolean;
  hazardFlag: boolean;
  expectedMinutes: number;
}

export interface ShiftPatternSummary {
  shiftPatternId: string;
  code: string;
  name: string;
  cycleDays: number;
  kind: string;
  days: ShiftPatternDaySummary[];
}

export interface ShiftAssignmentSummary {
  shiftAssignmentId: string;
  employeeId: string;
  shiftPatternId: string;
  anchorDate: string;
  validFrom: string;
  validTo: string | null;
}

@Injectable()
export class ShiftPatternService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<ShiftPatternSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ShiftPatternRow>(
      `
      SELECT shift_pattern_id::text, code, name, cycle_days, kind::text
      FROM ponto.shift_pattern
      ORDER BY code
      `,
    );
    return Promise.all(rows.map((row) => this.patternWithDays(row)));
  }

  async create(input: CreateShiftPatternDto): Promise<ShiftPatternSummary> {
    this.ensureDatabase();
    this.validatePattern(input);
    return this.databaseService.transaction(async (client) => {
      const created = await client.query<ShiftPatternRow>(
        `
        INSERT INTO ponto.shift_pattern (code, name, cycle_days, kind)
        VALUES ($1, $2, $3, $4::ponto.shift_pattern_kind)
        RETURNING shift_pattern_id::text, code, name, cycle_days, kind::text
        `,
        [input.code.trim(), input.name.trim(), input.cycleDays, input.kind],
      );
      await this.insertDays(
        client,
        created.rows[0]!.shift_pattern_id,
        input.days,
      );
      return this.patternWithDays(created.rows[0]!, client);
    });
  }

  async assign(input: AssignShiftPatternDto): Promise<ShiftAssignmentSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ShiftAssignmentRow>(
      `
      INSERT INTO ponto.shift_assignment (
        employee_id, shift_pattern_id, anchor_date, valid_from, valid_to
      )
      VALUES ($1::uuid, $2::uuid, $3::date, $4::date, $5::date)
      RETURNING shift_assignment_id::text, employee_id::text, shift_pattern_id::text,
                anchor_date, valid_from, valid_to
      `,
      [
        input.employeeId,
        input.shiftPatternId,
        input.anchorDate,
        input.validFrom,
        input.validTo ?? null,
      ],
    );
    return this.toAssignmentSummary(rows[0]!);
  }

  async updateAssignment(
    shiftAssignmentId: string,
    input: UpdateShiftAssignmentDto,
  ): Promise<ShiftAssignmentSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ShiftAssignmentRow>(
      `
      UPDATE ponto.shift_assignment
      SET shift_pattern_id = COALESCE($2::uuid, shift_pattern_id),
          anchor_date = COALESCE($3::date, anchor_date),
          valid_from = COALESCE($4::date, valid_from),
          valid_to = CASE WHEN $5::text = '__KEEP__' THEN valid_to ELSE $5::date END
      WHERE shift_assignment_id = $1::uuid
      RETURNING shift_assignment_id::text, employee_id::text, shift_pattern_id::text,
                anchor_date, valid_from, valid_to
      `,
      [
        shiftAssignmentId,
        input.shiftPatternId ?? null,
        input.anchorDate ?? null,
        input.validFrom ?? null,
        Object.prototype.hasOwnProperty.call(input, 'validTo')
          ? (input.validTo ?? null)
          : '__KEEP__',
      ],
    );
    if (!rows[0]) {
      throw new BadRequestException('Shift assignment not found');
    }
    return this.toAssignmentSummary(rows[0]);
  }

  async listAssignments(
    employeeId?: string,
  ): Promise<ShiftAssignmentSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ShiftAssignmentRow>(
      `
      SELECT shift_assignment_id::text, employee_id::text, shift_pattern_id::text,
             anchor_date, valid_from, valid_to
      FROM ponto.shift_assignment
      WHERE ($1::uuid IS NULL OR employee_id = $1::uuid)
      ORDER BY valid_from DESC
      `,
      [employeeId ?? null],
    );
    return rows.map((row) => this.toAssignmentSummary(row));
  }

  validatePattern(input: CreateShiftPatternDto): void {
    if (input.days.length !== input.cycleDays) {
      throw new BadRequestException('Shift pattern days must match cycleDays');
    }
    const indexes = new Set(input.days.map((day) => day.dayIndex));
    for (let index = 0; index < input.cycleDays; index += 1) {
      if (!indexes.has(index)) {
        throw new BadRequestException(
          'Shift pattern day indexes must cover the full cycle',
        );
      }
    }
    for (const day of input.days) {
      if (day.dayIndex >= input.cycleDays) {
        throw new BadRequestException(
          'Shift pattern day index exceeds cycleDays',
        );
      }
      if (day.isWorking && (!day.entryTime || !day.exitTime)) {
        throw new BadRequestException(
          'Working pattern days require entry and exit times',
        );
      }
      if (day.isWorking && this.expectedMinutes(day) <= 0) {
        throw new BadRequestException(
          'Working pattern days must produce positive minutes',
        );
      }
    }
  }

  expectedMinutes(
    day: Pick<ShiftPatternDayDto, 'entryTime' | 'exitTime' | 'lunchMinutes'>,
  ): number {
    if (!day.entryTime || !day.exitTime) return 0;
    const entry = this.timeToMinutes(day.entryTime);
    let exit = this.timeToMinutes(day.exitTime);
    if (exit <= entry) exit += 24 * 60;
    return Math.max(0, exit - entry - (day.lunchMinutes ?? 0));
  }

  private async patternWithDays(
    row: ShiftPatternRow,
    client?: Pick<PoolClient, 'query'>,
  ): Promise<ShiftPatternSummary> {
    const result = await (client
      ? client.query<ShiftPatternDayRow>(
          `
      SELECT day_index, is_working, entry_time::text, exit_time::text, lunch_minutes,
             night_shift_flag, hazard_flag
      FROM ponto.shift_pattern_day
      WHERE shift_pattern_id = $1::uuid
      ORDER BY day_index
      `,
          [row.shift_pattern_id],
        )
      : this.databaseService.query<ShiftPatternDayRow>(
          `
      SELECT day_index, is_working, entry_time::text, exit_time::text, lunch_minutes,
             night_shift_flag, hazard_flag
      FROM ponto.shift_pattern_day
      WHERE shift_pattern_id = $1::uuid
      ORDER BY day_index
      `,
          [row.shift_pattern_id],
        ));
    const days = Array.isArray(result) ? result : result.rows;
    return {
      shiftPatternId: row.shift_pattern_id,
      code: row.code,
      name: row.name,
      cycleDays: row.cycle_days,
      kind: row.kind,
      days: days.map((day) => this.toDaySummary(day)),
    };
  }

  private async insertDays(
    client: PoolClient,
    shiftPatternId: string,
    days: ShiftPatternDayDto[],
  ): Promise<void> {
    for (const day of days) {
      await client.query(
        `
        INSERT INTO ponto.shift_pattern_day (
          shift_pattern_id, day_index, is_working, entry_time, exit_time,
          lunch_minutes, night_shift_flag, hazard_flag
        )
        VALUES (
          $1::uuid, $2, $3, NULLIF($4, '')::time, NULLIF($5, '')::time,
          $6, $7, $8
        )
        `,
        [
          shiftPatternId,
          day.dayIndex,
          day.isWorking,
          day.entryTime ?? null,
          day.exitTime ?? null,
          day.lunchMinutes ?? null,
          day.nightShiftFlag ?? false,
          day.hazardFlag ?? false,
        ],
      );
    }
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toDaySummary(row: ShiftPatternDayRow): ShiftPatternDaySummary {
    return {
      dayIndex: row.day_index,
      isWorking: row.is_working,
      entryTime: row.entry_time,
      exitTime: row.exit_time,
      lunchMinutes: row.lunch_minutes,
      nightShiftFlag: row.night_shift_flag,
      hazardFlag: row.hazard_flag,
      expectedMinutes: row.is_working
        ? this.expectedMinutes({
            entryTime: row.entry_time ?? undefined,
            exitTime: row.exit_time ?? undefined,
            lunchMinutes: row.lunch_minutes ?? undefined,
          })
        : 0,
    };
  }

  private toAssignmentSummary(row: ShiftAssignmentRow): ShiftAssignmentSummary {
    return {
      shiftAssignmentId: row.shift_assignment_id,
      employeeId: row.employee_id,
      shiftPatternId: row.shift_pattern_id,
      anchorDate: this.dateOnly(row.anchor_date),
      validFrom: this.dateOnly(row.valid_from),
      validTo: row.valid_to ? this.dateOnly(row.valid_to) : null,
    };
  }

  private dateOnly(value: Date | string): string {
    return formatDateOnlyUtc(value);
  }

  private timeToMinutes(value: string): number {
    const [hours = '0', minutes = '0'] = value.split(':');
    return Number(hours) * 60 + Number(minutes);
  }
}
