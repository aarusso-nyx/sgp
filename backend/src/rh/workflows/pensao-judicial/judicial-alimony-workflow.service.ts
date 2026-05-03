import { RhWorkflowMutationDto } from '../rh-workflows.dto';
import { WorkflowMutationContext } from '../workflow-mutation-context';
import { clean } from '../workflow-utils';

export class JudicialAlimonyWorkflowService {
  constructor(private readonly context: WorkflowMutationContext) {}

  async insert(input: RhWorkflowMutationDto, employeeId?: string) {
    this.context.require(input.startsOn, 'startsOn');
    this.context.require(input.beneficiaryName, 'beneficiaryName');
    await this.context.databaseService.query(
      `INSERT INTO hr.employee_alimony (tenant_id, employee_id, beneficiary_name, beneficiary_cpf, court_process_number, amount, starts_on, ends_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, $2, $3, $4, $5::decimal, $6::date, NULLIF($7, '')::date, $8, 'ACTIVE'::"RecordStatus")`,
      [
        employeeId,
        input.beneficiaryName?.trim(),
        clean(input.beneficiaryCpf),
        input.courtProcessNumber?.trim() || null,
        input.amount ?? '0',
        input.startsOn,
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async update(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.employee_alimony SET beneficiary_name = COALESCE($2, beneficiary_name), beneficiary_cpf = $3, court_process_number = $4, amount = COALESCE(NULLIF($5, '')::decimal, amount), starts_on = COALESCE(NULLIF($6, '')::date, starts_on), ends_on = NULLIF($7, '')::date, notes = $8, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.beneficiaryName?.trim() || null,
        clean(input.beneficiaryCpf),
        input.courtProcessNumber?.trim() || null,
        input.amount ?? '',
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }
}
