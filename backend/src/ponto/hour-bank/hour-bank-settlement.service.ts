import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { SettleHourBankDto } from '../ponto.dto';

interface SettlementRow extends QueryResultRow {
  settled_count: string | number;
  overtime_minutes: string | number;
  deduction_minutes: string | number;
}

export interface HourBankSettlementResult {
  settledCount: number;
  overtimeMinutes: number;
  deductionMinutes: number;
}

@Injectable()
export class HourBankSettlementService {
  constructor(private readonly databaseService: DatabaseService) {}

  async settleExpired(
    input: SettleHourBankDto,
  ): Promise<HourBankSettlementResult> {
    this.ensureDatabase();
    if (input.overtimeEarningDeductionId) {
      await this.databaseService.query(
        `
        SELECT payroll_calc.evaluate_earning_deduction(
          $1::uuid,
          bank.employee_id,
          COALESCE($2::integer, EXTRACT(MONTH FROM CURRENT_DATE)::integer),
          COALESCE($3::integer, EXTRACT(YEAR FROM CURRENT_DATE)::integer)
        )
        FROM ponto.hour_bank bank
        WHERE bank.status = 'ACTIVE'::ponto.hour_bank_status
          AND bank.expires_at <= CURRENT_DATE
          AND bank.balance_minutes > 0
        `,
        [
          input.overtimeEarningDeductionId,
          input.competenceMonth ?? null,
          input.competenceYear ?? null,
        ],
      );
    }

    const rows = await this.databaseService.query<SettlementRow>(
      `
      WITH expired AS (
        SELECT hour_bank_id, balance_minutes
        FROM ponto.hour_bank
        WHERE status = 'ACTIVE'::ponto.hour_bank_status
          AND expires_at <= CURRENT_DATE
          AND balance_minutes <> 0
      ),
      inserted AS (
        INSERT INTO ponto.hour_bank_movement (
          hour_bank_id, work_date, kind, minutes, payroll_run_id
        )
        SELECT hour_bank_id,
               CURRENT_DATE,
               CASE
                 WHEN balance_minutes > 0 THEN 'SETTLEMENT_OVERTIME'::ponto.hour_bank_movement_kind
                 ELSE 'SETTLEMENT_DEDUCTION'::ponto.hour_bank_movement_kind
               END,
               balance_minutes * -1,
               $1::uuid
        FROM expired
        ON CONFLICT DO NOTHING
        RETURNING hour_bank_id, kind, minutes
      ),
      closed AS (
        UPDATE ponto.hour_bank bank
        SET status = CASE
              WHEN inserted.hour_bank_id IS NULL THEN 'EXPIRED'::ponto.hour_bank_status
              ELSE 'SETTLED'::ponto.hour_bank_status
            END,
            updated_at = now()
        FROM expired
        LEFT JOIN inserted ON inserted.hour_bank_id = expired.hour_bank_id
        WHERE bank.hour_bank_id = expired.hour_bank_id
        RETURNING bank.hour_bank_id
      )
      SELECT count(DISTINCT closed.hour_bank_id) AS settled_count,
             COALESCE(sum(CASE WHEN inserted.kind = 'SETTLEMENT_OVERTIME' THEN abs(inserted.minutes) ELSE 0 END), 0) AS overtime_minutes,
             COALESCE(sum(CASE WHEN inserted.kind = 'SETTLEMENT_DEDUCTION' THEN abs(inserted.minutes) ELSE 0 END), 0) AS deduction_minutes
      FROM closed
      LEFT JOIN inserted ON inserted.hour_bank_id = closed.hour_bank_id
      `,
      [input.payrollRunId],
    );

    return {
      settledCount: Number(rows[0]?.settled_count ?? 0),
      overtimeMinutes: Number(rows[0]?.overtime_minutes ?? 0),
      deductionMinutes: Number(rows[0]?.deduction_minutes ?? 0),
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
