import { RhWorkflowMutationDto } from '../rh-workflows.dto';
import { WorkflowMutationContext } from '../workflow-mutation-context';
import { clean, stringMeta } from '../workflow-utils';

export class DependentsWorkflowService {
  constructor(private readonly context: WorkflowMutationContext) {}

  async insertDependent(input: RhWorkflowMutationDto, employeeId?: string) {
    this.context.require(input.name, 'name');
    await this.context.databaseService.query(
      `INSERT INTO hr.employee_dependent (employee_id, name, cpf, birth_date, relationship, income_tax_dependent) VALUES ($1::uuid, $2, $3, NULLIF($4, '')::date, $5, $6)`,
      [
        employeeId,
        input.name?.trim(),
        clean(input.cpf),
        stringMeta(input, 'birthDate'),
        input.relationship?.trim() || 'Nao informado',
        input.incomeTaxDependent ?? false,
      ],
    );
  }

  async insertBenefitDependent(
    input: RhWorkflowMutationDto,
    employeeId?: string,
  ) {
    this.context.require(input.startsOn, 'startsOn');
    this.context.require(input.name, 'name');
    this.context.require(input.benefitCode, 'benefitCode');
    await this.context.databaseService.query(
      `INSERT INTO hr.employee_benefit_dependent (tenant_id, employee_id, dependent_id, dependent_name, dependent_cpf, relationship, benefit_code, starts_on, ends_on, notes, status) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, NULLIF($2, '')::uuid, $3, $4, $5, $6, $7::date, NULLIF($8, '')::date, $9, 'ACTIVE'::"RecordStatus")`,
      [
        employeeId,
        input.dependentId ?? '',
        input.name?.trim(),
        clean(input.cpf),
        input.relationship?.trim() || '',
        input.benefitCode?.trim(),
        input.startsOn,
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async insertComplementData(
    input: RhWorkflowMutationDto,
    employeeId?: string,
  ) {
    await this.context.databaseService.query(
      `INSERT INTO hr.employee_complement_data (tenant_id, employee_id, rg, rg_issuer, pis_pasep, voter_registration, address, emergency_contact) VALUES (public.sgp_current_tenant_uuid(), $1::uuid, $2, $3, $4, $5, $6::jsonb, $7::jsonb) ON CONFLICT (employee_id) DO UPDATE SET rg = EXCLUDED.rg, rg_issuer = EXCLUDED.rg_issuer, pis_pasep = EXCLUDED.pis_pasep, voter_registration = EXCLUDED.voter_registration, address = EXCLUDED.address, emergency_contact = EXCLUDED.emergency_contact, updated_at = now()`,
      [
        employeeId,
        input.rg?.trim() || null,
        input.rgIssuer?.trim() || null,
        input.pisPasep?.trim() || null,
        input.voterRegistration?.trim() || null,
        JSON.stringify(input.metadata?.address ?? {}),
        JSON.stringify(input.metadata?.emergencyContact ?? {}),
      ],
    );
  }

  async updateDependent(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.employee_dependent SET name = COALESCE($2, name), cpf = $3, relationship = COALESCE($4, relationship), income_tax_dependent = $5, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.name?.trim() || null,
        clean(input.cpf),
        input.relationship?.trim() || null,
        input.incomeTaxDependent ?? false,
      ],
    );
  }

  async updateBenefitDependent(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.employee_benefit_dependent SET dependent_id = NULLIF($2, '')::uuid, dependent_name = COALESCE($3, dependent_name), dependent_cpf = $4, relationship = COALESCE($5, relationship), benefit_code = COALESCE($6, benefit_code), starts_on = COALESCE(NULLIF($7, '')::date, starts_on), ends_on = NULLIF($8, '')::date, notes = $9, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.dependentId ?? '',
        input.name?.trim() || null,
        clean(input.cpf),
        input.relationship?.trim() || null,
        input.benefitCode?.trim() || null,
        input.startsOn ?? '',
        input.endsOn ?? '',
        input.notes?.trim() || '',
      ],
    );
  }

  async updateComplementData(id: string, input: RhWorkflowMutationDto) {
    await this.context.databaseService.query(
      `UPDATE hr.employee_complement_data SET rg = $2, rg_issuer = $3, pis_pasep = $4, voter_registration = $5, address = $6::jsonb, emergency_contact = $7::jsonb, updated_at = now() WHERE id = $1::uuid`,
      [
        id,
        input.rg?.trim() || null,
        input.rgIssuer?.trim() || null,
        input.pisPasep?.trim() || null,
        input.voterRegistration?.trim() || null,
        JSON.stringify(input.metadata?.address ?? {}),
        JSON.stringify(input.metadata?.emergencyContact ?? {}),
      ],
    );
  }
}
