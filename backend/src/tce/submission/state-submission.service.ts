import { Inject, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';

import {
  InMemoryQueueTransport,
  type QueueAdapterResponseStatus,
  type QueueAdapterTransport,
} from '../../common/adapters';
import { DatabaseService } from '../../database/database.service';
import {
  TceRelayMockResponder,
  type TceRelayFiscalReportEnvelope,
  type TceRelayResponsePayload,
} from '../../external/mocks/tce-relay';
import {
  TceQueueAdapter,
  TceSubmissionSqlStateWriter,
  type TceQueueDatabase,
  type TceSubmissionRelayState,
} from '../adapters/queue-adapter';

export const TCE_STATE_SUBMISSION_OPTIONS = 'TCE_STATE_SUBMISSION_OPTIONS';

export type TceStateSubmissionServiceOptions = Readonly<{
  transport?: QueueAdapterTransport;
  responseTimeoutMs?: number;
  retryDelayMs?: (attempt: number) => number;
  now?: () => Date;
  idFactory?: () => string;
}>;

export type SubmitTceStateReportInput = Readonly<{
  tenantId: string;
  submissionId: string;
  report: TceRelayFiscalReportEnvelope;
  requestId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  maxAttempts?: number;
}>;

export type SubmitTceStateReportResult = Readonly<{
  submissionId: string;
  tenantId: string;
  reportType: TceRelayResponsePayload['reportType'];
  stateCode: TceRelayResponsePayload['stateCode'];
  adapterId: string;
  queueStatus: QueueAdapterResponseStatus;
  queueAttempt: number;
  correlationId: string;
  protocol: string;
  status: TceSubmissionRelayState['status'];
  stateAck: TceRelayResponsePayload['stateAck'];
  relay: TceRelayResponsePayload;
  submissionState: TceSubmissionRelayState;
}>;

@Injectable()
export class TceStateSubmissionService implements OnModuleDestroy {
  private readonly relay: TceRelayMockResponder;
  private readonly queueAdapter: TceQueueAdapter;

  constructor(
    databaseService: DatabaseService,
    @Optional()
    @Inject(TCE_STATE_SUBMISSION_OPTIONS)
    options: TceStateSubmissionServiceOptions = {},
  ) {
    const transportOption = ownOption<QueueAdapterTransport>(
      options,
      'transport',
    );
    const transport = isQueueTransport(transportOption)
      ? transportOption
      : new InMemoryQueueTransport();
    const now = ownOption<() => Date>(options, 'now');
    const responseTimeoutMs = ownOption<number>(options, 'responseTimeoutMs');
    const retryDelayMs = ownOption<(attempt: number) => number>(
      options,
      'retryDelayMs',
    );
    const idFactory = ownOption<() => string>(options, 'idFactory');
    this.relay = new TceRelayMockResponder({
      transport,
      now,
    });
    this.queueAdapter = new TceQueueAdapter({
      transport,
      stateWriter: new TceSubmissionSqlStateWriter(
        toTceQueueDatabase(databaseService),
      ),
      responseTimeoutMs,
      retryDelayMs,
      now,
      idFactory,
    });
  }

  async submitStateReport(
    input: SubmitTceStateReportInput,
  ): Promise<SubmitTceStateReportResult> {
    const result = await this.queueAdapter.submitFiscalReport(input);
    return {
      submissionId: result.relay.submissionId,
      tenantId: input.tenantId,
      reportType: result.relay.reportType,
      stateCode: result.relay.stateCode,
      adapterId: result.relay.adapterId,
      queueStatus: result.queueResponse.status,
      queueAttempt: result.queueResponse.attempt,
      correlationId: result.queueResponse['correlation-id'],
      protocol: result.relay.ack.protocol,
      status: result.submissionState.status,
      stateAck: result.relay.stateAck,
      relay: result.relay,
      submissionState: result.submissionState,
    };
  }

  onModuleDestroy(): void {
    this.queueAdapter.close();
    this.relay.close();
  }
}

function toTceQueueDatabase(
  databaseService: DatabaseService,
): TceQueueDatabase {
  return {
    query: async <T = unknown>(sql: string, values?: unknown[]) =>
      (await databaseService.query(sql, values ?? [])) as T[],
  };
}

function ownOption<T>(
  options: TceStateSubmissionServiceOptions,
  key: keyof TceStateSubmissionServiceOptions,
): T | undefined {
  if (!Object.prototype.hasOwnProperty.call(options, key)) {
    return undefined;
  }
  return options[key] as T | undefined;
}

function isQueueTransport(
  transport: QueueAdapterTransport | undefined,
): transport is QueueAdapterTransport {
  return (
    Boolean(transport) &&
    typeof transport?.publish === 'function' &&
    typeof transport?.subscribe === 'function'
  );
}
