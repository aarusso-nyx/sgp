import { Injectable, Optional } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { StynxEsocialClient } from '../../integrations/stynx-esocial';
import {
  CreateBeneficiaryContactHistoryDto,
  CreateExternalLifeProofDto,
  CreateRecertificationBeneficiaryDto,
  CreateRecertificationCampaignDto,
  CreateRecertificationRecordDto,
  GeneratePrevidenciarioOutputDto,
} from '../previdenciario.dto';
import {
  beneficiaryRow,
  createReportRequest,
  employeeRow,
  ensureDatabase,
  toBeneficiaryContactHistorySummary,
  toBeneficiarySummary,
  toCampaignSummary,
  toLifeProofSummary,
  toRecertificationStatusDb,
  toRecertificationTypeDb,
  toRecordSummary,
} from '../previdenciario.shared';
import {
  BeneficiaryContactHistoryRow,
  ExternalLifeProofRow,
  RecertificationBeneficiaryRow,
  RecertificationCampaignRow,
  RecertificationRecordRow,
  S2405EligibilityRow,
} from '../previdenciario.types';

@Injectable()
export class RecadastramentoService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional() private readonly stynxEsocialClient?: StynxEsocialClient,
  ) {}

  async listCampaigns() {
    ensureDatabase(this.databaseService);
    const rows = await this.databaseService.query<RecertificationCampaignRow>(
      `
      SELECT
        id,
        type::text AS type,
        cycle_start,
        cycle_end,
        filter_json,
        active
      FROM hr.recertification_campaign
      ORDER BY active DESC, cycle_end DESC
      `,
    );
    return rows.map((row) => toCampaignSummary(row));
  }

  async createCampaign(input: CreateRecertificationCampaignDto) {
    ensureDatabase(this.databaseService);
    const rows = await this.databaseService.query<RecertificationCampaignRow>(
      `
      INSERT INTO hr.recertification_campaign (
        type,
        cycle_start,
        cycle_end,
        filter_json,
        active
      )
      VALUES ($1::"RecertificationBeneficiaryType", $2::date, $3::date, $4::jsonb, $5)
      RETURNING
        id,
        type::text AS type,
        cycle_start,
        cycle_end,
        filter_json,
        active
      `,
      [
        toRecertificationTypeDb(input.tipo),
        input.cicloInicio,
        input.cicloFim,
        JSON.stringify(input.filtro ?? {}),
        input.ativa ?? true,
      ],
    );
    return toCampaignSummary(rows[0]!);
  }

  async listBeneficiaries() {
    ensureDatabase(this.databaseService);
    const rows =
      await this.databaseService.query<RecertificationBeneficiaryRow>(
        this.beneficiaryListSql(''),
      );
    return rows.map((row) => toBeneficiarySummary(row));
  }

  async listPendingRecertifications() {
    ensureDatabase(this.databaseService);
    const rows =
      await this.databaseService.query<RecertificationBeneficiaryRow>(
        this.beneficiaryListSql(`
          WHERE beneficiary.status IN (
            'PENDING'::"RecertificationStatus",
            'NEAR_DUE'::"RecertificationStatus",
            'OVERDUE'::"RecertificationStatus",
            'BLOCKED'::"RecertificationStatus"
          )
        `),
      );
    return rows.map((row) => toBeneficiarySummary(row));
  }

  async createBeneficiary(input: CreateRecertificationBeneficiaryDto) {
    ensureDatabase(this.databaseService);
    const employee = await employeeRow(
      this.databaseService,
      input.funcionarioId,
    );
    const rows =
      await this.databaseService.query<RecertificationBeneficiaryRow>(
        `
      INSERT INTO hr.recertification_beneficiary (
        employee_id,
        campaign_id,
        type,
        next_due_date,
        status
      )
      VALUES (
        $1::uuid,
        NULLIF($2, '')::uuid,
        $3::"RecertificationBeneficiaryType",
        $4::date,
        $5::"RecertificationStatus"
      )
      ON CONFLICT (employee_id) DO UPDATE
      SET
        campaign_id = EXCLUDED.campaign_id,
        type = EXCLUDED.type,
        next_due_date = EXCLUDED.next_due_date,
        status = EXCLUDED.status,
        updated_at = now()
      RETURNING
        id,
        employee_id::text,
        $6::text AS registration,
        $7::text AS employee_name,
        campaign_id::text,
        type::text AS type,
        next_due_date,
        status::text AS status
      `,
        [
          input.funcionarioId,
          input.campanhaId ?? '',
          toRecertificationTypeDb(input.tipo),
          input.dataProxima,
          toRecertificationStatusDb(input.status ?? 'PENDENTE'),
          employee.registration,
          employee.name,
        ],
      );
    return toBeneficiarySummary(rows[0]!);
  }

  async createRecord(input: CreateRecertificationRecordDto) {
    ensureDatabase(this.databaseService);
    await beneficiaryRow(this.databaseService, input.beneficiarioId);
    const rows = await this.databaseService.query<RecertificationRecordRow>(
      `
      WITH inserted_record AS (
        INSERT INTO hr.recertification_record (
          beneficiary_id,
          recertified_on,
          operator_ref,
          snapshot_json,
          receipt_storage_key
        )
        VALUES ($1::uuid, $2::date, $3, $4::jsonb, NULLIF($5, ''))
        RETURNING *
      ),
      updated_beneficiary AS (
        UPDATE hr.recertification_beneficiary
        SET status = 'RECERTIFIED'::"RecertificationStatus",
            next_due_date = ($2::date + INTERVAL '12 months')::date,
            updated_at = now()
        WHERE id = $1::uuid
      )
      SELECT id, beneficiary_id::text, recertified_on, operator_ref,
             snapshot_json, receipt_storage_key
      FROM inserted_record
      `,
      [
        input.beneficiarioId,
        input.data,
        input.operadorId.trim(),
        JSON.stringify(input.dadosSnapshot ?? {}),
        input.comprovanteStorageKey ?? '',
      ],
    );
    const created = toRecordSummary(rows[0]!);
    await this.emitS2405ForRecertificationRecord(created.id);
    return created;
  }

  async createExternalLifeProof(input: CreateExternalLifeProofDto) {
    ensureDatabase(this.databaseService);
    await beneficiaryRow(this.databaseService, input.beneficiarioId);
    const rows = await this.databaseService.query<ExternalLifeProofRow>(
      `
      WITH inserted_proof AS (
        INSERT INTO hr.external_life_proof (
          beneficiary_id,
          channel,
          authentication_json,
          proven_at
        )
        VALUES ($1::uuid, $2::"ExternalLifeProofChannel", $3::jsonb, $4::timestamptz)
        RETURNING *
      ),
      updated_beneficiary AS (
        UPDATE hr.recertification_beneficiary
        SET status = 'RECERTIFIED'::"RecertificationStatus",
            next_due_date = (($4::timestamptz)::date + INTERVAL '12 months')::date,
            updated_at = now()
        WHERE id = $1::uuid
      )
      SELECT id, beneficiary_id::text, channel::text AS channel,
             authentication_json, proven_at
      FROM inserted_proof
      `,
      [
        input.beneficiarioId,
        input.canal,
        JSON.stringify(input.autenticacao ?? {}),
        input.data,
      ],
    );
    return toLifeProofSummary(rows[0]!);
  }

  async listBeneficiaryContactHistory() {
    ensureDatabase(this.databaseService);
    const rows = await this.databaseService.query<BeneficiaryContactHistoryRow>(
      `
      SELECT
        history.id,
        history.beneficiary_id::text,
        beneficiary.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        history.contacted_on,
        history.user_ref,
        history.notes
      FROM hr.beneficiary_contact_history history
      JOIN hr.recertification_beneficiary beneficiary
        ON beneficiary.id = history.beneficiary_id
      JOIN hr.employee employee ON employee.id = beneficiary.employee_id
      ORDER BY history.contacted_on DESC, history.created_at DESC
      `,
    );
    return rows.map((row) => toBeneficiaryContactHistorySummary(row));
  }

  async createBeneficiaryContactHistory(
    input: CreateBeneficiaryContactHistoryDto,
  ) {
    ensureDatabase(this.databaseService);
    await beneficiaryRow(this.databaseService, input.beneficiarioId);
    const rows = await this.databaseService.query<BeneficiaryContactHistoryRow>(
      `
      INSERT INTO hr.beneficiary_contact_history (
        beneficiary_id,
        contacted_on,
        user_ref,
        notes
      )
      SELECT $1::uuid, $2::date, $3, $4
      RETURNING id, beneficiary_id::text,
        (SELECT beneficiary.employee_id::text
         FROM hr.recertification_beneficiary beneficiary
         WHERE beneficiary.id = $1::uuid) AS employee_id,
        (SELECT employee.registration
         FROM hr.recertification_beneficiary beneficiary
         JOIN hr.employee employee ON employee.id = beneficiary.employee_id
         WHERE beneficiary.id = $1::uuid) AS registration,
        (SELECT employee.name
         FROM hr.recertification_beneficiary beneficiary
         JOIN hr.employee employee ON employee.id = beneficiary.employee_id
         WHERE beneficiary.id = $1::uuid) AS employee_name,
        contacted_on, user_ref, notes
      `,
      [
        input.beneficiarioId,
        input.data,
        input.usuarioId.trim(),
        input.observacao?.trim() ?? '',
      ],
    );
    return toBeneficiaryContactHistorySummary(rows[0]!);
  }

  async requestRecertificationNotice(input: GeneratePrevidenciarioOutputDto) {
    return this.reportRequest('PREVIDENCIARIO_RECADASTRAMENTO_CONVOCACAO', {
      campaignId: input.campanhaId ?? null,
      competence: input.competencia ?? null,
      format: input.formato ?? 'PDF',
    });
  }

  async requestRecertificationPendingReport(
    input: GeneratePrevidenciarioOutputDto,
  ) {
    return this.reportRequest('PREVIDENCIARIO_RECADASTRAMENTO_PENDENCIAS', {
      campaignId: input.campanhaId ?? null,
      competence: input.competencia ?? null,
      format: input.formato ?? 'PDF',
    });
  }

  async requestSiprevExport(input: GeneratePrevidenciarioOutputDto) {
    return this.reportRequest('PREVIDENCIARIO_SIPREV_EXPORT', {
      competence: input.competencia ?? null,
      format: input.formato ?? 'XML',
    });
  }

  private beneficiaryListSql(whereClause: string) {
    return `
      SELECT
        beneficiary.id,
        beneficiary.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        beneficiary.campaign_id::text,
        beneficiary.type::text AS type,
        beneficiary.next_due_date,
        beneficiary.status::text AS status
      FROM hr.recertification_beneficiary beneficiary
      JOIN hr.employee employee ON employee.id = beneficiary.employee_id
      ${whereClause}
      ORDER BY beneficiary.next_due_date ASC
      `;
  }

  private async reportRequest(
    code: string,
    parameters: Record<string, unknown>,
  ) {
    const names: Record<string, string> = {
      PREVIDENCIARIO_RECADASTRAMENTO_CONVOCACAO:
        'Convocacao de recadastramento',
      PREVIDENCIARIO_RECADASTRAMENTO_PENDENCIAS:
        'Relatorio de pendencias de recadastramento',
      PREVIDENCIARIO_SIPREV_EXPORT: 'Exportacao SIPREV',
    };
    return createReportRequest(
      this.databaseService,
      code,
      names[code] ?? code,
      parameters,
    );
  }

  private async emitS2405ForRecertificationRecord(
    recertificationRecordId: string,
  ) {
    if (!this.stynxEsocialClient) return;
    const eligible = await this.databaseService.query<S2405EligibilityRow>(
      `
      SELECT grant_row.id::text AS retirement_grant_id
      FROM hr.recertification_record record
      JOIN hr.recertification_beneficiary beneficiary
        ON beneficiary.id = record.beneficiary_id
       AND beneficiary.type = 'RETIREE'::"RecertificationBeneficiaryType"
      JOIN hr.retirement_grant grant_row
        ON grant_row.tenant_id = beneficiary.tenant_id
       AND grant_row.employee_id = beneficiary.employee_id
       AND grant_row.status = 'CONCEDIDA'
      WHERE record.id = $1::uuid
      ORDER BY grant_row.granted_on DESC, grant_row.created_at DESC
      LIMIT 1
      `,
      [recertificationRecordId],
    );
    if (!eligible[0]) return;

    await this.stynxEsocialClient.enqueue({
      kind: 'trabalhador',
      eventClass: 'S-2405',
      sourceRef: {
        sourceEntityKind: 'hr.recertification_record',
        sourceEntityId: recertificationRecordId,
      },
      payload: {
        recertificationRecordId,
        retirementGrantId: eligible[0].retirement_grant_id,
      },
    });
  }
}
