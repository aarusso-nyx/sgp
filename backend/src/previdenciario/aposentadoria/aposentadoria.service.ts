import { BadRequestException, Injectable, Optional } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { S2400Builder } from '../../esocial-worker/builders/s2400.builder';
import { S2410Builder } from '../../esocial-worker/builders/s2410.builder';
import { S2418Builder } from '../../esocial-worker/builders/s2418.builder';
import { ESocialEmitService } from '../../esocial-worker/esocial-emit.service';
import {
  CreateRetirementGrantDto,
  CreateRetirementSimulationDto,
} from '../previdenciario.dto';
import {
  employeeRow,
  ensureDatabase,
  ruleRow,
  toGrantSummary,
} from '../previdenciario.shared';
import {
  RetirementGrantRow,
  S2418ReactivationEmissionInput,
} from '../previdenciario.types';
import { RegrasService } from '../regras/regras.service';

@Injectable()
export class AposentadoriaService {
  private readonly regrasService: RegrasService;

  constructor(
    private readonly databaseService: DatabaseService,
    @Optional() regrasService?: RegrasService,
    @Optional() private readonly s2400Builder?: S2400Builder,
    @Optional() private readonly s2410Builder?: S2410Builder,
    @Optional() private readonly s2418Builder?: S2418Builder,
    @Optional() private readonly esocialEmitService?: ESocialEmitService,
  ) {
    this.regrasService =
      regrasService ?? new RegrasService(this.databaseService);
  }

  async listRetirementGrants() {
    ensureDatabase(this.databaseService);
    const rows = await this.databaseService.query<RetirementGrantRow>(
      `
      SELECT
        grant_row.id,
        grant_row.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        grant_row.rule_id::text,
        rule.name AS rule_name,
        grant_row.granted_on,
        grant_row.legal_basis,
        grant_row.appointment_act,
        grant_row.status,
        grant_row.notes,
        grant_row.granted_by_ref
      FROM hr.retirement_grant grant_row
      JOIN hr.employee employee ON employee.id = grant_row.employee_id
      JOIN hr.retirement_rule rule ON rule.id = grant_row.rule_id
      ORDER BY grant_row.granted_on DESC, grant_row.created_at DESC
      `,
    );
    return rows.map((row) => toGrantSummary(row));
  }

  async createRetirementGrant(
    input: CreateRetirementGrantDto,
    actorUsername?: string,
  ) {
    ensureDatabase(this.databaseService);
    const employee = await employeeRow(
      this.databaseService,
      input.funcionarioId,
    );
    const rule = await ruleRow(this.databaseService, input.regraId);
    const simulationInput: CreateRetirementSimulationDto = {
      funcionarioId: input.funcionarioId,
      regraId: input.regraId,
      dataReferencia: input.dataConcessao,
    };
    const simulationData = this.regrasService.evaluateSimulation(
      employee,
      rule,
      simulationInput,
    );
    if (!simulationData.resultado.elegivel) {
      throw new BadRequestException(
        'Employee is not eligible for retirement rule',
      );
    }

    const rows = await this.databaseService.query<RetirementGrantRow>(
      `
      WITH inserted_grant AS (
        INSERT INTO hr.retirement_grant (
          employee_id,
          rule_id,
          granted_on,
          legal_basis,
          appointment_act,
          status,
          notes,
          granted_by_ref
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::date,
          $4,
          $5,
          'CONCEDIDA',
          $6,
          NULLIF($7, '')
        )
        RETURNING *
      ),
      updated_employee AS (
        UPDATE hr.employee
        SET lifecycle_status = 'TERMINATED'::"EmployeeLifecycleStatus",
            terminated_on = $3::date,
            updated_at = now()
        WHERE id = $1::uuid
      ),
      inserted_beneficiary AS (
        INSERT INTO hr.recertification_beneficiary (
          employee_id,
          type,
          next_due_date,
          status
        )
        VALUES (
          $1::uuid,
          'RETIREE'::"RecertificationBeneficiaryType",
          ($3::date + INTERVAL '6 months')::date,
          'PENDING'::"RecertificationStatus"
        )
        ON CONFLICT (employee_id) DO UPDATE
          SET type = EXCLUDED.type,
              next_due_date = EXCLUDED.next_due_date,
              status = EXCLUDED.status,
              updated_at = now()
        RETURNING id
      )
      SELECT
        grant_row.id,
        grant_row.employee_id::text,
        $8::text AS registration,
        $9::text AS employee_name,
        grant_row.rule_id::text,
        $10::text AS rule_name,
        grant_row.granted_on,
        grant_row.legal_basis,
        grant_row.appointment_act,
        grant_row.status,
        grant_row.notes,
        grant_row.granted_by_ref
      FROM inserted_grant grant_row
      `,
      [
        input.funcionarioId,
        input.regraId,
        input.dataConcessao,
        input.fundamento.trim(),
        input.atoNomeacao.trim(),
        input.observacao?.trim() ?? '',
        input.concedidaPorId ?? actorUsername ?? '',
        employee.registration,
        employee.name,
        rule.name,
      ],
    );
    const created = toGrantSummary(rows[0]!);
    await this.emitS2400ForRetirementGrant(created.id);
    await this.emitS2410ForRetirementGrant(created.id);
    return created;
  }

  async emitS2418ForBenefitReactivation(input: S2418ReactivationEmissionInput) {
    if (!this.s2418Builder || !this.esocialEmitService) return;
    const record =
      input.sourceKind === 'RETIREMENT'
        ? await this.s2418Builder.buildRetirementReactivation(input)
        : await this.s2418Builder.buildPensionReactivation(input);
    return this.esocialEmitService.emit({
      tenantId: record.tenantId,
      eventKind: record.eventKind,
      xml: record.xml,
      reference: record.reference,
      competence: record.competence,
      sourceEntityKind: record.sourceEntityKind,
      sourceEntityId: record.sourceId,
      payload: record.payload,
    });
  }

  private async emitS2400ForRetirementGrant(retirementGrantId: string) {
    if (!this.s2400Builder || !this.esocialEmitService) return;
    const record = await this.s2400Builder.build(retirementGrantId);
    await this.esocialEmitService.emit({
      tenantId: record.tenantId,
      eventKind: record.eventKind,
      xml: record.xml,
      reference: record.reference,
      competence: record.competence,
      sourceEntityKind: 'hr.retirement_grant',
      sourceEntityId: record.retirementGrantId,
      payload: record.payload,
    });
  }

  private async emitS2410ForRetirementGrant(retirementGrantId: string) {
    if (!this.s2410Builder || !this.esocialEmitService) return;
    const record =
      await this.s2410Builder.buildRetirementGrant(retirementGrantId);
    await this.esocialEmitService.emit({
      tenantId: record.tenantId,
      eventKind: record.eventKind,
      xml: record.xml,
      reference: record.reference,
      competence: record.competence,
      sourceEntityKind: record.sourceEntityKind,
      sourceEntityId: record.sourceId,
      payload: record.payload,
    });
  }
}
