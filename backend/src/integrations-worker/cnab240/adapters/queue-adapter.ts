import { createHash } from 'node:crypto';

import {
  SgpQueueAdapter,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterTransport,
} from '../../../common/adapters';
import {
  BANKING_RELAY_KIND,
  type BankingRelayBankCode,
  type BankingRelayRequestPayload,
  type BankingRelayResponsePayload,
  normalizeBankingRelayBankCode,
} from '../../../external/mocks/banking-relay';
import type { Cnab240BuildResult } from '../cnab240-builder.service';
import {
  Cnab240ReturnParserService,
  type ParsedCnab240Return,
} from '../return/cnab240-return-parser.service';
import {
  OccurrenceMapperService,
  type Cnab240ReturnInternalStatus,
} from '../return/occurrence-mapper.service';
import { domainError } from '../../../common/errors/domain-error';

export type BankingPaymentBatchStateStatus = 'PAID' | 'RETURNED' | 'REJECTED';

export type BankingPaymentBatchStateDetail = Readonly<{
  sequence: number;
  employeeId: string;
  amount: string;
  occurrenceCode: string;
  internalStatus: Cnab240ReturnInternalStatus;
}>;

export type BankingPaymentBatchState = Readonly<{
  remittanceFileId: string;
  returnFileId: string | null;
  bankCode: BankingRelayBankCode;
  status: BankingPaymentBatchStateStatus;
  remittanceFileHash: string;
  returnFileHash: string;
  processedRecords: number;
  rejectedRecords: number;
  details: readonly BankingPaymentBatchStateDetail[];
}>;

export type BankingCnab240ReturnProcessingInput = Readonly<{
  remittanceFileId: string;
  content: string;
  encoding: 'base64';
  remittanceFileHash: string;
  processedBy?: string | null | undefined;
}>;

export type BankingCnab240ReturnProcessingResult = Readonly<{
  returnFileId: string;
  remittanceFileId: string;
  bankCode: number;
  fileHash: string;
  processedRecords: number;
  rejectedRecords: number;
}>;

export type BankingCnab240ReturnProcessor = Readonly<{
  process(
    input: BankingCnab240ReturnProcessingInput,
  ): Promise<BankingCnab240ReturnProcessingResult>;
}>;

export type BankingPaymentBatchStateWriter = Readonly<{
  write(state: BankingPaymentBatchState): Promise<void>;
}>;

export type BankingQueueDatabase = Readonly<{
  query<T = unknown>(sql: string, values?: unknown[]): Promise<T[]>;
}>;

export type BankingCnab240QueueAdapterOptions = Readonly<{
  transport: QueueAdapterTransport;
  returnProcessor?: BankingCnab240ReturnProcessor | undefined;
  paymentBatchStateWriter?: BankingPaymentBatchStateWriter | undefined;
  parser?: Cnab240ReturnParserService | undefined;
  mapper?: OccurrenceMapperService | undefined;
  maxAttempts?: number | undefined;
  responseTimeoutMs?: number | undefined;
  retryDelayMs?: ((attempt: number) => number) | undefined;
  now?: (() => Date) | undefined;
  idFactory?: (() => string) | undefined;
}>;

export type SubmitBankingRemittanceInput = Readonly<{
  tenantId: string;
  remittanceFileId: string;
  artifact: Cnab240BuildResult;
  bankCode?: string | number | undefined;
  processedBy?: string | null | undefined;
  idempotencyKey?: string | undefined;
  correlationId?: string | undefined;
  requestId?: string | undefined;
  maxAttempts?: number | undefined;
}>;

export type SubmitBankingRemittanceResult = Readonly<{
  queueResponse: QueueAdapterResponseEnvelope<
    typeof BANKING_RELAY_KIND,
    BankingRelayResponsePayload
  >;
  relay: BankingRelayResponsePayload;
  parsedReturn: ParsedCnab240Return;
  returnProcessing: BankingCnab240ReturnProcessingResult | null;
  paymentBatchState: BankingPaymentBatchState;
}>;

export class BankingCnab240QueueAdapter {
  private readonly queue: SgpQueueAdapter<typeof BANKING_RELAY_KIND>;
  private readonly returnProcessor?: BankingCnab240ReturnProcessor | undefined;
  private readonly paymentBatchStateWriter?:
    | BankingPaymentBatchStateWriter
    | undefined;
  private readonly parser: Cnab240ReturnParserService;
  private readonly mapper: OccurrenceMapperService;

  constructor(options: BankingCnab240QueueAdapterOptions) {
    this.queue = new SgpQueueAdapter({
      kind: BANKING_RELAY_KIND,
      transport: options.transport,
      maxAttempts: options.maxAttempts,
      responseTimeoutMs: options.responseTimeoutMs,
      retryDelayMs: options.retryDelayMs,
      now: options.now,
      idFactory: options.idFactory,
    });
    this.returnProcessor = options.returnProcessor;
    this.paymentBatchStateWriter = options.paymentBatchStateWriter;
    this.parser = options.parser ?? new Cnab240ReturnParserService();
    this.mapper = options.mapper ?? new OccurrenceMapperService();
  }

  close(): void {
    this.queue.close();
  }

  async submitRemittance(
    input: SubmitBankingRemittanceInput,
  ): Promise<SubmitBankingRemittanceResult> {
    const remittanceFileHash = hashBuffer(input.artifact.content);
    if (remittanceFileHash !== input.artifact.fileHash) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'CNAB240 artifact hash does not match artifact content.',
      );
    }

    const bankCode = this.resolveBankCode(input);
    const payload = this.buildPayload(input, bankCode, remittanceFileHash);
    const queueResponse = await this.queue.request<
      BankingRelayRequestPayload,
      BankingRelayResponsePayload
    >({
      tenantId: input.tenantId,
      requestId: input.requestId,
      correlationId: input.correlationId,
      idempotencyKey:
        input.idempotencyKey ??
        `${input.tenantId}:banking:${input.remittanceFileId}:${remittanceFileHash}`,
      maxAttempts: input.maxAttempts,
      payload,
    });

    const relay = queueResponse.payload;
    if (!relay) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Banking relay returned an OK response without payload.',
      );
    }
    this.assertRelayPayload(input, relay, bankCode, remittanceFileHash);

    const parsedReturn = this.parser.parse(
      Buffer.from(relay.retornoContentBase64, 'base64'),
    );
    if (parsedReturn.fileHash !== relay.returnFileHash) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Banking relay return hash does not match retorno bytes.',
      );
    }

    const returnProcessing = this.returnProcessor
      ? await this.returnProcessor.process({
          remittanceFileId: input.remittanceFileId,
          remittanceFileHash,
          content: relay.retornoContentBase64,
          encoding: 'base64',
          processedBy: input.processedBy ?? null,
        })
      : null;
    const paymentBatchState = this.buildPaymentBatchState(
      input,
      relay,
      parsedReturn,
      returnProcessing,
    );

    await this.paymentBatchStateWriter?.write(paymentBatchState);

    return {
      queueResponse,
      relay,
      parsedReturn,
      returnProcessing,
      paymentBatchState,
    };
  }

  private buildPayload(
    input: SubmitBankingRemittanceInput,
    bankCode: BankingRelayBankCode,
    remittanceFileHash: string,
  ): BankingRelayRequestPayload {
    return {
      format: 'CNAB240',
      remittanceFileId: input.remittanceFileId,
      remittanceFileName: input.artifact.fileName,
      remittanceFileHash,
      bankCode,
      contentBase64: input.artifact.content.toString('base64'),
      details: input.artifact.details,
    };
  }

  private resolveBankCode(
    input: SubmitBankingRemittanceInput,
  ): BankingRelayBankCode {
    const explicitBankCode = input.bankCode;
    if (explicitBankCode !== undefined) {
      return normalizeBankingRelayBankCode(explicitBankCode);
    }

    const firstDetail = input.artifact.details[0];
    if (firstDetail) {
      return normalizeBankingRelayBankCode(firstDetail.bankCode);
    }
    return normalizeBankingRelayBankCode(
      input.artifact.content.subarray(0, 3).toString('ascii'),
    );
  }

  private assertRelayPayload(
    input: SubmitBankingRemittanceInput,
    relay: BankingRelayResponsePayload,
    bankCode: BankingRelayBankCode,
    remittanceFileHash: string,
  ): void {
    if (relay.bankCode !== bankCode) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Banking relay returned a different bank code.',
      );
    }
    if (relay.remittanceFileId !== input.remittanceFileId) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Banking relay returned a different remittance id.',
      );
    }
    if (relay.remittanceFileHash !== remittanceFileHash) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Banking relay returned a different remittance hash.',
      );
    }
  }

  private buildPaymentBatchState(
    input: SubmitBankingRemittanceInput,
    relay: BankingRelayResponsePayload,
    parsedReturn: ParsedCnab240Return,
    returnProcessing: BankingCnab240ReturnProcessingResult | null,
  ): BankingPaymentBatchState {
    const detailsBySequence = new Map(
      input.artifact.details.map((detail) => [detail.sequence, detail]),
    );
    const details = parsedReturn.details.map((parsedDetail) => {
      const remittanceDetail = detailsBySequence.get(parsedDetail.sequence);
      const mapping = this.mapper.map(
        parsedDetail.bankCode,
        parsedDetail.occurrenceCode,
      );
      if (remittanceDetail && remittanceDetail.amount !== parsedDetail.amount) {
        throw domainError.internal(
          'INTERNAL_INVARIANT',
          `Banking relay return amount mismatch at sequence ${parsedDetail.sequence}.`,
        );
      }

      return {
        sequence: parsedDetail.sequence,
        employeeId: remittanceDetail?.employeeId ?? parsedDetail.employeeId,
        amount: parsedDetail.amount,
        occurrenceCode: parsedDetail.occurrenceCode,
        internalStatus: mapping.internalStatus,
      } satisfies BankingPaymentBatchStateDetail;
    });
    const derivedRejectedRecords = details.filter(
      (detail) => detail.internalStatus !== 'ACCEPTED',
    ).length;
    const rejectedRecords =
      returnProcessing?.rejectedRecords ?? derivedRejectedRecords;
    const processedRecords =
      returnProcessing?.processedRecords ?? parsedReturn.details.length;

    return {
      remittanceFileId: input.remittanceFileId,
      returnFileId: returnProcessing?.returnFileId ?? null,
      bankCode: relay.bankCode,
      status: toPaymentBatchStatus(processedRecords, rejectedRecords),
      remittanceFileHash: relay.remittanceFileHash,
      returnFileHash: relay.returnFileHash,
      processedRecords,
      rejectedRecords,
      details,
    };
  }
}

export class PayrollPaymentBatchStateSqlWriter implements BankingPaymentBatchStateWriter {
  constructor(private readonly database: BankingQueueDatabase) {}

  async write(state: BankingPaymentBatchState): Promise<void> {
    await this.database.query(
      `
      UPDATE payroll.payment_remittance_file
      SET status = $2::"PaymentRemittanceStatus",
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [state.remittanceFileId, state.status],
    );

    if (state.status === 'PAID') {
      await this.database.query(
        `
        UPDATE payroll.payroll_run
        SET status = 'PAID'::"PayrollRunStatus",
            updated_at = now()
        WHERE id = (
          SELECT payroll_run_id
          FROM payroll.payment_remittance_file
          WHERE id = $1::uuid
            AND payroll_run_id IS NOT NULL
        )
        `,
        [state.remittanceFileId],
      );
    }
  }
}

function toPaymentBatchStatus(
  processedRecords: number,
  rejectedRecords: number,
): BankingPaymentBatchStateStatus {
  if (processedRecords > 0 && rejectedRecords === 0) return 'PAID';
  if (processedRecords > 0 && rejectedRecords === processedRecords) {
    return 'REJECTED';
  }
  return 'RETURNED';
}

function hashBuffer(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
