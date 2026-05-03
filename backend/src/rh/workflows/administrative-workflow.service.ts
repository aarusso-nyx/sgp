import { BadRequestException } from '@nestjs/common';

import { RhWorkflowMutationDto } from './rh-workflows.dto';
import { WorkflowMutationContext } from './workflow-mutation-context';
import { stringMeta } from './workflow-utils';

export class AdministrativeWorkflowService {
  constructor(private readonly context: WorkflowMutationContext) {}

  async insertVacation(input: RhWorkflowMutationDto, employeeId?: string) {
    this.context.require(input.startsOn, 'startsOn');
    this.context.require(input.endsOn, 'endsOn');
    await this.context.databaseService.query(
      `INSERT INTO hr.vacation_record (tenant_id, employee_id, vacation_type_id, accrual_start_on, accrual_end_on, accrual_period_start, accrual_period_end, starts_on, ends_on, days, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, NULLIF($2, '')::uuid, NULLIF($3, '')::date, NULLIF($4, '')::date, NULLIF($3, '')::date, NULLIF($4, '')::date, $5::date, $6::date, $7, 'programado')`,
      [
        employeeId,
        input.vacationTypeId ?? '',
        stringMeta(input, 'accrualStartOn'),
        stringMeta(input, 'accrualEndOn'),
        input.startsOn,
        input.endsOn,
        input.days ?? 1,
      ],
    );
  }

  async insertExercise(input: RhWorkflowMutationDto, employeeId?: string) {
    this.context.require(input.startsOn, 'startsOn');
    await this.context.databaseService.query(
      `INSERT INTO hr.employee_exercise (tenant_id, employee_id, branch_id, work_location_id, job_function_id, starts_on, ends_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, NULLIF($2, '')::uuid, NULLIF($3, '')::uuid, NULLIF($4, '')::uuid, $5::date, NULLIF($6, '')::date, $7, 'ACTIVE'::"RecordStatus")`,
      [
        employeeId,
        input.toBranchId ?? '',
        input.toWorkLocationId ?? '',
        input.jobFunctionId ?? '',
        input.startsOn,
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
    await this.context.syncEmployeeExercise(
      employeeId,
      input.toBranchId ?? null,
      input.toWorkLocationId ?? null,
      input.jobFunctionId ?? null,
    );
  }

  async insertProcess(input: RhWorkflowMutationDto) {
    this.context.require(input.processNumber, 'processNumber');
    this.context.require(input.subject, 'subject');
    this.context.require(input.startsOn, 'startsOn');
    await this.context.databaseService.query(
      `INSERT INTO hr.administrative_process (tenant_id, process_number, subject, filed_on, closed_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3::date, NULLIF($4, '')::date, $5, 'ACTIVE'::"RecordStatus")`,
      [
        input.processNumber?.trim(),
        input.subject?.trim(),
        input.startsOn,
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async insertProcessFunction(input: RhWorkflowMutationDto) {
    this.context.require(input.processId, 'processId');
    this.context.require(input.jobFunctionId, 'jobFunctionId');
    this.context.require(input.startsOn, 'startsOn');
    await this.context.databaseService.query(
      `INSERT INTO hr.administrative_process_function (tenant_id, process_id, job_function_id, branch_id, work_location_id, assigned_on, released_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, $2::uuid, NULLIF($3, '')::uuid, NULLIF($4, '')::uuid, $5::date, NULLIF($6, '')::date, $7, 'ACTIVE'::"RecordStatus")`,
      [
        input.processId,
        input.jobFunctionId,
        input.toBranchId ?? '',
        input.toWorkLocationId ?? '',
        input.startsOn,
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async insertOrganicDefinition(input: RhWorkflowMutationDto) {
    this.validateOrganicDefinition(input, true);
    await this.context.databaseService.query(
      `INSERT INTO hr.organic_definition (tenant_id, code, name, description, work_location_id, job_position_id, vacancies_total, vacancies_filled, vacancies_open, effective_from, effective_to, status) VALUES (public.sgp_current_tenant_uuid(), $1, $2, $3, $4::uuid, $5::uuid, $6, $7, $8, COALESCE(NULLIF($9, '')::date, CURRENT_DATE), NULLIF($10, '')::date, 'ACTIVE'::"RecordStatus")`,
      [
        stringMeta(input, 'code') ?? input.name?.trim(),
        input.name?.trim(),
        input.notes?.trim() || '',
        input.workLocationId,
        input.jobPositionId,
        input.vacanciesTotal,
        input.vacanciesFilled ?? 0,
        Number(input.vacanciesTotal) - (input.vacanciesFilled ?? 0),
        input.startsOn ?? '',
        input.endsOn ?? '',
      ],
    );
  }

  async updateVacation(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.vacation_record SET vacation_type_id = NULLIF($2, '')::uuid, starts_on = COALESCE(NULLIF($3, '')::date, starts_on), ends_on = COALESCE(NULLIF($4, '')::date, ends_on), days = COALESCE($5, days), updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.vacationTypeId ?? '',
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.days ?? null,
      ],
    );
  }

  async updateExercise(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.employee_exercise SET branch_id = NULLIF($2, '')::uuid, work_location_id = NULLIF($3, '')::uuid, job_function_id = NULLIF($4, '')::uuid, starts_on = COALESCE(NULLIF($5, '')::date, starts_on), ends_on = NULLIF($6, '')::date, notes = $7, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.toBranchId ?? '',
        input.toWorkLocationId ?? '',
        input.jobFunctionId ?? '',
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
    if (
      input.toBranchId !== undefined ||
      input.toWorkLocationId !== undefined ||
      input.jobFunctionId !== undefined
    ) {
      const employeeId = await this.context.findEmployeeIdByRecord(
        'employee_exercise',
        id,
      );
      await this.context.syncEmployeeExercise(
        employeeId,
        input.toBranchId ?? null,
        input.toWorkLocationId ?? null,
        input.jobFunctionId ?? null,
      );
    }
  }

  async updateProcess(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.administrative_process SET process_number = COALESCE($2, process_number), subject = COALESCE($3, subject), filed_on = COALESCE(NULLIF($4, '')::date, filed_on), closed_on = NULLIF($5, '')::date, notes = $6, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.processNumber?.trim() || null,
        input.subject?.trim() || null,
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async updateProcessFunction(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.administrative_process_function SET process_id = COALESCE(NULLIF($2, '')::uuid, process_id), job_function_id = COALESCE(NULLIF($3, '')::uuid, job_function_id), branch_id = NULLIF($4, '')::uuid, work_location_id = NULLIF($5, '')::uuid, assigned_on = COALESCE(NULLIF($6, '')::date, assigned_on), released_on = NULLIF($7, '')::date, notes = $8, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.processId ?? '',
        input.jobFunctionId ?? '',
        input.toBranchId ?? '',
        input.toWorkLocationId ?? '',
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async updateOrganicDefinition(id: string, input: RhWorkflowMutationDto) {
    this.validateOrganicDefinition(input, false);
    await this.context.databaseService.query(
      `UPDATE hr.organic_definition SET name = COALESCE($2, name), description = $3, work_location_id = $4::uuid, job_position_id = $5::uuid, vacancies_total = $6, vacancies_filled = $7, vacancies_open = $8, effective_from = COALESCE(NULLIF($9, '')::date, effective_from), effective_to = NULLIF($10, '')::date, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.name?.trim() || null,
        input.notes?.trim() || '',
        input.workLocationId,
        input.jobPositionId,
        input.vacanciesTotal,
        input.vacanciesFilled ?? 0,
        Number(input.vacanciesTotal) - (input.vacanciesFilled ?? 0),
        input.startsOn ?? '',
        input.endsOn ?? '',
      ],
    );
  }

  private validateOrganicDefinition(
    input: RhWorkflowMutationDto,
    requireName: boolean,
  ): void {
    if (requireName) this.context.require(input.name, 'name');
    this.context.require(input.workLocationId, 'workLocationId');
    this.context.require(input.jobPositionId, 'jobPositionId');
    this.context.require(input.vacanciesTotal, 'vacanciesTotal');
    if ((input.vacanciesFilled ?? 0) > Number(input.vacanciesTotal)) {
      throw new BadRequestException(
        'vacanciesFilled cannot exceed vacanciesTotal',
      );
    }
  }
}
