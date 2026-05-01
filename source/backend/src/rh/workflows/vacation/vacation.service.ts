import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../../database/database.service';
import { ScheduleVacationDto, VacationInstallmentDto } from './vacation.dto';

interface VacationBalanceRow extends QueryResultRow {
  employee_id: string;
  accrual_period_start: Date | string;
  accrual_period_end: Date | string;
  accrued_days: number;
  used_days: number;
  pecuniary_bonus_days: number;
  available_days: number;
}

interface EmployeeVacationContextRow extends QueryResultRow {
  employee_id: string;
  tenant_id: string;
  contract_type: string;
}

interface VacationRecordRow extends QueryResultRow {
  id: string;
  employee_id: string;
  accrual_period_start: Date | string;
  accrual_period_end: Date | string;
  installment_number: number;
  pecuniary_bonus_days: number;
  starts_on: Date | string;
  ends_on: Date | string;
  days: number;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface VacationBalance {
  employeeId: string;
  accrualPeriodStart: string;
  accrualPeriodEnd: string;
  accruedDays: number;
  usedDays: number;
  pecuniaryBonusDays: number;
  availableDays: number;
}

export interface VacationRecord {
  id: string;
  employeeId: string;
  accrualPeriodStart: string;
  accrualPeriodEnd: string;
  installmentNumber: number;
  pecuniaryBonusDays: number;
  startsOn: string;
  endsOn: string;
  days: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class VacationService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getBalance(
    employeeId: string,
    referenceDate = new Date(),
  ): Promise<VacationBalance[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<VacationBalanceRow>(
      `
      SELECT *
      FROM hr.f_calculate_vacation_balance($1::uuid, $2::date)
      ORDER BY accrual_period_start DESC
      `,
      [employeeId, referenceDate.toISOString().slice(0, 10)],
    );
    return rows.map((row) => this.toBalance(row));
  }

  async schedule(body: ScheduleVacationDto): Promise<VacationRecord[]> {
    this.ensureDatabase();
    const employeeId = body.employeeId ?? body.employee_id;
    if (!employeeId) {
      throw new BadRequestException('employeeId is required');
    }
    this.validateInstallments(body.installments, body.pecuniaryBonusDays ?? 0);

    return this.databaseService.transaction(async (client) => {
      const employee = await this.loadEmployeeContext(client, employeeId);
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }
      if (employee.contract_type === 'celetista') {
        this.validateCeletistaInstallments(body.installments);
      }

      const rows: VacationRecordRow[] = [];
      for (const [index, installment] of body.installments.entries()) {
        const days = installment.days ?? this.inclusiveDays(installment);
        const result = await client.query<VacationRecordRow>(
          `
          INSERT INTO hr.vacation_record (
            tenant_id,
            employee_id,
            vacation_type_id,
            accrual_start_on,
            accrual_end_on,
            accrual_period_start,
            accrual_period_end,
            installment_number,
            pecuniary_bonus_days,
            starts_on,
            ends_on,
            days,
            status
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            NULLIF($3, '')::uuid,
            $4::date,
            $5::date,
            $4::date,
            $5::date,
            $6,
            $7,
            $8::date,
            $9::date,
            $10,
            'programado'
          )
          RETURNING
            id::text,
            employee_id::text,
            accrual_period_start,
            accrual_period_end,
            installment_number,
            pecuniary_bonus_days,
            starts_on,
            ends_on,
            days,
            status,
            created_at,
            updated_at
          `,
          [
            employee.tenant_id,
            employee.employee_id,
            body.vacationTypeId ?? '',
            body.accrualPeriodStart,
            body.accrualPeriodEnd,
            index + 1,
            index === 0 ? (body.pecuniaryBonusDays ?? 0) : 0,
            installment.startsOn,
            installment.endsOn,
            days,
          ],
        );
        rows.push(result.rows[0]);
      }
      return rows.map((row) => this.toRecord(row));
    });
  }

  async approve(id: string): Promise<VacationRecord> {
    return this.transition(id, 'aprovado');
  }

  async cancel(id: string): Promise<VacationRecord> {
    return this.transition(id, 'cancelado');
  }

  private async transition(
    id: string,
    status: 'aprovado' | 'cancelado',
  ): Promise<VacationRecord> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<VacationRecordRow>(
      `
      UPDATE hr.vacation_record
      SET status = $2, updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id::text,
        employee_id::text,
        accrual_period_start,
        accrual_period_end,
        installment_number,
        pecuniary_bonus_days,
        starts_on,
        ends_on,
        days,
        status,
        created_at,
        updated_at
      `,
      [id, status],
    );
    if (!rows[0]) {
      throw new NotFoundException('Vacation schedule not found');
    }
    return this.toRecord(rows[0]);
  }

  private async loadEmployeeContext(
    client: PoolClient,
    employeeId: string,
  ): Promise<EmployeeVacationContextRow | null> {
    const result = await client.query<EmployeeVacationContextRow>(
      `
      SELECT
        employee.id::text AS employee_id,
        employee.tenant_id::text AS tenant_id,
        link.contract_type
      FROM hr.employee employee
      JOIN hr.employment_link link ON link.id = employee.employment_link_id
      WHERE employee.id = $1::uuid
      LIMIT 1
      `,
      [employeeId],
    );
    return result.rows[0] ?? null;
  }

  private validateInstallments(
    installments: VacationInstallmentDto[] | undefined,
    pecuniaryBonusDays: number,
  ): void {
    if (!installments?.length) {
      throw new BadRequestException(
        'At least one vacation installment is required',
      );
    }
    if (installments.length > 3) {
      throw new BadRequestException(
        'Vacation scheduling allows at most 3 installments',
      );
    }
    if (pecuniaryBonusDays > 10) {
      throw new BadRequestException('Pecuniary bonus is limited to 10 days');
    }
    for (const installment of installments) {
      const days = installment.days ?? this.inclusiveDays(installment);
      if (days <= 0) {
        throw new BadRequestException(
          'Vacation installments must have positive days',
        );
      }
      if (
        new Date(`${installment.endsOn}T00:00:00Z`) <
        new Date(`${installment.startsOn}T00:00:00Z`)
      ) {
        throw new BadRequestException(
          'Vacation installment end date must be on or after start date',
        );
      }
    }
  }

  private validateCeletistaInstallments(
    installments: VacationInstallmentDto[],
  ): void {
    if (
      !installments.some(
        (installment) =>
          (installment.days ?? this.inclusiveDays(installment)) >= 14,
      )
    ) {
      throw new BadRequestException(
        'Celetista vacation scheduling requires one installment with at least 14 continuous days',
      );
    }
  }

  private inclusiveDays(installment: VacationInstallmentDto): number {
    const start = new Date(`${installment.startsOn}T00:00:00Z`);
    const end = new Date(`${installment.endsOn}T00:00:00Z`);
    return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  }

  private toBalance(row: VacationBalanceRow): VacationBalance {
    return {
      employeeId: row.employee_id,
      accrualPeriodStart: this.toDate(row.accrual_period_start),
      accrualPeriodEnd: this.toDate(row.accrual_period_end),
      accruedDays: Number(row.accrued_days),
      usedDays: Number(row.used_days),
      pecuniaryBonusDays: Number(row.pecuniary_bonus_days),
      availableDays: Number(row.available_days),
    };
  }

  private toRecord(row: VacationRecordRow): VacationRecord {
    return {
      id: row.id,
      employeeId: row.employee_id,
      accrualPeriodStart: this.toDate(row.accrual_period_start),
      accrualPeriodEnd: this.toDate(row.accrual_period_end),
      installmentNumber: Number(row.installment_number),
      pecuniaryBonusDays: Number(row.pecuniary_bonus_days),
      startsOn: this.toDate(row.starts_on),
      endsOn: this.toDate(row.ends_on),
      days: Number(row.days),
      status: row.status,
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toDate(value: Date | string): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private toIso(value: Date | string): string {
    if (value instanceof Date) return value.toISOString();
    return new Date(value).toISOString();
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for vacation workflows',
      );
    }
  }
}
