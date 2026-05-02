import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { CompensateHourBankDto } from '../ponto.dto';
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
export class HourBankCompensationService {
  constructor(private readonly databaseService: DatabaseService) {}

  async compensate(input: CompensateHourBankDto): Promise<HourBankMovement> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<MovementRow>(
      `
      WITH bank AS (
        SELECT hour_bank_id, balance_minutes
        FROM ponto.hour_bank
        WHERE hour_bank_id = $1::uuid
          AND status = 'ACTIVE'::ponto.hour_bank_status
          AND balance_minutes >= $3
      )
      INSERT INTO ponto.hour_bank_movement (hour_bank_id, work_date, kind, minutes)
      SELECT hour_bank_id, $2::date, 'COMPENSATION'::ponto.hour_bank_movement_kind, $3 * -1
      FROM bank
      RETURNING hour_bank_movement_id::text, hour_bank_id::text, work_date, kind::text,
                minutes, source_time_record_ids::text[] AS source_time_record_ids,
                created_at, payroll_run_id::text
      `,
      [input.hourBankId, input.workDate, input.minutes],
    );
    if (!rows[0]) {
      throw new BadRequestException(
        'Hour-bank compensation requires active positive balance',
      );
    }
    return this.toMovement(rows[0]);
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
