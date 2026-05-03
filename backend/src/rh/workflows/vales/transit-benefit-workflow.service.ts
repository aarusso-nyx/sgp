import { RhWorkflowMutationDto } from '../rh-workflows.dto';
import { WorkflowMutationContext } from '../workflow-mutation-context';

export class TransitBenefitWorkflowService {
  constructor(private readonly context: WorkflowMutationContext) {}

  async insert(input: RhWorkflowMutationDto, employeeId?: string) {
    this.context.require(input.startsOn, 'startsOn');
    this.context.require(input.transitBenefitId, 'transitBenefitId');
    await this.context.databaseService.query(
      `INSERT INTO hr.employee_transit_benefit (tenant_id, employee_id, transit_benefit_id, quantity, starts_on, ends_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, $2::uuid, $3::decimal, $4::date, NULLIF($5, '')::date, $6, 'ACTIVE'::"RecordStatus")`,
      [
        employeeId,
        input.transitBenefitId,
        input.quantity ?? '1',
        input.startsOn,
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async update(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.employee_transit_benefit SET transit_benefit_id = COALESCE(NULLIF($2, '')::uuid, transit_benefit_id), quantity = COALESCE(NULLIF($3, '')::decimal, quantity), starts_on = COALESCE(NULLIF($4, '')::date, starts_on), ends_on = NULLIF($5, '')::date, notes = $6, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.transitBenefitId ?? '',
        input.quantity ?? '',
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }
}
