import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  CreateContributionTimeCertificateDto,
  GeneratePrevidenciarioOutputDto,
} from '../previdenciario.dto';
import {
  createReportRequest,
  employeeRow,
  ensureDatabase,
  toContributionTimeCertificateSummary,
} from '../previdenciario.shared';
import { ContributionTimeCertificateRow } from '../previdenciario.types';

@Injectable()
export class CtcService {
  constructor(private readonly databaseService: DatabaseService) {}

  async listContributionTimeCertificates() {
    ensureDatabase(this.databaseService);
    const rows =
      await this.databaseService.query<ContributionTimeCertificateRow>(
        `
      SELECT
        certificate.id,
        certificate.employee_id::text,
        employee.registration,
        employee.name AS employee_name,
        certificate.period_start,
        certificate.period_end,
        certificate.issuing_agency,
        certificate.issuance_act,
        certificate.storage_key,
        certificate.issued_at,
        certificate.issued_by_ref
      FROM hr.contribution_time_certificate certificate
      JOIN hr.employee employee ON employee.id = certificate.employee_id
      ORDER BY certificate.issued_at DESC
      `,
      );
    return rows.map((row) => toContributionTimeCertificateSummary(row));
  }

  async createContributionTimeCertificate(
    input: CreateContributionTimeCertificateDto,
  ) {
    ensureDatabase(this.databaseService);
    const employee = await employeeRow(
      this.databaseService,
      input.funcionarioId,
    );
    const rows =
      await this.databaseService.query<ContributionTimeCertificateRow>(
        `
      INSERT INTO hr.contribution_time_certificate (
        employee_id,
        period_start,
        period_end,
        issuing_agency,
        issuance_act,
        storage_key,
        issued_at,
        issued_by_ref
      )
      VALUES (
        $1::uuid,
        $2::date,
        $3::date,
        $4,
        $5,
        NULLIF($6, ''),
        now(),
        NULLIF($7, '')
      )
      RETURNING
        id,
        employee_id::text,
        $8::text AS registration,
        $9::text AS employee_name,
        period_start,
        period_end,
        issuing_agency,
        issuance_act,
        storage_key,
        issued_at,
        issued_by_ref
      `,
        [
          input.funcionarioId,
          input.periodoInicio,
          input.periodoFim,
          input.orgaoEmitente.trim(),
          input.atoEmissao.trim(),
          input.storageKey ?? '',
          input.emitidaPorId ?? '',
          employee.registration,
          employee.name,
        ],
      );
    return toContributionTimeCertificateSummary(rows[0]!);
  }

  async requestContributionTimeCertificateOutput(
    certificateId: string,
    input: GeneratePrevidenciarioOutputDto,
  ) {
    const exists = await this.databaseService.query<QueryResultRow>(
      `SELECT 1 FROM hr.contribution_time_certificate WHERE id = $1::uuid`,
      [certificateId],
    );
    if (!exists[0]) {
      throw new NotFoundException('Contribution time certificate not found');
    }
    return createReportRequest(
      this.databaseService,
      'PREVIDENCIARIO_CTC',
      'Certidao de tempo de contribuicao',
      {
        certificateId,
        format: input.formato ?? 'PDF',
      },
    );
  }
}
