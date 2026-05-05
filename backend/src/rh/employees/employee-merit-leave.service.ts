import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';

const MERIT_LEAVE_THRESHOLD_DAYS = 1_825;
const MERIT_LEAVE_DAYS_PER_CYCLE = 90;

interface MeritLeaveBalanceRow extends QueryResultRow {
  employee_id: string;
  tenant_id: string;
  credited_service_days: number | string;
  consumed_days: number | string;
}

export interface EmployeeMeritLeaveBalance {
  employeeId: string;
  tenantId: string;
  asOf: string;
  thresholdDays: number;
  entitlementDaysPerCycle: number;
  creditedServiceDays: number;
  completedCycles: number;
  accruedDays: number;
  consumedDays: number;
  availableDays: number;
  eligible: boolean;
  nextEligibilityDaysRemaining: number;
}

@Injectable()
export class EmployeeMeritLeaveService {
  constructor(private readonly databaseService: DatabaseService) {}

  async balance(
    employeeId: string,
    asOf = new Date().toISOString().slice(0, 10),
  ): Promise<EmployeeMeritLeaveBalance> {
    this.ensureDatabase();
    const normalizedAsOf = this.normalizeDate(asOf, 'asOf');
    const rows = await this.databaseService.query<MeritLeaveBalanceRow>(
      `
      WITH employee AS (
        SELECT id, tenant_id
        FROM hr.employee
        WHERE id = $1::uuid
          AND tenant_id = public.sgp_current_tenant_uuid()
          AND lifecycle_status <> 'TERMINATED'::"EmployeeLifecycleStatus"
      ),
      service_time AS (
        SELECT
          employee.id AS employee_id,
          COALESCE(
            SUM(
              COALESCE(
                record.days_count,
                (COALESCE(record.ends_on, $2::date) - record.starts_on + 1)
              )
            ),
            0
          )::integer AS credited_service_days
        FROM employee
        LEFT JOIN hr.service_time_record record
          ON record.employee_id = employee.id
         AND record.tenant_id = employee.tenant_id
         AND record.starts_on <= $2::date
        GROUP BY employee.id
      ),
      consumed AS (
        SELECT
          employee.id AS employee_id,
          COALESCE(
            SUM(leave_record.days) FILTER (WHERE reason.code = 'premio'),
            0
          )::integer AS consumed_days
        FROM employee
        LEFT JOIN hr.leave_record leave_record
          ON leave_record.employee_id = employee.id
         AND leave_record.tenant_id = employee.tenant_id
         AND leave_record.status = 'ACTIVE'::"RecordStatus"
        LEFT JOIN hr.absence_reason reason
          ON reason.id = leave_record.absence_reason_id
         AND reason.tenant_id = leave_record.tenant_id
        GROUP BY employee.id
      )
      SELECT
        employee.id::text AS employee_id,
        employee.tenant_id::text AS tenant_id,
        service_time.credited_service_days,
        consumed.consumed_days
      FROM employee
      JOIN service_time ON service_time.employee_id = employee.id
      JOIN consumed ON consumed.employee_id = employee.id
      `,
      [employeeId, normalizedAsOf],
    );

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Employee not found for merit leave');
    }
    return this.toBalance(row, normalizedAsOf);
  }

  private toBalance(
    row: MeritLeaveBalanceRow,
    asOf: string,
  ): EmployeeMeritLeaveBalance {
    const creditedServiceDays = Number(row.credited_service_days);
    const consumedDays = Number(row.consumed_days);
    const completedCycles = Math.floor(
      creditedServiceDays / MERIT_LEAVE_THRESHOLD_DAYS,
    );
    const accruedDays = completedCycles * MERIT_LEAVE_DAYS_PER_CYCLE;
    const availableDays = Math.max(0, accruedDays - consumedDays);
    const daysIntoCurrentCycle =
      creditedServiceDays % MERIT_LEAVE_THRESHOLD_DAYS;

    return {
      employeeId: row.employee_id,
      tenantId: row.tenant_id,
      asOf,
      thresholdDays: MERIT_LEAVE_THRESHOLD_DAYS,
      entitlementDaysPerCycle: MERIT_LEAVE_DAYS_PER_CYCLE,
      creditedServiceDays,
      completedCycles,
      accruedDays,
      consumedDays,
      availableDays,
      eligible: availableDays > 0,
      nextEligibilityDaysRemaining:
        availableDays > 0
          ? 0
          : MERIT_LEAVE_THRESHOLD_DAYS - daysIntoCurrentCycle,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for merit leave balance',
      );
    }
  }

  private normalizeDate(value: string, field: string): string {
    const normalized = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(normalized)) {
      throw new BadRequestException(`${field} must be YYYY-MM-DD`);
    }
    const parsed = new Date(`${normalized}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    return normalized;
  }
}
