import type { QueryResultRow } from 'pg';

import { buildSimplePdfReport } from '../builders/document-report.builder';
import { buildSiprevExport } from '../builders/siprev-export.builder';
import {
  IntegrationDispatchContext,
  IntegrationJobDispatcher,
  IntegrationProcessResult,
  PendingIntegrationJobRow,
} from './integration-job-dispatcher';
import { domainError } from '../../common/errors/domain-error';

interface ContributionTimeCertificateExecutionRow extends QueryResultRow {
  certificate_id: string;
  employee_name: string;
  registration: string;
  period_start: Date | string;
  period_end: Date | string;
  issuing_agency: string;
  issuance_act: string;
}

interface PrevidentiaryDeclarationExecutionRow extends QueryResultRow {
  declaration_id: string;
  employee_name: string;
  registration: string;
  type: string;
  issued_at: Date | string;
}

interface RecertificationCampaignSummaryRow extends QueryResultRow {
  campaign_id: string | null;
  cycle_start: Date | string | null;
  cycle_end: Date | string | null;
  total_beneficiaries: string;
  pending_count: string;
  recertified_count: string;
}

interface SiprevRetirementRow extends QueryResultRow {
  id: string;
  cpf: string | null;
  name: string;
  granted_on: Date | string;
  legal_basis: string;
}

interface SiprevPensionRow extends QueryResultRow {
  id: string;
  beneficiary_name: string;
  beneficiary_cpf: string | null;
  granted_on: Date | string;
  benefit_type: string;
}

export class PrevidentiaryIntegrationDispatcher implements IntegrationJobDispatcher {
  readonly definitions = [
    'PREVIDENCIARIO_CTC',
    'PREVIDENCIARIO_DECLARACAO',
    'PREVIDENCIARIO_RECADASTRAMENTO_CONVOCACAO',
    'PREVIDENCIARIO_RECADASTRAMENTO_PENDENCIAS',
    'PREVIDENCIARIO_SIPREV_EXPORT',
  ] as const;

  process(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    switch (job.definition_code) {
      case 'PREVIDENCIARIO_CTC':
        return this.processContributionTimeCertificate(job, context);
      case 'PREVIDENCIARIO_DECLARACAO':
        return this.processPrevidentiaryDeclaration(job, context);
      case 'PREVIDENCIARIO_RECADASTRAMENTO_CONVOCACAO':
        return this.processRecertificationNotice(job, context);
      case 'PREVIDENCIARIO_RECADASTRAMENTO_PENDENCIAS':
        return this.processRecertificationPendingReport(job, context);
      case 'PREVIDENCIARIO_SIPREV_EXPORT':
        return this.processSiprevExport(job, context);
      default:
        throw domainError.internal(
          'INTERNAL_INVARIANT',
          `Unsupported previdentiary job: ${job.definition_code}`,
        );
    }
  }

  private async processContributionTimeCertificate(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    const certificateId = context.requireString(
      job.parameters,
      'certificateId',
    );
    const rows =
      await context.databaseService.query<ContributionTimeCertificateExecutionRow>(
        `
        SELECT
          certificate.id::text AS certificate_id,
          employee.name AS employee_name,
          employee.registration,
          certificate.period_start,
          certificate.period_end,
          certificate.issuing_agency,
          certificate.issuance_act
        FROM hr.contribution_time_certificate certificate
        JOIN hr.employee employee ON employee.id = certificate.employee_id
        WHERE certificate.id = $1::uuid
        `,
        [certificateId],
      );
    const row = rows[0];
    if (!row) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Contribution time certificate source not found',
      );
    }

    const artifact = buildSimplePdfReport({
      fileName: `ctc-${row.registration}.pdf`,
      title: 'Certidao de Tempo de Contribuicao',
      lines: [
        `Servidor: ${row.employee_name}`,
        `Matricula: ${row.registration}`,
        `Periodo inicio: ${context.toDateString(row.period_start)}`,
        `Periodo fim: ${context.toDateString(row.period_end)}`,
        `Orgao emitente: ${row.issuing_agency}`,
        `Ato de emissao: ${row.issuance_act}`,
      ],
      recordCount: 1,
    });

    return context.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'previdenciario',
        'ctc',
        artifact.fileName,
      ].join('/'),
      {
        operation: 'previdenciario.ctc.gerada',
        certificateId,
      },
    );
  }

  private async processPrevidentiaryDeclaration(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    const declarationId = context.requireString(
      job.parameters,
      'declarationId',
    );
    const rows =
      await context.databaseService.query<PrevidentiaryDeclarationExecutionRow>(
        `
        SELECT
          declaration.id::text AS declaration_id,
          employee.name AS employee_name,
          employee.registration,
          declaration.type,
          declaration.issued_at
        FROM hr.previdentiary_declaration declaration
        JOIN hr.employee employee ON employee.id = declaration.employee_id
        WHERE declaration.id = $1::uuid
        `,
        [declarationId],
      );
    const row = rows[0];
    if (!row) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Previdentiary declaration source not found',
      );
    }

    const artifact = buildSimplePdfReport({
      fileName: `declaracao-${row.registration}-${row.type.toLowerCase()}.pdf`,
      title: 'Declaracao Previdenciaria',
      lines: [
        `Servidor: ${row.employee_name}`,
        `Matricula: ${row.registration}`,
        `Tipo: ${row.type}`,
        `Emitida em: ${context.toDateString(row.issued_at)}`,
      ],
      recordCount: 1,
    });

    return context.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'previdenciario',
        'declaracoes',
        artifact.fileName,
      ].join('/'),
      {
        operation: 'previdenciario.declaracao.gerada',
        declarationId,
      },
    );
  }

  private async processRecertificationNotice(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    const campaignId = context.readString(job.parameters, 'campaignId');
    const row = await this.loadRecertificationCampaignSummary(
      campaignId,
      context,
    );

    const artifact = buildSimplePdfReport({
      fileName: `convocacao-recadastramento-${campaignId ?? 'geral'}.pdf`,
      title: 'Convocacao para Recadastramento',
      lines: [
        `Campanha: ${row.campaign_id ?? 'geral'}`,
        `Ciclo inicio: ${row.cycle_start ? context.toDateString(row.cycle_start) : '-'}`,
        `Ciclo fim: ${row.cycle_end ? context.toDateString(row.cycle_end) : '-'}`,
        `Beneficiarios: ${row.total_beneficiaries}`,
        `Pendentes: ${row.pending_count}`,
      ],
      recordCount: Number(row.total_beneficiaries),
    });

    return context.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'previdenciario',
        'recadastramento',
        'convocacoes',
        artifact.fileName,
      ].join('/'),
      {
        operation: 'previdenciario.recadastramento.convocacao.gerada',
        campaignId,
      },
    );
  }

  private async processRecertificationPendingReport(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    const campaignId = context.readString(job.parameters, 'campaignId');
    const row = await this.loadRecertificationCampaignSummary(
      campaignId,
      context,
    );

    const artifact = buildSimplePdfReport({
      fileName: `pendencias-recadastramento-${campaignId ?? 'geral'}.pdf`,
      title: 'Relatorio de Pendencias de Recadastramento',
      lines: [
        `Campanha: ${row.campaign_id ?? 'geral'}`,
        `Beneficiarios: ${row.total_beneficiaries}`,
        `Pendentes: ${row.pending_count}`,
        `Recadastrados: ${row.recertified_count}`,
      ],
      recordCount: Number(row.total_beneficiaries),
    });

    return context.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'previdenciario',
        'recadastramento',
        'relatorios',
        artifact.fileName,
      ].join('/'),
      {
        operation: 'previdenciario.recadastramento.pendencias.gerada',
        campaignId,
      },
    );
  }

  private async processSiprevExport(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    const competence = context.requireString(job.parameters, 'competence');
    const retirements =
      await context.databaseService.query<SiprevRetirementRow>(
        `
      SELECT
        grant_row.id::text,
        employee.cpf,
        employee.name,
        grant_row.granted_on,
        grant_row.legal_basis
      FROM hr.retirement_grant grant_row
      JOIN hr.employee employee ON employee.id = grant_row.employee_id
      WHERE to_char(grant_row.granted_on, 'YYYY-MM') = $1
      ORDER BY grant_row.granted_on ASC
      `,
        [competence],
      );
    const pensions = await context.databaseService.query<SiprevPensionRow>(
      `
      SELECT
        pension.id::text,
        pension.beneficiary_name,
        pension.beneficiary_cpf,
        pension.granted_on,
        pension.benefit_type
      FROM hr.pension_grant pension
      WHERE to_char(pension.granted_on, 'YYYY-MM') = $1
      ORDER BY pension.granted_on ASC
      `,
      [competence],
    );

    const artifact = buildSiprevExport({
      competence,
      retirements: retirements.map((entry) => ({
        id: entry.id,
        cpf: entry.cpf,
        name: entry.name,
        grantedOn: context.toDateString(entry.granted_on),
        legalBasis: entry.legal_basis,
      })),
      pensions: pensions.map((entry) => ({
        id: entry.id,
        beneficiaryName: entry.beneficiary_name,
        beneficiaryCpf: entry.beneficiary_cpf,
        grantedOn: context.toDateString(entry.granted_on),
        benefitType: entry.benefit_type,
      })),
    });

    const [year, month] = competence.split('-');
    return context.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'previdenciario',
        'siprev',
        year,
        month,
        artifact.fileName,
      ].join('/'),
      {
        operation: 'previdenciario.siprev.exportado',
        competence,
        retirements: retirements.length,
        pensions: pensions.length,
      },
    );
  }

  private async loadRecertificationCampaignSummary(
    campaignId: string | null,
    context: IntegrationDispatchContext,
  ): Promise<RecertificationCampaignSummaryRow> {
    const rows =
      await context.databaseService.query<RecertificationCampaignSummaryRow>(
        `
      SELECT
        campaign.id::text AS campaign_id,
        campaign.cycle_start,
        campaign.cycle_end,
        count(beneficiary.id)::text AS total_beneficiaries,
        count(*) FILTER (
          WHERE beneficiary.status IN (
            'PENDING'::"RecertificationStatus",
            'NEAR_DUE'::"RecertificationStatus",
            'OVERDUE'::"RecertificationStatus",
            'BLOCKED'::"RecertificationStatus"
          )
        )::text AS pending_count,
        count(*) FILTER (
          WHERE beneficiary.status = 'RECERTIFIED'::"RecertificationStatus"
        )::text AS recertified_count
      FROM hr.recertification_campaign campaign
      LEFT JOIN hr.recertification_beneficiary beneficiary
        ON beneficiary.campaign_id = campaign.id
      WHERE ($1::uuid IS NULL OR campaign.id = $1::uuid)
      GROUP BY campaign.id, campaign.cycle_start, campaign.cycle_end
      ORDER BY campaign.cycle_end DESC
      LIMIT 1
      `,
        [campaignId],
      );
    if (!rows[0]) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Recertification campaign summary not found',
      );
    }
    return rows[0];
  }
}
