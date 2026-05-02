import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import { CertificateStoreService } from '../certificate-store/certificate-store.service';
import {
  BatchBuilderService,
  SubmissionBatchWorkItem,
} from './batch-builder.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RetryDecision, RetryStrategyService } from './retry-strategy.service';
import {
  SoapBatchResult,
  SoapClientService,
  SoapSubmissionException,
} from './soap-client.service';

export interface SubmissionRunResult {
  batchId: string;
  tenantId: string;
  eventCount: number;
  status: 'ACCEPTED' | 'RETRY' | 'TIMEOUT' | 'REJECTED';
  attempts: number;
  endpointUrl: string;
}

export interface SubmissionBatchDto {
  batchId: string;
  environment: string;
  endpointUrl: string;
  eventIds: string[];
  soapRequestHash: string | null;
  soapResponseHash: string | null;
  httpStatus: number | null;
  status: string;
  attempts: number;
  nextAttemptAt: string | null;
  sentAt: string | null;
  responseAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CircuitStateDto {
  endpointUrl: string;
  openedAt: string | null;
  lastFailureAt: string | null;
  failureCount: number;
  state: string;
}

interface BatchListRow extends QueryResultRow {
  batch_id: string;
  environment: string;
  endpoint_url: string;
  event_ids: string[];
  soap_request_hash: string | null;
  soap_response_hash: string | null;
  http_status: number | null;
  status: string;
  attempts: number;
  next_attempt_at: Date | string | null;
  sent_at: Date | string | null;
  response_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CircuitRow extends QueryResultRow {
  endpoint_url: string;
  opened_at: Date | string | null;
  last_failure_at: Date | string | null;
  failure_count: number;
  state: string;
}

const SUBMISSION_WORKER_PERMISSIONS = [
  'esocial.event.read',
  'esocial.event.write',
  'esocial.submission.read',
  'esocial.submission.retry',
  'esocial.certificate.read',
] as const;

@Injectable()
export class SubmissionService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly certificateStore: CertificateStoreService,
    private readonly batchBuilder: BatchBuilderService,
    private readonly soapClient: SoapClientService,
    private readonly retryStrategy: RetryStrategyService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async submitPendingBatch(
    limit?: number,
  ): Promise<SubmissionRunResult | null> {
    return RequestContextStore.run(
      { bypassRls: true, bypassRlsReason: 'esocial-worker' },
      async () => {
        const batch = await this.batchBuilder.nextBatch(limit);
        if (!batch) return null;
        return this.submitBatch(batch);
      },
    );
  }

  async listBatches(): Promise<SubmissionBatchDto[]> {
    const rows = await this.databaseService.query<BatchListRow>(
      `
      SELECT
        batch_id::text,
        environment::text,
        endpoint_url,
        event_ids::text[],
        soap_request_hash,
        soap_response_hash,
        http_status,
        status::text,
        attempts,
        next_attempt_at,
        sent_at,
        response_at,
        created_at,
        updated_at
      FROM esocial.submission_batch
      ORDER BY created_at DESC
      LIMIT 100
      `,
    );
    return rows.map(mapBatch);
  }

  async listCircuitStates(): Promise<CircuitStateDto[]> {
    const rows = await this.circuitBreaker.list();
    return rows.map((row) => mapCircuit(row as CircuitRow));
  }

  async forceRetry(batchId: string): Promise<SubmissionBatchDto> {
    const rows = await this.databaseService.query<BatchListRow>(
      `
      UPDATE esocial.submission_batch
      SET status = 'RETRY'::esocial.submission_batch_status,
          next_attempt_at = now(),
          updated_at = now()
      WHERE batch_id = $1::uuid
      RETURNING
        batch_id::text,
        environment::text,
        endpoint_url,
        event_ids::text[],
        soap_request_hash,
        soap_response_hash,
        http_status,
        status::text,
        attempts,
        next_attempt_at,
        sent_at,
        response_at,
        created_at,
        updated_at
      `,
      [batchId],
    );
    if (!rows[0]) {
      throw new ServiceUnavailableException(
        'Submission batch is not available for retry in the current tenant',
      );
    }
    return mapBatch(rows[0]);
  }

  private async submitBatch(
    batch: SubmissionBatchWorkItem,
  ): Promise<SubmissionRunResult> {
    try {
      await this.withWorkerBypassTenant(batch.tenantId, () =>
        this.circuitBreaker.assertCanSend(batch.endpointUrl),
      );
    } catch (error) {
      await this.markCircuitBlocked(batch, error);
      return {
        batchId: batch.batchId,
        tenantId: batch.tenantId,
        eventCount: batch.eventIds.length,
        status: 'RETRY',
        attempts: batch.attempts,
        endpointUrl: batch.endpointUrl,
      };
    }

    const certificate = await this.withTenantCertificateContext(
      batch.tenantId,
      () => this.certificateStore.activeCertificate(),
    );

    try {
      const result = await this.soapClient.sendBatch({
        endpointUrl: batch.endpointUrl,
        batchXml: batch.batchXml,
        pkcs12: certificate.pkcs12,
      });
      await this.markAccepted(batch, result);
      await this.withWorkerBypassTenant(batch.tenantId, () =>
        this.circuitBreaker.recordSuccess(batch.endpointUrl),
      );
      return {
        batchId: batch.batchId,
        tenantId: batch.tenantId,
        eventCount: batch.eventIds.length,
        status: 'ACCEPTED',
        attempts: batch.attempts + 1,
        endpointUrl: batch.endpointUrl,
      };
    } catch (error) {
      const decision = this.retryStrategy.classify(error);
      await this.markFailed(batch, error, decision);
      if (decision.countsForCircuit) {
        await this.withWorkerBypassTenant(batch.tenantId, () =>
          this.circuitBreaker.recordFailure(batch.endpointUrl),
        );
      }
      return {
        batchId: batch.batchId,
        tenantId: batch.tenantId,
        eventCount: batch.eventIds.length,
        status: decision.status,
        attempts: batch.attempts + 1,
        endpointUrl: batch.endpointUrl,
      };
    }
  }

  private async markAccepted(
    batch: SubmissionBatchWorkItem,
    result: SoapBatchResult,
  ): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `
        UPDATE esocial.submission_batch
        SET status = 'ACCEPTED'::esocial.submission_batch_status,
            attempts = attempts + 1,
            soap_request_hash = $3,
            soap_response_hash = $4,
            http_status = $5,
            sent_at = coalesce(sent_at, now()),
            response_at = now(),
            next_attempt_at = NULL,
            updated_at = now()
        WHERE tenant_id = $1::uuid
          AND batch_id = $2::uuid
        `,
        [
          batch.tenantId,
          batch.batchId,
          this.soapClient.sha256(result.soapRequest),
          this.soapClient.sha256(result.soapResponse),
          result.httpStatus,
        ],
      );
      await client.query(
        `
        UPDATE public.esocial_event
        SET status = 'AGUARDANDO_RETORNO'::public."ESocialEventStatus",
            protocol_number = coalesce(protocol_number, $3),
            updated_at = now()
        WHERE tenant_id = $1::uuid
          AND id = ANY($2::uuid[])
        `,
        [
          batch.tenantId,
          batch.eventIds,
          protocolFromResponse(result.soapResponse),
        ],
      );
    });
  }

  private async markFailed(
    batch: SubmissionBatchWorkItem,
    error: unknown,
    decision: RetryDecision,
  ): Promise<void> {
    const exception = error instanceof SoapSubmissionException ? error : null;
    const nextAttemptAt = decision.transient
      ? this.retryStrategy.nextAttemptAt(batch.attempts + 1).toISOString()
      : null;
    const eventStatus = decision.transient
      ? 'ERRO_TECNICO_RETENTAVEL'
      : 'ERRO_DEFINITIVO';
    await this.databaseService.transaction(async (client) => {
      await client.query(
        `
        UPDATE esocial.submission_batch
        SET status = $3::esocial.submission_batch_status,
            attempts = attempts + 1,
            soap_request_hash = $4,
            soap_response_hash = $5,
            http_status = $6,
            sent_at = coalesce(sent_at, now()),
            response_at = now(),
            next_attempt_at = $7::timestamptz,
            updated_at = now()
        WHERE tenant_id = $1::uuid
          AND batch_id = $2::uuid
        `,
        [
          batch.tenantId,
          batch.batchId,
          decision.status,
          this.hashNullable(exception?.soapRequest),
          this.hashNullable(exception?.soapResponse || decision.reason),
          decision.httpStatus,
          nextAttemptAt,
        ],
      );
      await client.query(
        `
        UPDATE public.esocial_event
        SET status = $3::public."ESocialEventStatus",
            retry_count = retry_count + 1,
            last_error_code = 'ESOCIAL_SUBMISSION',
            last_error_message = $4,
            updated_at = now()
        WHERE tenant_id = $1::uuid
          AND id = ANY($2::uuid[])
        `,
        [
          batch.tenantId,
          batch.eventIds,
          eventStatus,
          decision.reason.slice(0, 1000),
        ],
      );
    });
  }

  private async markCircuitBlocked(
    batch: SubmissionBatchWorkItem,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    const nextAttemptAt = this.retryStrategy
      .nextAttemptAt(batch.attempts + 1)
      .toISOString();
    await this.databaseService.query(
      `
      UPDATE esocial.submission_batch
      SET status = 'RETRY'::esocial.submission_batch_status,
          next_attempt_at = $3::timestamptz,
          updated_at = now()
      WHERE tenant_id = $1::uuid
        AND batch_id = $2::uuid
      `,
      [batch.tenantId, batch.batchId, nextAttemptAt],
    );
    await this.databaseService.query(
      `
      UPDATE public.esocial_event
      SET status = 'ERRO_TECNICO_RETENTAVEL'::public."ESocialEventStatus",
          last_error_code = 'ESOCIAL_CIRCUIT_OPEN',
          last_error_message = $3,
          updated_at = now()
      WHERE tenant_id = $1::uuid
        AND id = ANY($2::uuid[])
      `,
      [batch.tenantId, batch.eventIds, message.slice(0, 1000)],
    );
  }

  private withTenantCertificateContext<T>(
    tenantId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return RequestContextStore.run(
      {
        tenantId,
        permissions: [...SUBMISSION_WORKER_PERMISSIONS],
      },
      fn,
    );
  }

  private withWorkerBypassTenant<T>(
    tenantId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    return RequestContextStore.run(
      {
        tenantId,
        permissions: [...SUBMISSION_WORKER_PERMISSIONS],
        bypassRls: true,
        bypassRlsReason: 'esocial-worker',
      },
      fn,
    );
  }

  private hashNullable(value: string | undefined): string | null {
    if (!value) return null;
    return this.soapClient.sha256(value);
  }
}

function mapBatch(row: BatchListRow): SubmissionBatchDto {
  return {
    batchId: row.batch_id,
    environment: row.environment,
    endpointUrl: row.endpoint_url,
    eventIds: row.event_ids,
    soapRequestHash: row.soap_request_hash,
    soapResponseHash: row.soap_response_hash,
    httpStatus: row.http_status,
    status: row.status,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at
      ? new Date(row.next_attempt_at).toISOString()
      : null,
    sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
    responseAt: row.response_at
      ? new Date(row.response_at).toISOString()
      : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapCircuit(row: CircuitRow): CircuitStateDto {
  return {
    endpointUrl: row.endpoint_url,
    openedAt: row.opened_at ? new Date(row.opened_at).toISOString() : null,
    lastFailureAt: row.last_failure_at
      ? new Date(row.last_failure_at).toISOString()
      : null,
    failureCount: row.failure_count,
    state: row.state,
  };
}

function protocolFromResponse(response: string): string | null {
  return (
    response.match(/<protocoloEnvio>([^<]+)<\/protocoloEnvio>/)?.[1] ??
    response.match(/<nrRecibo>([^<]+)<\/nrRecibo>/)?.[1] ??
    null
  );
}
