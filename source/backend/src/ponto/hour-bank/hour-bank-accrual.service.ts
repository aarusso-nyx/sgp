import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { AccrueHourBankDayDto } from '../ponto.dto';
import { HourBankMovement } from './hour-bank.types';

interface MovementRow extends QueryResultRow {
  hour_bank_movement_id: string;
  hour_bank_id: string;
  work_date: Date | string;
  kind: string;
  minutes: number;
  source_time_record_ids: string[];
  created_at: Date | string;
  payroll_run_id: string | null;
}

@Injectable()
export class HourBankAccrualService {
  constructor(private readonly databaseService: DatabaseService) {}

  dailyDelta(workedMinutes: number, expectedMinutes: number): number {
    return workedMinutes - expectedMinutes;
  }

  movementKind(deltaMinutes: number): 'ACCRUAL_POSITIVE' | 'ACCRUAL_NEGATIVE' {
    if (deltaMinutes === 0) {
      throw new BadRequestException('Hour-bank accrual delta must be non-zero');
    }
    return deltaMinutes > 0 ? 'ACCRUAL_POSITIVE' : 'ACCRUAL_NEGATIVE';
  }

  async accrueDay(
    input: AccrueHourBankDayDto,
  ): Promise<HourBankMovement | null> {
    this.ensureDatabase();
    const delta = this.dailyDelta(input.workedMinutes, input.expectedMinutes);
    if (delta === 0) return null;
    const kind = this.movementKind(delta);
    const rows = await this.databaseService.query<MovementRow>(
      `
      WITH active_bank AS (
        SELECT hour_bank_id
        FROM ponto.hour_bank
        WHERE employee_id = $1::uuid
          AND status = 'ACTIVE'::ponto.hour_bank_status
          AND $2::date BETWEEN opened_at AND expires_at
        ORDER BY expires_at, opened_at
        LIMIT 1
      )
      INSERT INTO ponto.hour_bank_movement (
        hour_bank_id, work_date, kind, minutes, source_time_record_ids
      )
      SELECT hour_bank_id, $2::date, $3::ponto.hour_bank_movement_kind, $4,
             $5::uuid[]
      FROM active_bank
      RETURNING hour_bank_movement_id::text, hour_bank_id::text, work_date, kind::text,
                minutes, source_time_record_ids::text[] AS source_time_record_ids,
                created_at, payroll_run_id::text
      `,
      [
        input.employeeId,
        input.workDate,
        kind,
        delta,
        input.sourceTimeRecordIds ?? [],
      ],
    );
    return rows[0] ? this.toMovement(rows[0]) : null;
  }

  private toMovement(row: MovementRow): HourBankMovement {
    return {
      hourBankMovementId: row.hour_bank_movement_id,
      hourBankId: row.hour_bank_id,
      workDate: new Date(row.work_date).toISOString().slice(0, 10),
      kind: row.kind as HourBankMovement['kind'],
      minutes: Number(row.minutes),
      sourceTimeRecordIds: row.source_time_record_ids ?? [],
      createdAt: new Date(row.created_at).toISOString(),
      payrollRunId: row.payroll_run_id,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
