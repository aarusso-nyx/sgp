import { RhWorkflowMutationDto } from './rh-workflows.dto';
import { WorkflowMutationContext } from './workflow-mutation-context';

export class EmploymentWorkflowService {
  constructor(private readonly context: WorkflowMutationContext) {}

  async insertProfessionalExperience(
    input: RhWorkflowMutationDto,
    employeeId?: string,
  ) {
    this.context.require(input.employer, 'employer');
    await this.context.databaseService.query(
      `INSERT INTO hr.professional_experience (employee_id, employer, role_title, starts_on, ends_on, description) VALUES ($1::uuid, $2, $3, NULLIF($4, '')::date, NULLIF($5, '')::date, $6)`,
      [
        employeeId,
        input.employer?.trim(),
        input.roleTitle?.trim() || null,
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async insertServiceTime(input: RhWorkflowMutationDto, employeeId?: string) {
    this.context.require(input.source, 'source');
    this.context.require(input.startsOn, 'startsOn');
    await this.context.databaseService.query(
      `INSERT INTO hr.service_time_record (employee_id, source, starts_on, ends_on, days_count, notes) VALUES ($1::uuid, $2, $3::date, NULLIF($4, '')::date, $5, $6)`,
      [
        employeeId,
        input.source?.trim(),
        input.startsOn,
        input.endsOn ?? '',
        input.daysCount ?? null,
        input.notes?.trim() || '',
      ],
    );
  }

  async insertTransfer(input: RhWorkflowMutationDto, employeeId?: string) {
    this.context.require(input.effectiveOn, 'effectiveOn');
    await this.context.databaseService.query(
      `INSERT INTO hr.employee_transfer (employee_id, from_branch_id, to_branch_id, to_work_location_id, reason_id, effective_on, notes) VALUES ($1::uuid, NULLIF($2, '')::uuid, NULLIF($3, '')::uuid, NULLIF($4, '')::uuid, NULLIF($5, '')::uuid, $6::date, $7)`,
      [
        employeeId,
        input.fromBranchId ?? '',
        input.toBranchId ?? '',
        input.toWorkLocationId ?? '',
        input.reasonId ?? '',
        input.effectiveOn,
        input.notes?.trim() || '',
      ],
    );
  }

  async insertSalaryHistory(input: RhWorkflowMutationDto, employeeId?: string) {
    this.context.require(input.effectiveOn, 'effectiveOn');
    await this.context.databaseService.query(
      `INSERT INTO hr.salary_level_history (employee_id, salary_reference_id, level_code, level_description, adjustment_amount, effective_on) VALUES ($1::uuid, NULLIF($2, '')::uuid, $3, $4, $5::decimal, $6::date)`,
      [
        employeeId,
        input.salaryReferenceId ?? '',
        input.levelCode?.trim() || null,
        input.levelDescription?.trim() || null,
        input.adjustmentAmount ?? '0',
        input.effectiveOn,
      ],
    );
  }

  async updateProfessionalExperience(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.professional_experience SET employer = COALESCE($2, employer), role_title = $3, starts_on = NULLIF($4, '')::date, ends_on = NULLIF($5, '')::date, description = $6, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.employer?.trim() || null,
        input.roleTitle?.trim() || null,
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async updateServiceTime(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.service_time_record SET source = COALESCE($2, source), starts_on = COALESCE(NULLIF($3, '')::date, starts_on), ends_on = NULLIF($4, '')::date, days_count = $5, notes = $6, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.source?.trim() || null,
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.daysCount ?? null,
        input.notes?.trim() || '',
      ],
    );
  }

  async updateTransfer(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.employee_transfer SET from_branch_id = NULLIF($2, '')::uuid, to_branch_id = NULLIF($3, '')::uuid, to_work_location_id = NULLIF($4, '')::uuid, reason_id = NULLIF($5, '')::uuid, effective_on = COALESCE(NULLIF($6, '')::date, effective_on), notes = $7 WHERE id = $1::uuid`,
      [
        id,
        input.fromBranchId ?? '',
        input.toBranchId ?? '',
        input.toWorkLocationId ?? '',
        input.reasonId ?? '',
        input.effectiveOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async updateSalaryHistory(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.salary_level_history SET salary_reference_id = NULLIF($2, '')::uuid, level_code = $3, level_description = $4, adjustment_amount = $5::decimal, effective_on = COALESCE(NULLIF($6, '')::date, effective_on) WHERE id = $1::uuid`,
      [
        id,
        input.salaryReferenceId ?? '',
        input.levelCode?.trim() || null,
        input.levelDescription?.trim() || null,
        input.adjustmentAmount ?? '0',
        input.effectiveOn ?? '',
      ],
    );
  }
}
