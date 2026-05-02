import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { formatInstantIso } from '../payroll-bridge/tenant-timezone.util';
import { PayrollJustificationTreatment } from './justification.types';

interface TreatmentRow extends QueryResultRow {
  employee_id: string;
  absence_justification_id: string;
  absence_start: Date | string;
  absence_end: Date | string;
  payroll_treatment: string;
}

@Injectable()
export class JustificationPayrollBridgeService {
  constructor(private readonly databaseService: DatabaseService) {}

  async treatmentsForInterval(
    employeeId: string,
    intervalStart: string,
    intervalEnd: string,
  ): Promise<PayrollJustificationTreatment[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<TreatmentRow>(
      `
      SELECT employee_id::text, absence_justification_id::text, absence_start, absence_end,
             payroll_treatment::text
      FROM ponto.absence_justification
      WHERE employee_id = $1::uuid
        AND status = 'APPROVED'::ponto.absence_justification_status
        AND absence_start <= $3::timestamptz
        AND absence_end >= $2::timestamptz
      ORDER BY absence_start
      `,
      [employeeId, intervalStart, intervalEnd],
    );
    return rows.map((row) => this.toTreatment(row, intervalStart, intervalEnd));
  }

  toTreatment(
    row: TreatmentRow,
    intervalStart: string,
    intervalEnd: string,
  ): PayrollJustificationTreatment {
    const start = new Date(
      Math.max(
        new Date(row.absence_start).getTime(),
        new Date(intervalStart).getTime(),
      ),
    );
    const end = new Date(
      Math.min(
        new Date(row.absence_end).getTime(),
        new Date(intervalEnd).getTime(),
      ),
    );
    const minutes = Math.max(
      0,
      Math.ceil((end.getTime() - start.getTime()) / 60_000),
    );
    const payrollTreatment =
      row.payroll_treatment as PayrollJustificationTreatment['payrollTreatment'];
    return {
      employeeId: row.employee_id,
      absenceJustificationId: row.absence_justification_id,
      intervalStart: formatInstantIso(start),
      intervalEnd: formatInstantIso(end),
      payrollTreatment,
      paidMinutes: payrollTreatment === 'PAID' ? minutes : 0,
      unpaidMinutes: payrollTreatment === 'UNPAID' ? minutes : 0,
      hourBankNeutralMinutes:
        payrollTreatment === 'HOUR_BANK_NEUTRAL' ? minutes : 0,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
