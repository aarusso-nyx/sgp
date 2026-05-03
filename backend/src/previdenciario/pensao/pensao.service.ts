import { Injectable, NotFoundException, Optional } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { S2410Builder } from '../../esocial-worker/builders/s2410.builder';
import { S2416Builder } from '../../esocial-worker/builders/s2416.builder';
import { S2420Builder } from '../../esocial-worker/builders/s2420.builder';
import { ESocialEmitService } from '../../esocial-worker/esocial-emit.service';
import {
  CreatePensionCompensationDto,
  CreatePensionGrantDto,
  UpdatePensionCompensationDto,
} from '../previdenciario.dto';
import {
  employeeRow,
  ensureDatabase,
  toCompensationStatusDb,
  toCompensationSummary,
  toPensionSummary,
} from '../previdenciario.shared';
import {
  EmployeeRetirementRow,
  PensionCompensationRow,
  PensionGrantRow,
} from '../previdenciario.types';

@Injectable()
export class PensaoService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional() private readonly s2410Builder?: S2410Builder,
    @Optional() private readonly s2416Builder?: S2416Builder,
    @Optional() private readonly s2420Builder?: S2420Builder,
    @Optional() private readonly esocialEmitService?: ESocialEmitService,
  ) {}

  async listPensions() {
    ensureDatabase(this.databaseService);
    const rows = await this.databaseService.query<PensionGrantRow>(
      `
      SELECT
        pension.id,
        pension.instituting_employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        pension.beneficiary_name,
        pension.beneficiary_cpf,
        pension.kinship,
        pension.benefit_type,
        pension.apportionment_type,
        pension.share_percent::text,
        pension.adjustment_mode,
        pension.nature,
        pension.granted_on,
        pension.ceased_on,
        pension.legal_basis,
        pension.notes
      FROM hr.pension_grant pension
      LEFT JOIN hr.employee employee
        ON employee.id = pension.instituting_employee_id
      ORDER BY pension.granted_on DESC, pension.created_at DESC
      `,
    );
    return rows.map((row) => toPensionSummary(row));
  }

  async createPension(input: CreatePensionGrantDto) {
    ensureDatabase(this.databaseService);
    let employee: EmployeeRetirementRow | null = null;
    if (input.funcionarioInstituidorId) {
      employee = await employeeRow(
        this.databaseService,
        input.funcionarioInstituidorId,
      );
    }
    const rows = await this.databaseService.query<PensionGrantRow>(
      `
      INSERT INTO hr.pension_grant (
        instituting_employee_id,
        beneficiary_name,
        beneficiary_cpf,
        kinship,
        benefit_type,
        apportionment_type,
        share_percent,
        adjustment_mode,
        nature,
        granted_on,
        ceased_on,
        legal_basis,
        notes
      )
      VALUES (
        NULLIF($1, '')::uuid,
        $2,
        NULLIF($3, ''),
        NULLIF($4, ''),
        $5,
        $6,
        $7::decimal,
        $8,
        $9,
        $10::date,
        NULLIF($11, '')::date,
        $12,
        $13
      )
      RETURNING
        id,
        instituting_employee_id::text,
        $14::text AS registration,
        $15::text AS employee_name,
        beneficiary_name,
        beneficiary_cpf,
        kinship,
        benefit_type,
        apportionment_type,
        share_percent::text,
        adjustment_mode,
        nature,
        granted_on,
        ceased_on,
        legal_basis,
        notes
      `,
      [
        input.funcionarioInstituidorId ?? '',
        input.nomeBeneficiario.trim(),
        input.cpfBeneficiario ?? '',
        input.parentesco ?? '',
        input.tipoBeneficio.trim(),
        input.tipoRateio.trim(),
        input.cotaParte,
        input.formaReajuste.trim(),
        input.natureza.trim(),
        input.dataConcessao,
        input.dataCessacao ?? '',
        input.fundamento.trim(),
        input.observacao?.trim() ?? '',
        employee?.registration ?? null,
        employee?.name ?? null,
      ],
    );
    const created = toPensionSummary(rows[0]!);
    await this.emitS2410ForPensionGrant(created.id);
    await this.emitS2416ForPensionGrant(created.id);
    if (created.dataCessacao) {
      await this.emitS2420ForPensionGrant(created.id);
    }
    return created;
  }

  async listCompensations() {
    ensureDatabase(this.databaseService);
    const rows = await this.databaseService.query<PensionCompensationRow>(
      `
      SELECT
        compensation.id,
        compensation.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        compensation.certificate_ref,
        compensation.origin_regime,
        compensation.amount::text,
        compensation.status::text AS status,
        compensation.notes
      FROM hr.pension_compensation compensation
      LEFT JOIN hr.employee employee ON employee.id = compensation.employee_id
      ORDER BY compensation.created_at DESC
      `,
    );
    return rows.map((row) => toCompensationSummary(row));
  }

  async createCompensation(input: CreatePensionCompensationDto) {
    ensureDatabase(this.databaseService);
    if (input.funcionarioId) {
      await employeeRow(this.databaseService, input.funcionarioId);
    }
    const rows = await this.databaseService.query<PensionCompensationRow>(
      `
      INSERT INTO hr.pension_compensation (
        employee_id,
        certificate_ref,
        origin_regime,
        amount,
        status,
        notes
      )
      VALUES (
        NULLIF($1, '')::uuid,
        NULLIF($2, ''),
        $3,
        $4::decimal,
        $5::"PensionCompensationStatus",
        $6
      )
      RETURNING
        id,
        employee_id::text,
        NULL::text AS registration,
        NULL::text AS employee_name,
        certificate_ref,
        origin_regime,
        amount::text,
        status::text AS status,
        notes
      `,
      [
        input.funcionarioId ?? '',
        input.certidaoReferencia ?? '',
        input.regimeOrigem.trim(),
        input.valor,
        toCompensationStatusDb(input.status ?? 'RASCUNHO'),
        input.observacao?.trim() ?? '',
      ],
    );
    return toCompensationSummary(rows[0]!);
  }

  async updateCompensation(id: string, input: UpdatePensionCompensationDto) {
    ensureDatabase(this.databaseService);
    const rows = await this.databaseService.query<PensionCompensationRow>(
      `
      UPDATE hr.pension_compensation compensation
      SET
        status = COALESCE($2::"PensionCompensationStatus", compensation.status),
        notes = COALESCE($3, compensation.notes),
        updated_at = now()
      WHERE compensation.id = $1::uuid
      RETURNING
        compensation.id,
        compensation.employee_id::text,
        NULL::text AS registration,
        NULL::text AS employee_name,
        compensation.certificate_ref,
        compensation.origin_regime,
        compensation.amount::text,
        compensation.status::text AS status,
        compensation.notes
      `,
      [
        id,
        input.status ? toCompensationStatusDb(input.status) : null,
        input.observacao ?? null,
      ],
    );
    if (!rows[0]) {
      throw new NotFoundException('Pension compensation not found');
    }
    return toCompensationSummary(rows[0]);
  }

  private async emitS2410ForPensionGrant(pensionGrantId: string) {
    if (!this.s2410Builder || !this.esocialEmitService) return;
    const record = await this.s2410Builder.buildPensionGrant(pensionGrantId);
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

  private async emitS2416ForPensionGrant(pensionGrantId: string) {
    if (!this.s2416Builder || !this.esocialEmitService) return;
    const record = await this.s2416Builder.buildPensionGrant(pensionGrantId);
    await this.esocialEmitService.emit({
      tenantId: record.tenantId,
      eventKind: record.eventKind,
      xml: record.xml,
      reference: record.reference,
      competence: record.competence,
      sourceEntityKind: record.sourceEntityKind,
      sourceEntityId: record.pensionGrantId,
      payload: record.payload,
    });
  }

  private async emitS2420ForPensionGrant(pensionGrantId: string) {
    if (!this.s2420Builder || !this.esocialEmitService) return;
    const record = await this.s2420Builder.buildPensionGrant(pensionGrantId);
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
