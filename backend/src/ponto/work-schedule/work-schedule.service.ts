import {
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { SgpEsocialEmittersService } from '../../integrations/stynx-esocial';
import { formatDateOnlyUtc } from '../payroll-bridge/tenant-timezone.util';
import { CreateWorkScheduleDto } from '../ponto.dto';

interface WorkScheduleRow extends QueryResultRow {
  work_schedule_id: string;
  code: string;
  name: string;
  weekly_hours: string;
  tolerance_minutes: number;
  status: string;
  valid_from: Date | string;
  valid_to: Date | string | null;
}

export interface WorkScheduleSummary {
  workScheduleId: string;
  code: string;
  name: string;
  weeklyHours: number;
  toleranceMinutes: number;
  status: string;
  validFrom: string;
  validTo: string | null;
}

@Injectable()
export class WorkScheduleService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional()
    private readonly esocialEmitters?: SgpEsocialEmittersService,
  ) {}

  async list(): Promise<WorkScheduleSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<WorkScheduleRow>(
      `
      SELECT work_schedule_id::text, code, name, weekly_hours::text, tolerance_minutes,
             status::text, valid_from, valid_to
      FROM ponto.work_schedule
      ORDER BY code
      `,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async create(input: CreateWorkScheduleDto): Promise<WorkScheduleSummary> {
    this.ensureDatabase();
    const created = await this.databaseService.transaction(async (client) => {
      const schedule = await client.query<WorkScheduleRow>(
        `
        INSERT INTO ponto.work_schedule (
          code, name, weekly_hours, tolerance_minutes, valid_from, valid_to
        )
        VALUES ($1, $2, $3::numeric(5,2), $4, $5::date, $6::date)
        RETURNING work_schedule_id::text, code, name, weekly_hours::text,
                  tolerance_minutes, status::text, valid_from, valid_to
        `,
        [
          input.code.trim(),
          input.name.trim(),
          input.weeklyHours,
          input.toleranceMinutes,
          input.validFrom,
          input.validTo ?? null,
        ],
      );
      for (const shift of input.shifts) {
        const shiftResult = await client.query<{ work_shift_id: string }>(
          `
          INSERT INTO ponto.work_shift (work_schedule_id, code, kind)
          VALUES ($1::uuid, $2, $3::ponto.work_shift_kind)
          RETURNING work_shift_id::text
          `,
          [schedule.rows[0]!.work_schedule_id, shift.code.trim(), shift.kind],
        );
        await this.insertDaySchedules(
          client,
          shiftResult.rows[0]!.work_shift_id,
          shift.daySchedules,
        );
      }
      return this.toSummary(schedule.rows[0]!);
    });
    await this.esocialEmitters?.emitForCurrentTenant('s1050WorkSchedule', {
      sourceId: created.workScheduleId,
      operation: 'create',
      data: {
        code: created.code,
        name: created.name,
        weeklyHours: created.weeklyHours.toFixed(2),
        validFrom: created.validFrom,
        validTo: created.validTo,
      },
    });
    return created;
  }

  private async insertDaySchedules(
    client: PoolClient,
    workShiftId: string,
    daySchedules: CreateWorkScheduleDto['shifts'][number]['daySchedules'],
  ): Promise<void> {
    for (const day of daySchedules) {
      await client.query(
        `
        INSERT INTO ponto.day_schedule (
          work_shift_id, weekday, entry_time, lunch_out, lunch_in, exit_time, total_minutes
        )
        VALUES (
          $1::uuid, $2, NULLIF($3, '')::time, NULLIF($4, '')::time,
          NULLIF($5, '')::time, NULLIF($6, '')::time, $7
        )
        `,
        [
          workShiftId,
          day.weekday,
          day.entryTime ?? null,
          day.lunchOut ?? null,
          day.lunchIn ?? null,
          day.exitTime ?? null,
          day.totalMinutes,
        ],
      );
    }
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }

  private toSummary(row: WorkScheduleRow): WorkScheduleSummary {
    return {
      workScheduleId: row.work_schedule_id,
      code: row.code,
      name: row.name,
      weeklyHours: Number(row.weekly_hours),
      toleranceMinutes: row.tolerance_minutes,
      status: row.status,
      validFrom: formatDateOnlyUtc(row.valid_from),
      validTo: row.valid_to ? formatDateOnlyUtc(row.valid_to) : null,
    };
  }
}
