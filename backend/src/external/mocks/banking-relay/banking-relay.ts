import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  adapterQueueTopics,
  type QueueAdapterErrorEnvelope,
  type QueueAdapterRequestEnvelope,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterTransport,
  type QueueSubscription,
} from '../../../common/adapters';
import {
  BANKING_RELAY_BANKS,
  BANKING_RELAY_KIND,
  type BankingRelayBankCode,
  type BankingRelayRequestPayload,
  type BankingRelayResponsePayload,
  normalizeBankingRelayBankCode,
} from './types';
import { domainError } from '../../../common/errors/domain-error';

const RECORD_SIZE = 240;

type RemittanceDetailRecord = Readonly<{
  sequence: number;
  employeeIdField: string;
  amountCents: string;
}>;

type ReturnFixtureTemplate = Readonly<{
  prefix: readonly string[];
  details: readonly string[];
  suffix: readonly string[];
}>;

export type BankingRelayMockResponderOptions = Readonly<{
  transport: QueueAdapterTransport;
  fixturesRoot?: string | undefined;
  concurrency?: number | undefined;
  now?: (() => Date) | undefined;
}>;

export class BankingRelayMockResponder {
  private readonly transport: QueueAdapterTransport;
  private readonly fixturesRoot: string;
  private readonly now: () => Date;
  private readonly subscription: QueueSubscription;
  private readonly templates = new Map<
    BankingRelayBankCode,
    ReturnFixtureTemplate
  >();

  constructor(options: BankingRelayMockResponderOptions) {
    this.transport = options.transport;
    this.fixturesRoot =
      options.fixturesRoot ??
      join(process.cwd(), 'tests/backend/golden/cnab240/return');
    this.now = options.now ?? (() => new Date());
    this.subscription = this.transport.subscribe<
      QueueAdapterRequestEnvelope<
        typeof BANKING_RELAY_KIND,
        BankingRelayRequestPayload
      >
    >(
      adapterQueueTopics(BANKING_RELAY_KIND).request,
      (request) => this.handleRequest(request),
      { concurrency: options.concurrency ?? 4 },
    );
  }

  close(): void {
    this.subscription.unsubscribe();
  }

  private async handleRequest(
    request: QueueAdapterRequestEnvelope<
      typeof BANKING_RELAY_KIND,
      BankingRelayRequestPayload
    >,
  ): Promise<void> {
    const response = this.buildResponseEnvelope(request);
    await this.transport.publish(request['reply-to'], response);
  }

  private buildResponseEnvelope(
    request: QueueAdapterRequestEnvelope<
      typeof BANKING_RELAY_KIND,
      BankingRelayRequestPayload
    >,
  ): QueueAdapterResponseEnvelope<
    typeof BANKING_RELAY_KIND,
    BankingRelayResponsePayload
  > {
    try {
      const payload = this.buildReturnPayload(request.payload);
      return {
        'request-id': request['request-id'],
        'correlation-id': request['correlation-id'],
        'created-at': this.now().toISOString(),
        tenant_id: request.tenant_id,
        kind: request.kind,
        status: 'OK',
        attempt: request.attempt,
        payload,
      };
    } catch (error) {
      return {
        'request-id': request['request-id'],
        'correlation-id': request['correlation-id'],
        'created-at': this.now().toISOString(),
        tenant_id: request.tenant_id,
        kind: request.kind,
        status: 'DEAD_LETTER',
        attempt: request.attempt,
        error: this.toErrorEnvelope(error),
      };
    }
  }

  private buildReturnPayload(
    payload: BankingRelayRequestPayload,
  ): BankingRelayResponsePayload {
    const remittanceContent = Buffer.from(payload.contentBase64, 'base64');
    const remittanceHash = sha256(remittanceContent);
    if (remittanceHash !== payload.remittanceFileHash) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Banking relay remittance hash does not match content.',
      );
    }

    const bankCode = normalizeBankingRelayBankCode(
      payload.bankCode || remittanceContent.subarray(0, 3).toString('ascii'),
    );
    const remittanceDetails = extractRemittanceDetails(remittanceContent);
    if (remittanceDetails.length === 0) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Banking relay received CNAB240 remittance without segment A records.',
      );
    }

    const template = this.loadTemplate(bankCode);
    const returnContent = buildReturnContent(
      bankCode,
      template,
      remittanceDetails,
    );
    const returnFileHash = sha256(returnContent);

    return {
      format: 'CNAB240',
      bankCode,
      remittanceFileId: payload.remittanceFileId,
      remittanceFileName: payload.remittanceFileName,
      remittanceFileHash: remittanceHash,
      returnFileName: `retorno_${bankCode}_${remittanceHash.slice(0, 12)}.ret`,
      returnFileHash,
      retornoContentBase64: returnContent.toString('base64'),
      recordCount: returnContent.byteLength / RECORD_SIZE,
      handledBy: 'banking-relay-mock',
    };
  }

  private loadTemplate(bankCode: BankingRelayBankCode): ReturnFixtureTemplate {
    const cached = this.templates.get(bankCode);
    if (cached) return cached;

    const slug = BANKING_RELAY_BANKS[bankCode];
    const fixturePath = join(this.fixturesRoot, slug, 'expected.ret');
    if (!existsSync(fixturePath)) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        `CNAB240 return fixture not found: ${fixturePath}`,
      );
    }

    const lines = splitRecords(readFileSync(fixturePath));
    const firstDetailIndex = lines.findIndex(isSegmentA);
    const lastDetailIndex = findLastIndex(lines, isSegmentA);
    if (firstDetailIndex < 0 || lastDetailIndex < firstDetailIndex) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        `CNAB240 return fixture has no segment A records: ${fixturePath}`,
      );
    }

    const template = {
      prefix: lines.slice(0, firstDetailIndex),
      details: lines.slice(firstDetailIndex, lastDetailIndex + 1),
      suffix: lines.slice(lastDetailIndex + 1),
    } satisfies ReturnFixtureTemplate;
    this.templates.set(bankCode, template);
    return template;
  }

  private toErrorEnvelope(error: unknown): QueueAdapterErrorEnvelope {
    return {
      kind: 'DEFINITIVE',
      code: 'BANKING_RELAY_REJECTED',
      message:
        error instanceof Error
          ? error.message
          : 'Banking relay rejected the remittance.',
    };
  }
}

function buildReturnContent(
  bankCode: BankingRelayBankCode,
  template: ReturnFixtureTemplate,
  remittanceDetails: readonly RemittanceDetailRecord[],
): Buffer {
  const detailLines = remittanceDetails.map((detail, index) => {
    const fixtureDetail = template.details[index % template.details.length];
    if (!fixtureDetail) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'CNAB240 return fixture has no reusable detail record.',
      );
    }

    return patchFields(fixtureDetail, [
      [1, bankCode],
      [9, String(detail.sequence).padStart(5, '0')],
      [74, detail.employeeIdField.padEnd(20, ' ').slice(0, 20)],
      [120, detail.amountCents.padStart(15, '0').slice(-15)],
      [231, fixtureDetail.slice(230, 235).padEnd(5, ' ').slice(0, 5)],
    ]);
  });

  const lines = [
    ...template.prefix.map((line) => patchFields(line, [[1, bankCode]])),
    ...detailLines,
    ...template.suffix.map((line) => patchFields(line, [[1, bankCode]])),
  ];
  return Buffer.from(lines.join(''), 'ascii');
}

function extractRemittanceDetails(content: Buffer): RemittanceDetailRecord[] {
  return splitRecords(content)
    .filter(isSegmentA)
    .map((line) => ({
      sequence: Number(line.slice(8, 13)),
      employeeIdField: line.slice(73, 93),
      amountCents: line.slice(119, 134),
    }))
    .filter(
      (detail) => Number.isInteger(detail.sequence) && detail.sequence > 0,
    );
}

function splitRecords(content: Buffer): string[] {
  if (content.byteLength === 0 || content.byteLength % RECORD_SIZE !== 0) {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      'CNAB240 content must contain fixed 240-byte records.',
    );
  }

  const lines: string[] = [];
  for (let offset = 0; offset < content.byteLength; offset += RECORD_SIZE) {
    lines.push(
      content.subarray(offset, offset + RECORD_SIZE).toString('ascii'),
    );
  }
  return lines;
}

function isSegmentA(line: string): boolean {
  return line.slice(7, 8) === '3' && line.slice(13, 14) === 'A';
}

function patchFields(
  line: string,
  fields: ReadonlyArray<readonly [number, string]>,
): string {
  const chars = Array.from(line.padEnd(RECORD_SIZE, ' ').slice(0, RECORD_SIZE));
  for (const [start, value] of fields) {
    const offset = start - 1;
    for (let index = 0; index < value.length; index += 1) {
      chars[offset + index] = value[index] ?? ' ';
    }
  }
  return chars.join('');
}

function findLastIndex<T>(
  values: readonly T[],
  predicate: (value: T) => boolean,
): number {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== undefined && predicate(value)) return index;
  }
  return -1;
}

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}
