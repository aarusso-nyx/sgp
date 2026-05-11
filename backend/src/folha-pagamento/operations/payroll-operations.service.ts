import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import {
  CreateGfipRequestDto,
  CreateRemittanceRequestDto,
  ProcessReturnRequestDto,
} from './payroll-operations.dto';
import { PayrollOperationsRemittanceService } from './payroll-operations-remittance.service';
import { PayrollOperationsReportService } from './payroll-operations-report.service';
import {
  OperationRequestSummary,
  PayrollRunRow,
  RemittanceSummary,
  REPORT_DEFINITIONS,
} from './payroll-operations.types';

export type {
  OperationRequestSummary,
  RemittanceSummary,
} from './payroll-operations.types';

@Injectable()
export class PayrollOperationsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly remittanceService: PayrollOperationsRemittanceService = new PayrollOperationsRemittanceService(
      databaseService,
    ),
    private readonly reportService: PayrollOperationsReportService = new PayrollOperationsReportService(
      databaseService,
    ),
  ) {}

  async listRemittances(
    payrollRunId: string,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<RemittanceSummary>> {
    this.ensureDatabase();
    await this.getPayrollRun(payrollRunId);

    return this.remittanceService.listByPayrollRun(payrollRunId, query);
  }

  async listRemittancesByCompetence(
    competenceYear: number,
    competenceMonth: number,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<RemittanceSummary>> {
    this.ensureDatabase();

    return this.remittanceService.listByCompetence(
      competenceYear,
      competenceMonth,
      query,
    );
  }

  async requestRemittance(
    payrollRunId: string,
    input: CreateRemittanceRequestDto,
  ): Promise<OperationRequestSummary> {
    this.ensureDatabase();
    const run = await this.getPayrollRun(payrollRunId);
    if (run.status !== 'APPROVED') {
      throw new NotFoundException('Approved payroll run not found');
    }

    await this.remittanceService.ensureValidBankAccountsForRemittance(
      input.bankId,
    );
    const nextNumber =
      await this.remittanceService.getNextRemittanceNumber(run);
    const fileName = `remessa_${String(nextNumber).padStart(6, '0')}.txt`;
    const paymentDate =
      input.paymentDate ??
      new Date(Date.UTC(run.competence_year, run.competence_month - 1, 25))
        .toISOString()
        .slice(0, 10);
    const remittanceId = await this.remittanceService.createRemittanceFile(
      payrollRunId,
      run,
      paymentDate,
      fileName,
    );

    const definition = REPORT_DEFINITIONS.remittance;
    const definitionId = await this.reportService.ensureDefinition(
      definition.code,
      definition.name,
      definition.description,
    );
    const request = await this.reportService.createRequest({
      definitionId,
      branchId: run.branch_id,
      payrollRunId,
      processingTypeId: run.processing_type_id,
      competenceYear: run.competence_year,
      competenceMonth: run.competence_month,
      parameters: {
        operation: 'remessa.gerar',
        remittanceId,
        bankId: input.bankId,
        format: input.format ?? 'CNAB240',
        paymentDate,
        launchType: input.launchType ?? 'ACCOUNT_CREDIT',
        remittanceNumber: nextNumber,
        fileName,
      },
    });

    return this.reportService.toRequestSummary(request, {
      remittanceId,
      remittanceNumber: nextNumber,
      fileName,
    });
  }

  async requestReturnProcessing(
    payrollRunId: string,
    input: ProcessReturnRequestDto,
  ): Promise<OperationRequestSummary> {
    this.ensureDatabase();
    const run = await this.getPayrollRun(payrollRunId);
    await this.remittanceService.getRemittance(
      payrollRunId,
      input.remittanceId,
    );
    await this.remittanceService.markDraftAsSent(input.remittanceId);

    const definition = REPORT_DEFINITIONS.returnProcessing;
    const definitionId = await this.reportService.ensureDefinition(
      definition.code,
      definition.name,
      definition.description,
    );
    const request = await this.reportService.createRequest({
      definitionId,
      branchId: run.branch_id,
      payrollRunId,
      processingTypeId: run.processing_type_id,
      competenceYear: run.competence_year,
      competenceMonth: run.competence_month,
      parameters: {
        operation: 'retorno.processar',
        remittanceId: input.remittanceId,
        s3Key: input.s3Key,
        format: input.format ?? 'CNAB240',
        returnFileName: input.returnFileName ?? null,
      },
    });

    return this.reportService.toRequestSummary(request, {
      remittanceId: input.remittanceId,
      s3Key: input.s3Key,
    });
  }

  async requestGfipGeneration(
    input: CreateGfipRequestDto,
  ): Promise<OperationRequestSummary> {
    this.ensureDatabase();

    let run: PayrollRunRow | null = null;
    if (input.payrollRunId) {
      run = await this.getPayrollRun(input.payrollRunId);
    }

    const definition = REPORT_DEFINITIONS.gfip;
    const definitionId = await this.reportService.ensureDefinition(
      definition.code,
      definition.name,
      definition.description,
    );
    const request = await this.reportService.createRequest({
      definitionId,
      branchId: input.branchId ?? run?.branch_id ?? null,
      payrollRunId: input.payrollRunId ?? null,
      processingTypeId: run?.processing_type_id ?? null,
      competenceYear: input.competenceYear,
      competenceMonth: input.competenceMonth,
      parameters: {
        operation: 'gfip.gerada',
        payrollRunId: input.payrollRunId ?? null,
        branchId: input.branchId ?? run?.branch_id ?? null,
        collectionCode: input.collectionCode,
        modality: input.modality,
      },
    });

    return this.reportService.toRequestSummary(request, {
      payrollRunId: input.payrollRunId ?? null,
      branchId: input.branchId ?? run?.branch_id ?? null,
      collectionCode: input.collectionCode,
      modality: input.modality,
    });
  }

  private async getPayrollRun(id: string): Promise<PayrollRunRow> {
    const rows = await this.databaseService.query<PayrollRunRow>(
      `
      SELECT
        id::text,
        branch_id::text,
        processing_type_id::text,
        status::text,
        competence_year,
        competence_month,
        total_net::text
      FROM payroll.payroll_run
      WHERE id = $1::uuid
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Payroll run not found');
    }
    return rows[0];
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for payroll export operations',
      );
    }
  }
}
