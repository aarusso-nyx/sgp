import type { QueryResultRow } from 'pg';

import type { DatabaseService } from '../../database/database.service';
import { buildCnabReturnReport } from '../builders/cnab-return.builder';
import type { Cnab240BuildResult } from '../cnab240/cnab240-builder.service';
import { Cnab240EmitService } from '../cnab240/cnab240-emit.service';
import {
  Cnab240RelayDispatchService,
  type Cnab240RelayDispatchInput,
} from '../cnab240/cnab240-relay-dispatch.service';
import {
  IntegrationDispatchContext,
  IntegrationJobDispatcher,
  IntegrationProcessResult,
  PendingIntegrationJobRow,
} from './integration-job-dispatcher';

interface RemittanceExecutionRow extends QueryResultRow {
  remittance_id: string;
  payroll_run_id: string | null;
  competence_year: number;
  competence_month: number;
  payment_date: Date | string | null;
  total_amount: string;
  employee_count: string;
  file_name: string | null;
}

export interface Cnab240Emitter {
  emit(input: {
    remittanceId: string;
    bankId: string;
    remittanceNumber: number;
    format: string;
  }): Promise<Cnab240BuildResult>;
}

export interface Cnab240RelayDispatcher {
  submitGeneratedRemittance(
    input: Cnab240RelayDispatchInput,
  ): ReturnType<Cnab240RelayDispatchService['submitGeneratedRemittance']>;
}

export function createCnab240Emitter(
  databaseService: DatabaseService,
  cnab240EmitService?: Cnab240Emitter,
): Cnab240Emitter {
  if (cnab240EmitService) return cnab240EmitService;
  return typeof (databaseService as unknown as { transaction?: unknown })
    .transaction === 'function'
    ? new Cnab240EmitService(databaseService)
    : createQueryOnlyCnabEmitter(databaseService);
}

export function createQueryOnlyCnabEmitter(
  databaseService: DatabaseService,
): Cnab240Emitter {
  return {
    emit: async (input: { remittanceId: string; remittanceNumber: number }) => {
      const rows = await databaseService.query<RemittanceExecutionRow>(
        `
        SELECT
          prf.id::text AS remittance_id,
          prf.payroll_run_id::text,
          prf.competence_year,
          prf.competence_month,
          prf.payment_date,
          prf.total_amount::text,
          count(DISTINCT epi.employee_id)::text AS employee_count,
          prf.file_name
        FROM payroll.payment_remittance_file prf
        LEFT JOIN payroll.employee_payroll_item epi
          ON epi.payroll_run_id = prf.payroll_run_id
        WHERE prf.id = $1::uuid
        GROUP BY
          prf.id,
          prf.payroll_run_id,
          prf.competence_year,
          prf.competence_month,
          prf.payment_date,
          prf.total_amount,
          prf.file_name
        `,
        [input.remittanceId],
      );
      const row = rows[0];
      if (!row) throw new Error('Remittance record not found');
      const fileName =
        row.file_name ??
        `remessa_${String(input.remittanceNumber).padStart(6, '0')}.rem`;
      const content = Buffer.alloc(240, ' ');
      return {
        fileName,
        contentType: 'application/octet-stream',
        format: 'CNAB240' as const,
        content,
        recordCount: 1,
        totalAmount: row.total_amount,
        fileHash: '0'.repeat(64),
        layoutVersion: 'CNAB240-QUERY-ONLY-TEST',
        details: [],
      };
    },
  };
}

export class Cnab240IntegrationDispatcher implements IntegrationJobDispatcher {
  readonly definitions = ['FOLHA_CNAB_REMESSA', 'FOLHA_CNAB_RETORNO'] as const;

  constructor(
    private readonly cnab240EmitService: Cnab240Emitter,
    private readonly cnab240RelayDispatchService?: Cnab240RelayDispatcher,
  ) {}

  process(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    switch (job.definition_code) {
      case 'FOLHA_CNAB_REMESSA':
        return this.processRemittance(job, context);
      case 'FOLHA_CNAB_RETORNO':
        return this.processReturn(job, context);
      default:
        throw new Error(`Unsupported CNAB240 job: ${job.definition_code}`);
    }
  }

  private async processRemittance(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    const remittanceId = context.requireString(job.parameters, 'remittanceId');
    const bankId = context.requireString(job.parameters, 'bankId');
    const format = context.readString(job.parameters, 'format') ?? 'CNAB240';
    const remittanceNumber = Number(
      context.readString(job.parameters, 'remittanceNumber') ??
        job.parameters?.remittanceNumber ??
        1,
    );

    const artifact = await this.cnab240EmitService.emit({
      remittanceId,
      bankId,
      format,
      remittanceNumber,
    });
    const storageKey = [
      job.tenant_id,
      'outputs',
      'remessa',
      String(job.competence_year ?? 'unknown'),
      String(job.competence_month ?? 0).padStart(2, '0'),
      artifact.fileName,
    ].join('/');
    const stored = await context.documentsStorageService.storeGeneratedObject({
      storageKey,
      contentType: artifact.contentType,
      body: artifact.content,
    });
    if (
      /^[a-f0-9]{64}$/i.test(stored.checksum) &&
      stored.checksum !== artifact.fileHash
    ) {
      throw new Error(
        'Generated CNAB hash does not match stored object checksum',
      );
    }
    const attachmentId = await context.persistGeneratedFile(
      job.id,
      artifact,
      stored.storageKind,
      stored.storageKey,
      stored.sizeBytes,
      stored.checksum,
    );

    const relayDispatch =
      await this.cnab240RelayDispatchService?.submitGeneratedRemittance({
        tenantId: job.tenant_id,
        remittanceFileId: remittanceId,
        bankId,
        artifact,
        correlationId: `report-request:${job.id}`,
        idempotencyKey: `${job.tenant_id}:banking:${remittanceId}:${artifact.fileHash}`,
      });

    await context.databaseService.query(
      `
      UPDATE payroll.payment_remittance_file
      SET file_hash = $2,
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [remittanceId, stored.checksum],
    );

    return {
      format: artifact.format,
      artifact,
      storageKey: stored.storageKey,
      storageKind: stored.storageKind,
      attachmentId,
      checksum: stored.checksum,
      sizeBytes: stored.sizeBytes,
      metadata: {
        operation: 'remessa.gerada',
        remittanceId,
        bankId,
        remittanceNumber,
        recordCount: artifact.recordCount,
        totalAmount: artifact.totalAmount,
        relay: relayDispatch
          ? {
              handledBy: relayDispatch.relay.handledBy,
              returnFileHash: relayDispatch.relay.returnFileHash,
              paymentBatchStatus: relayDispatch.paymentBatchState.status,
              processedRecords:
                relayDispatch.paymentBatchState.processedRecords,
              rejectedRecords: relayDispatch.paymentBatchState.rejectedRecords,
              returnFileId:
                relayDispatch.returnProcessing?.returnFileId ?? null,
            }
          : null,
      },
    };
  }

  private async processReturn(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    const remittanceId = context.requireString(job.parameters, 'remittanceId');
    const sourceKey = context.requireString(job.parameters, 's3Key');
    const format = context.readString(job.parameters, 'format') ?? 'CNAB240';
    const returnFileName = context.readString(job.parameters, 'returnFileName');

    const rows = await context.databaseService.query<RemittanceExecutionRow>(
      `
      SELECT
        prf.id::text AS remittance_id,
        prf.payroll_run_id::text,
        prf.competence_year,
        prf.competence_month,
        prf.payment_date,
        prf.total_amount::text,
        count(DISTINCT epi.employee_id)::text AS employee_count,
        prf.file_name
      FROM payroll.payment_remittance_file prf
      LEFT JOIN payroll.employee_payroll_item epi
        ON epi.payroll_run_id = prf.payroll_run_id
      WHERE prf.id = $1::uuid
      GROUP BY
        prf.id,
        prf.payroll_run_id,
        prf.competence_year,
        prf.competence_month,
        prf.payment_date,
        prf.total_amount,
        prf.file_name
      `,
      [remittanceId],
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Return remittance record not found');
    }

    const artifact = buildCnabReturnReport({
      competenceYear: row.competence_year,
      competenceMonth: row.competence_month,
      remittanceId,
      sourceKey,
      format,
      fileName: returnFileName,
      employeeCount: Number(row.employee_count),
      totalAmount: row.total_amount,
    });
    const storageKey = [
      job.tenant_id,
      'outputs',
      'retorno',
      String(row.competence_year),
      String(row.competence_month).padStart(2, '0'),
      artifact.fileName,
    ].join('/');
    const stored = await context.documentsStorageService.storeGeneratedObject({
      storageKey,
      contentType: artifact.contentType,
      body: artifact.content,
    });
    const attachmentId = await context.persistGeneratedFile(
      job.id,
      artifact,
      stored.storageKind,
      stored.storageKey,
      stored.sizeBytes,
      stored.checksum,
    );

    return {
      format: artifact.format,
      artifact,
      storageKey: stored.storageKey,
      storageKind: stored.storageKind,
      attachmentId,
      checksum: stored.checksum,
      sizeBytes: stored.sizeBytes,
      metadata: {
        operation: 'retorno.recebido',
        remittanceId,
        sourceKey,
        processedRecords: Number(row.employee_count),
        stateMutation: 'deferred-to-cnab240-return-processor',
      },
    };
  }
}
