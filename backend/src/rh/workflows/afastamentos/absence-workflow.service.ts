import { BadRequestException } from '@nestjs/common';

import { RhWorkflowMutationDto } from '../rh-workflows.dto';
import { WorkflowMutationContext } from '../workflow-mutation-context';
import { CountRow } from '../workflow-types';
import { daysBetweenInclusive } from '../workflow-utils';

export class AbsenceWorkflowService {
  constructor(private readonly context: WorkflowMutationContext) {}

  async insertStatusHistory(input: RhWorkflowMutationDto, employeeId?: string) {
    this.context.require(input.functionalStatusId, 'functionalStatusId');
    this.context.require(input.startsOn, 'startsOn');
    await this.context.databaseService.query(
      `INSERT INTO hr.employee_status_history (employee_id, functional_status_id, reason_id, starts_on, ends_on, notes) VALUES ($1::uuid, $2::uuid, NULLIF($3, '')::uuid, $4::date, NULLIF($5, '')::date, $6)`,
      [
        employeeId,
        input.functionalStatusId,
        input.reasonId ?? '',
        input.startsOn,
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async insertFrequency(input: RhWorkflowMutationDto, employeeId?: string) {
    this.context.require(input.year, 'year');
    const workedDays = await this.context.resolveWorkedDays(input);
    await this.context.databaseService.query(
      `INSERT INTO hr.employee_frequency (tenant_id, employee_id, year, month, absence_days, worked_days, notes) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, $2, $3, $4::decimal, NULLIF($5, '')::decimal, $6) ON CONFLICT (tenant_id, employee_id, year, month) DO UPDATE SET absence_days = EXCLUDED.absence_days, worked_days = EXCLUDED.worked_days, notes = EXCLUDED.notes, updated_at = now()`,
      [
        employeeId,
        input.year,
        input.month ?? null,
        input.absenceDays ?? '0',
        workedDays,
        input.notes?.trim() || '',
      ],
    );
  }

  async insertLeave(input: RhWorkflowMutationDto, employeeId?: string) {
    this.context.require(employeeId, 'employeeId');
    this.context.require(input.startsOn, 'startsOn');
    const startsOn = input.startsOn!;
    const endsOn = input.endsOn ?? startsOn;
    if (
      input.endsOn &&
      new Date(startsOn).getTime() > new Date(endsOn).getTime()
    ) {
      throw new BadRequestException('endsOn must be greater than startsOn');
    }
    const overlap = await this.context.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM hr.leave_record
      WHERE employee_id = $1::uuid
        AND status = 'ACTIVE'::"RecordStatus"
        AND daterange(starts_on, coalesce(ends_on, starts_on), '[]')
            && daterange($2::date, coalesce(NULLIF($3, '')::date, $2::date), '[]')
      `,
      [employeeId, startsOn, input.endsOn ?? ''],
    );
    if (Number(overlap[0]?.total ?? 0) > 0) {
      throw new BadRequestException(
        'Employee already has an active leave in the selected period',
      );
    }
    const leaveFunctionalStatus = await this.context.ensureFunctionalStatus(
      'AFASTAMENTO',
      'Afastamento',
      'AFASTAMENTO',
      'AFASTAMENTO',
      'ON_LEAVE',
    );
    const leaveDays = input.days ?? daysBetweenInclusive(startsOn, endsOn);
    await this.context.databaseService.query(
      `INSERT INTO hr.leave_record (employee_id, absence_reason_id, starts_on, ends_on, days, status, notes) VALUES ($1::uuid, NULLIF($2, '')::uuid, $3::date, NULLIF($4, '')::date, $5, 'ACTIVE'::"RecordStatus", $6)`,
      [
        employeeId,
        input.absenceReasonId ?? '',
        startsOn,
        input.endsOn ?? '',
        leaveDays,
        input.notes?.trim() || '',
      ],
    );
    await this.context.databaseService.query(
      `
      UPDATE hr.employee
      SET
        lifecycle_status = 'ON_LEAVE'::"EmployeeLifecycleStatus",
        functional_status_id = $2::uuid,
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [employeeId, leaveFunctionalStatus],
    );
    await this.context.databaseService.query(
      `
      INSERT INTO hr.employee_status_history (
        tenant_id,
        employee_id,
        functional_status_id,
        reason_id,
        starts_on,
        ends_on,
        notes
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        NULLIF($3, '')::uuid,
        $4::date,
        NULLIF($5, '')::date,
        $6
      )
      `,
      [
        employeeId,
        leaveFunctionalStatus,
        input.absenceReasonId ?? '',
        startsOn,
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async updateStatusHistory(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.employee_status_history SET functional_status_id = COALESCE(NULLIF($2, '')::uuid, functional_status_id), reason_id = NULLIF($3, '')::uuid, starts_on = COALESCE(NULLIF($4, '')::date, starts_on), ends_on = NULLIF($5, '')::date, notes = $6 WHERE id = $1::uuid`,
      [
        id,
        input.functionalStatusId ?? '',
        input.reasonId ?? '',
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async updateFrequency(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.employee_frequency SET year = COALESCE($2, year), month = $3, absence_days = $4::decimal, worked_days = NULLIF($5, '')::decimal, notes = $6, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.year ?? null,
        input.month ?? null,
        input.absenceDays ?? '0',
        input.workedDays ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async updateLeave(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.leave_record SET absence_reason_id = NULLIF($2, '')::uuid, starts_on = COALESCE(NULLIF($3, '')::date, starts_on), ends_on = NULLIF($4, '')::date, days = $5, notes = $6, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.absenceReasonId ?? '',
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.days ?? null,
        input.notes?.trim() || '',
      ],
    );
  }
}
