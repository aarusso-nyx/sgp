import { RhWorkflowMutationDto } from '../rh-workflows.dto';
import { WorkflowMutationContext } from '../workflow-mutation-context';

export class UnionWorkflowService {
  constructor(private readonly context: WorkflowMutationContext) {}

  async insert(input: RhWorkflowMutationDto, employeeId?: string) {
    this.context.require(input.startsOn, 'startsOn');
    await this.context.databaseService.query(
      `INSERT INTO hr.employee_union_contribution (tenant_id, employee_id, union_id, deduction_amount, deduction_percent, starts_on, ends_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, NULLIF($2, '')::uuid, NULLIF($3, '')::decimal, NULLIF($4, '')::decimal, $5::date, NULLIF($6, '')::date, $7, 'ACTIVE'::"RecordStatus")`,
      [
        employeeId,
        input.unionId ?? '',
        input.deductionAmount ?? '',
        input.deductionPercent ?? '',
        input.startsOn,
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
    await this.context.syncEmployeeUnion(employeeId, input.unionId ?? null);
  }

  async update(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.employee_union_contribution SET union_id = NULLIF($2, '')::uuid, deduction_amount = NULLIF($3, '')::decimal, deduction_percent = NULLIF($4, '')::decimal, starts_on = COALESCE(NULLIF($5, '')::date, starts_on), ends_on = NULLIF($6, '')::date, notes = $7, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.unionId ?? '',
        input.deductionAmount ?? '',
        input.deductionPercent ?? '',
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
    if (input.unionId !== undefined) {
      const employeeId = await this.context.findEmployeeIdByRecord(
        'employee_union_contribution',
        id,
      );
      await this.context.syncEmployeeUnion(employeeId, input.unionId ?? null);
    }
  }
}
