import { createHash } from 'node:crypto';

import {
  SgpQueueAdapter,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterTransport,
} from '../../common/adapters';
import { RequestContextStore } from '../../common/request-context/request-context.store';
import {
  TCE_RELAY_QUEUE_KIND,
  type TceRelayFiscalReportEnvelope,
  type TceRelayKind,
  type TceRelayRequestPayload,
  type TceRelayResponsePayload,
  type TceRelayScenario,
} from '../../external/mocks/tce-relay';
import { domainError } from '../../common/errors/domain-error';

export type TceSubmissionRelayStatus = 'STUB_OK';

export type TceSubmissionRelayState = Readonly<{
  submissionId: string;
  tenantId: string;
  reportType: TceRelayFiscalReportEnvelope['reportType'];
  stateCode: TceRelayFiscalReportEnvelope['target']['stateCode'];
  status: TceSubmissionRelayStatus;
  requestHash: string;
  responseHash: string;
  requestSizeBytes: number;
  responsePayload: TceRelayResponsePayload;
  submittedAt: string;
  responseAt: string;
}>;

export type TceSubmissionStateWriter = Readonly<{
  write(state: TceSubmissionRelayState): Promise<void>;
}>;

export type TceQueueDatabase = Readonly<{
  query<T = unknown>(sql: string, values?: unknown[]): Promise<T[]>;
}>;

export type TceQueueAdapterOptions = Readonly<{
  transport?: QueueAdapterTransport | undefined;
  queue?: SgpQueueAdapter<TceRelayKind> | undefined;
  stateWriter?: TceSubmissionStateWriter | undefined;
  database?: TceQueueDatabase | undefined;
  maxAttempts?: number | undefined;
  responseTimeoutMs?: number | undefined;
  retryDelayMs?: ((attempt: number) => number) | undefined;
  now?: (() => Date) | undefined;
  idFactory?: (() => string) | undefined;
}>;

export type SubmitTceFiscalReportInput = Readonly<{
  tenantId: string;
  submissionId: string;
  report: TceRelayFiscalReportEnvelope;
  scenario?: TceRelayScenario | undefined;
  idempotencyKey?: string | undefined;
  correlationId?: string | undefined;
  requestId?: string | undefined;
  maxAttempts?: number | undefined;
}>;

export type SubmitTceFiscalReportResult = Readonly<{
  queueResponse: QueueAdapterResponseEnvelope<
    TceRelayKind,
    TceRelayResponsePayload
  >;
  relay: TceRelayResponsePayload;
  submissionState: TceSubmissionRelayState;
}>;

const TCE_QUEUE_WORKER_PERMISSIONS = [
  'tce.submission.read',
  'tce.submission.manage',
] as const;

export class TceQueueAdapter {
  private readonly queue: SgpQueueAdapter<TceRelayKind>;
  private readonly ownsQueue: boolean;
  private readonly stateWriter?: TceSubmissionStateWriter | undefined;

  constructor(options: TceQueueAdapterOptions) {
    if (options.queue) {
      this.queue = options.queue;
      this.ownsQueue = false;
    } else {
      if (!options.transport) {
        throw domainError.internal(
          'INTERNAL_INVARIANT',
          'TceQueueAdapter requires either a queue or a queue transport.',
        );
      }
      this.queue = new SgpQueueAdapter({
        kind: TCE_RELAY_QUEUE_KIND,
        transport: options.transport,
        maxAttempts: options.maxAttempts,
        responseTimeoutMs: options.responseTimeoutMs,
        retryDelayMs: options.retryDelayMs,
        now: options.now,
        idFactory: options.idFactory,
      });
      this.ownsQueue = true;
    }
    this.stateWriter =
      options.stateWriter ??
      (options.database
        ? new TceSubmissionSqlStateWriter(options.database)
        : undefined);
  }

  close(): void {
    if (this.ownsQueue) {
      this.queue.close();
    }
  }

  async submitFiscalReport(
    input: SubmitTceFiscalReportInput,
  ): Promise<SubmitTceFiscalReportResult> {
    if (!this.stateWriter) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'TceQueueAdapter requires a state writer or database to persist relay acknowledgement.',
      );
    }
    const payload = this.buildPayload(input);
    const queueResponse = await this.queue.request<
      TceRelayRequestPayload,
      TceRelayResponsePayload
    >({
      tenantId: input.tenantId,
      requestId: input.requestId,
      correlationId: input.correlationId,
      idempotencyKey:
        input.idempotencyKey ??
        `${input.tenantId}:tce:${input.submissionId}:${input.report.idempotencyKey}`,
      maxAttempts: input.maxAttempts,
      payload,
    });

    const relay = queueResponse.payload;
    if (!relay) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'TCE relay returned an OK response without payload.',
      );
    }
    this.assertRelayPayload(input, relay);

    const submissionState = this.buildSubmissionState(
      input,
      payload,
      relay,
      queueResponse,
    );
    await this.stateWriter.write(submissionState);

    return {
      queueResponse,
      relay,
      submissionState,
    };
  }

  private buildPayload(
    input: SubmitTceFiscalReportInput,
  ): TceRelayRequestPayload {
    return {
      submissionId: input.submissionId,
      report: input.report,
      scenario: input.scenario,
    };
  }

  private assertRelayPayload(
    input: SubmitTceFiscalReportInput,
    relay: TceRelayResponsePayload,
  ): void {
    if (relay.submissionId !== input.submissionId) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'TCE relay returned a different submission id.',
      );
    }
    if (relay.reportType !== input.report.reportType) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'TCE relay returned a different report type.',
      );
    }
    if (relay.stateCode !== input.report.target.stateCode) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'TCE relay returned a different state code.',
      );
    }
    if (relay.hashes.evidenceHash !== input.report.evidenceHash) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'TCE relay returned a different evidence hash.',
      );
    }
  }

  private buildSubmissionState(
    input: SubmitTceFiscalReportInput,
    payload: TceRelayRequestPayload,
    relay: TceRelayResponsePayload,
    queueResponse: QueueAdapterResponseEnvelope<
      TceRelayKind,
      TceRelayResponsePayload
    >,
  ): TceSubmissionRelayState {
    const responseHash = hashJson(relay);
    return {
      submissionId: input.submissionId,
      tenantId: input.tenantId,
      reportType: input.report.reportType,
      stateCode: input.report.target.stateCode,
      status: 'STUB_OK',
      requestHash: relay.hashes.reportSha256 || hashJson(payload.report),
      responseHash,
      requestSizeBytes: Buffer.byteLength(JSON.stringify(payload), 'utf8'),
      responsePayload: {
        ...relay,
        ack: {
          ...relay.ack,
          receivedAt: relay.ack.receivedAt || queueResponse['created-at'],
        },
      },
      submittedAt: relay.ack.receivedAt,
      responseAt: queueResponse['created-at'],
    };
  }
}

export class TceSubmissionSqlStateWriter implements TceSubmissionStateWriter {
  constructor(private readonly database: TceQueueDatabase) {}

  async write(state: TceSubmissionRelayState): Promise<void> {
    await RequestContextStore.run(
      {
        tenantId: state.tenantId,
        permissions: [...TCE_QUEUE_WORKER_PERMISSIONS],
        bypassRls: true,
        bypassRlsReason: 'tce-relay-adapter',
      },
      async () => {
        const rows = await this.database.query<{ id: string }>(
          `
          UPDATE tce.submission
          SET status = $2::tce.submission_status,
              envelope_hash = COALESCE(envelope_hash, $3),
              request_size_bytes = $4::int,
              response_payload = $5::jsonb,
              response_hash = $6,
              submitted_at = $7::timestamptz,
              response_at = $8::timestamptz,
              updated_at = now()
          WHERE id = $1::uuid
            AND tenant_id = $9::uuid
          RETURNING id::text
          `,
          [
            state.submissionId,
            state.status,
            state.requestHash,
            state.requestSizeBytes,
            JSON.stringify(state.responsePayload),
            state.responseHash,
            state.submittedAt,
            state.responseAt,
            state.tenantId,
          ],
        );
        if (!rows[0]) {
          throw domainError.internal(
            'INTERNAL_INVARIANT',
            `TCE submission was not updated by relay adapter: ${state.submissionId}`,
          );
        }
      },
    );
  }
}

function hashJson(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value), 'utf8')
    .digest('hex');
}
