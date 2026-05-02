import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { CreateHourBankDto, ManualHourBankAdjustmentDto } from '../ponto.dto';
import {
  formatDateOnlyUtc,
  formatInstantIso,
} from '../payroll-bridge/tenant-timezone.util';
import { HourBankMovement, HourBankSummary } from './hour-bank.types';

interface HourBankRow extends QueryResultRow {
  hour_bank_id: string;
  employee_id: string;
  regime: string;
  opened_at: Date | string;
  expires_at: Date | string;
  balance_minutes: number;
  status: string;
}

interface HourBankMovementRow extends QueryResultRow {
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
export class HourBankService {
  constructor(private readonly databaseService: DatabaseService) {}

  async list(): Promise<HourBankSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<HourBankRow>(
      `
      SELECT hour_bank_id::text, employee_id::text, regime::text, opened_at, expires_at,
             balance_minutes, status::text
      FROM ponto.hour_bank
      ORDER BY status, expires_at, employee_id
      `,
    );
    return rows.map((row) => this.toSummary(row));
  }

  async create(input: CreateHourBankDto): Promise<HourBankSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<HourBankRow>(
      `
      INSERT INTO ponto.hour_bank (employee_id, regime, opened_at, expires_at)
      VALUES ($1::uuid, $2::ponto.hour_bank_regime, $3::date, $4::date)
      RETURNING hour_bank_id::text, employee_id::text, regime::text, opened_at, expires_at,
                balance_minutes, status::text
      `,
      [input.employeeId, input.regime, input.openedAt, input.expiresAt],
    );
    return this.toSummary(rows[0]);
  }

  async movements(hourBankId: string): Promise<HourBankMovement[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<HourBankMovementRow>(
      `
      SELECT hour_bank_movement_id::text, hour_bank_id::text, work_date, kind::text, minutes,
             source_time_record_ids::text[] AS source_time_record_ids, created_at,
             payroll_run_id::text
      FROM ponto.hour_bank_movement
      WHERE hour_bank_id = $1::uuid
      ORDER BY work_date DESC, created_at DESC
      `,
      [hourBankId],
    );
    return rows.map((row) => this.toMovement(row));
  }

  async manualAdjustment(
    input: ManualHourBankAdjustmentDto,
  ): Promise<HourBankMovement> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<HourBankMovementRow>(
      `
      INSERT INTO ponto.hour_bank_movement (hour_bank_id, work_date, kind, minutes)
      VALUES ($1::uuid, $2::date, 'MANUAL_ADJUSTMENT'::ponto.hour_bank_movement_kind, $3)
      RETURNING hour_bank_movement_id::text, hour_bank_id::text, work_date, kind::text, minutes,
                source_time_record_ids::text[] AS source_time_record_ids, created_at,
                payroll_run_id::text
      `,
      [input.hourBankId, input.workDate, input.minutes],
    );
    return this.toMovement(rows[0]);
  }

  toSummary(row: HourBankRow): HourBankSummary {
    return {
      hourBankId: row.hour_bank_id,
      employeeId: row.employee_id,
      regime: row.regime as HourBankSummary['regime'],
      openedAt: formatDateOnlyUtc(row.opened_at),
      expiresAt: formatDateOnlyUtc(row.expires_at),
      balanceMinutes: Number(row.balance_minutes),
      status: row.status,
    };
  }

  toMovement(row: HourBankMovementRow): HourBankMovement {
    return {
      hourBankMovementId: row.hour_bank_movement_id,
      hourBankId: row.hour_bank_id,
      workDate: formatDateOnlyUtc(row.work_date),
      kind: row.kind as HourBankMovement['kind'],
      minutes: Number(row.minutes),
      sourceTimeRecordIds: row.source_time_record_ids ?? [],
      createdAt: formatInstantIso(row.created_at),
      payrollRunId: row.payroll_run_id,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
