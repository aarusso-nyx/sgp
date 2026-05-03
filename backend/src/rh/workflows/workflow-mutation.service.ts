import { BadRequestException, NotFoundException } from '@nestjs/common';

import { BusinessDaysService } from '../../consultas/business-days.service';
import { DatabaseService } from '../../database/database.service';
import { AbsenceWorkflowService } from './afastamentos/absence-workflow.service';
import { AdministrativeWorkflowService } from './administrative-workflow.service';
import { DependentsWorkflowService } from './dependentes/dependents-workflow.service';
import { EmploymentWorkflowService } from './employment-workflow.service';
import { JudicialAlimonyWorkflowService } from './pensao-judicial/judicial-alimony-workflow.service';
import { RhWorkflowMutationDto } from './rh-workflows.dto';
import { UnionWorkflowService } from './sindicato/union-workflow.service';
import { TransitBenefitWorkflowService } from './vales/transit-benefit-workflow.service';
import { WorkflowMutationContext } from './workflow-mutation-context';
import { IdRow } from './workflow-types';

export class WorkflowMutationService implements WorkflowMutationContext {
  readonly absence = new AbsenceWorkflowService(this);
  readonly administrative = new AdministrativeWorkflowService(this);
  readonly dependents = new DependentsWorkflowService(this);
  readonly employment = new EmploymentWorkflowService(this);
  readonly judicialAlimony = new JudicialAlimonyWorkflowService(this);
  readonly transitBenefit = new TransitBenefitWorkflowService(this);
  readonly union = new UnionWorkflowService(this);

  constructor(
    readonly databaseService: DatabaseService,
    readonly businessDaysService?: BusinessDaysService,
  ) {}

  async insertRecord(
    key: string,
    input: RhWorkflowMutationDto,
    employeeId?: string,
  ): Promise<void> {
    switch (key) {
      case 'dependents':
        return this.dependents.insertDependent(input, employeeId);
      case 'professional-experiences':
        return this.employment.insertProfessionalExperience(input, employeeId);
      case 'status-history':
        return this.absence.insertStatusHistory(input, employeeId);
      case 'frequencies':
        return this.absence.insertFrequency(input, employeeId);
      case 'service-time':
        return this.employment.insertServiceTime(input, employeeId);
      case 'transfers':
        return this.employment.insertTransfer(input, employeeId);
      case 'salary-history':
        return this.employment.insertSalaryHistory(input, employeeId);
      case 'complement-data':
        return this.dependents.insertComplementData(input, employeeId);
      case 'vacations':
        return this.administrative.insertVacation(input, employeeId);
      case 'leaves':
        return this.absence.insertLeave(input, employeeId);
      case 'benefit-dependents':
        return this.dependents.insertBenefitDependent(input, employeeId);
      case 'union-contributions':
        return this.union.insert(input, employeeId);
      case 'exercises':
        return this.administrative.insertExercise(input, employeeId);
      case 'alimonies':
        return this.judicialAlimony.insert(input, employeeId);
      case 'transit-benefits':
        return this.transitBenefit.insert(input, employeeId);
      case 'processes':
        return this.administrative.insertProcess(input);
      case 'process-functions':
        return this.administrative.insertProcessFunction(input);
      case 'organic-definitions':
        return this.administrative.insertOrganicDefinition(input);
      default:
        throw new NotFoundException(`Workflow not found: ${key}`);
    }
  }

  async updateRecord(
    key: string,
    id: string,
    input: RhWorkflowMutationDto,
  ): Promise<void> {
    switch (key) {
      case 'dependents':
        return this.dependents.updateDependent(id, input);
      case 'professional-experiences':
        return this.employment.updateProfessionalExperience(id, input);
      case 'status-history':
        return this.absence.updateStatusHistory(id, input);
      case 'frequencies':
        return this.absence.updateFrequency(id, input);
      case 'service-time':
        return this.employment.updateServiceTime(id, input);
      case 'transfers':
        return this.employment.updateTransfer(id, input);
      case 'salary-history':
        return this.employment.updateSalaryHistory(id, input);
      case 'complement-data':
        return this.dependents.updateComplementData(id, input);
      case 'vacations':
        return this.administrative.updateVacation(id, input);
      case 'leaves':
        return this.absence.updateLeave(id, input);
      case 'benefit-dependents':
        return this.dependents.updateBenefitDependent(id, input);
      case 'union-contributions':
        return this.union.update(id, input);
      case 'exercises':
        return this.administrative.updateExercise(id, input);
      case 'alimonies':
        return this.judicialAlimony.update(id, input);
      case 'transit-benefits':
        return this.transitBenefit.update(id, input);
      case 'processes':
        return this.administrative.updateProcess(id, input);
      case 'process-functions':
        return this.administrative.updateProcessFunction(id, input);
      case 'organic-definitions':
        return this.administrative.updateOrganicDefinition(id, input);
      default:
        throw new NotFoundException(`Workflow not found: ${key}`);
    }
  }

  require(value: unknown, field: string): void {
    if (value === undefined || value === null || value === '') {
      throw new BadRequestException(`${field} is required`);
    }
  }

  async resolveWorkedDays(input: RhWorkflowMutationDto): Promise<string> {
    if (input.workedDays != null) {
      return String(input.workedDays);
    }
    if (
      !this.businessDaysService ||
      input.year == null ||
      input.month == null
    ) {
      return '';
    }

    const monthBusinessDays =
      await this.businessDaysService.countWorkingDaysInMonth(
        input.year,
        input.month,
      );
    const absenceDays = Number(input.absenceDays ?? 0);
    const workedDays = Math.max(0, monthBusinessDays - absenceDays);
    return String(workedDays);
  }

  async findEmployeeIdByRecord(table: string, id: string): Promise<string> {
    const rows = await this.databaseService.query<IdRow>(
      `SELECT employee_id::text AS id FROM hr.${table} WHERE id = $1::uuid`,
      [id],
    );
    if (!rows[0]?.id) {
      throw new NotFoundException('Workflow record not found');
    }
    return rows[0].id;
  }

  async syncEmployeeUnion(
    employeeId: string | undefined,
    unionId: string | null,
  ): Promise<void> {
    if (!employeeId || !unionId) {
      return;
    }
    await this.databaseService.query(
      `
      UPDATE hr.employee
      SET
        union_id = $2::uuid,
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [employeeId, unionId],
    );
  }

  async syncEmployeeExercise(
    employeeId: string | undefined,
    branchId: string | null,
    workLocationId: string | null,
    jobFunctionId: string | null,
  ): Promise<void> {
    if (!employeeId) {
      return;
    }
    await this.databaseService.query(
      `
      UPDATE hr.employee
      SET
        branch_id = COALESCE(NULLIF($2, '')::uuid, branch_id),
        work_location_id = COALESCE(NULLIF($3, '')::uuid, work_location_id),
        job_function_id = COALESCE(NULLIF($4, '')::uuid, job_function_id),
        updated_at = now()
      WHERE id = $1::uuid
      `,
      [employeeId, branchId ?? '', workLocationId ?? '', jobFunctionId ?? ''],
    );
  }

  async ensureFunctionalStatus(
    code: string,
    description: string,
    modality: string,
    kind: string,
    lifecycleStatus: string,
  ): Promise<string> {
    const rows = await this.databaseService.query<{ id: string }>(
      `
      INSERT INTO hr.functional_status (
        tenant_id,
        code,
        description,
        modality,
        kind,
        enters_payroll,
        lifecycle_status,
        status
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1,
        $2,
        $3,
        $4,
        false,
        $5::"EmployeeLifecycleStatus",
        'ACTIVE'::"RecordStatus"
      )
      ON CONFLICT (tenant_id, code) DO UPDATE
      SET
        description = EXCLUDED.description,
        modality = EXCLUDED.modality,
        kind = EXCLUDED.kind,
        lifecycle_status = EXCLUDED.lifecycle_status,
        status = 'ACTIVE'::"RecordStatus",
        updated_at = now()
      RETURNING id::text
      `,
      [code, description, modality, kind, lifecycleStatus],
    );
    return rows[0]?.id ?? '';
  }
}
