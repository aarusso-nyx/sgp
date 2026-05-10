import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { domainError } from '../../common/errors/domain-error';
import { RequestContextStore } from '../../common/request-context/request-context.store';
import {
  EsocialEventsService,
  type EsocialEventsRecord,
} from '../../esocial-events';
import type { EsocialEventsJson } from '../../esocial-events/esocial-events.types';

type TransmissionOutcome = 'ACCEPTED' | 'REJECTED' | 'TRANSIENT_ERROR';

type SgpEsocialSignedEnvelope = Readonly<{
  profile: 'SGP-ESOCIAL-SANDBOX-XMLDSIG';
  messageId: string;
  tenantId: string;
  eventClass: string;
  payloadHash: string;
  xml: string;
  xmlSha256: string;
  signature: {
    algorithm: 'SHA256-RSA-SANDBOX';
    digestSha256: string;
    certificateFingerprint: string;
    signedAt: string;
  };
}>;

type SgpEsocialTransportResponse = Readonly<{
  outcome: TransmissionOutcome;
  protocol: string;
  receipt: string | null;
  message: string;
  receivedAt: string;
}>;

type TransmitInput = Readonly<{
  tenantId: string;
  messageId: string;
  signedAt?: string | undefined;
}>;

export type SgpEsocialTransmissionResult = Readonly<{
  messageId: string;
  tenantId: string;
  eventClass: string;
  status: EsocialEventsRecord['status'];
  attempt: number;
  protocol?: string | undefined;
  receipt?: string | null | undefined;
  skipped?: boolean | undefined;
}>;

@Injectable()
export class SgpEsocialTransmissionService {
  constructor(private readonly eventsService: EsocialEventsService) {}

  async transmitCurrentTenant(
    messageId: string,
  ): Promise<SgpEsocialTransmissionResult> {
    return this.transmit({
      tenantId: currentTenantId(),
      messageId,
    });
  }

  async transmit(input: TransmitInput): Promise<SgpEsocialTransmissionResult> {
    const record = await this.eventsService.findById(
      input.tenantId,
      input.messageId,
    );
    if (!record) {
      throw domainError.notFound(
        'ESOCIAL_EVENT_NOT_FOUND',
        `eSocial spool event not found: ${input.messageId}`,
      );
    }
    if (isTerminal(record.status)) {
      return toResult(record, { skipped: true });
    }

    const sent = await this.eventsService.recordSent({
      tenantId: input.tenantId,
      messageId: input.messageId,
    });
    const signed = signRecord(sent, input.signedAt ?? new Date().toISOString());
    const response = submitSignedEnvelope(signed, sent.payload);

    if (response.outcome === 'ACCEPTED') {
      const updated = await this.eventsService.recordResponse({
        tenantId: input.tenantId,
        messageId: input.messageId,
        status: 'ACCEPTED',
        response: buildResponseJson(response, signed),
      });
      return toResult(updated, response);
    }

    if (response.outcome === 'REJECTED') {
      const updated = await this.eventsService.recordError({
        tenantId: input.tenantId,
        messageId: input.messageId,
        status: 'REJECTED',
        error: {
          code: 'ESOCIAL_REJECTED',
          message: response.message,
        },
        response: buildResponseJson(response, signed),
      });
      return toResult(updated, response);
    }

    const retryStatus = sent.attempt >= sent.maxAttempts ? 'DLQ' : 'RETRY';
    const updated = await this.eventsService.recordError({
      tenantId: input.tenantId,
      messageId: input.messageId,
      status: retryStatus,
      error: {
        code:
          retryStatus === 'DLQ' ? 'ESOCIAL_RETRY_EXHAUSTED' : 'ESOCIAL_RETRY',
        message: response.message,
      },
      response: buildResponseJson(response, signed),
    });
    return toResult(updated, response);
  }

  async processPendingCurrentTenant(
    limit = 25,
  ): Promise<SgpEsocialTransmissionResult[]> {
    return this.processPending(currentTenantId(), limit);
  }

  async processPending(
    tenantId: string,
    limit = 25,
  ): Promise<SgpEsocialTransmissionResult[]> {
    const boundedLimit = Math.max(1, Math.min(limit, 100));
    const [pending, retry] = await Promise.all([
      this.eventsService.findByTenant(tenantId, {
        status: 'PENDING',
        limit: boundedLimit,
      }),
      this.eventsService.findByTenant(tenantId, {
        status: 'RETRY',
        limit: boundedLimit,
      }),
    ]);

    const records = [...pending, ...retry].slice(0, boundedLimit);
    const results: SgpEsocialTransmissionResult[] = [];
    for (const record of records) {
      results.push(
        await this.transmit({
          tenantId,
          messageId: record.messageId,
        }),
      );
    }
    return results;
  }
}

function currentTenantId(): string {
  const tenantId = RequestContextStore.get()?.tenantId;
  if (!tenantId) {
    throw domainError.badRequest(
      'TENANT_CONTEXT_REQUIRED',
      'Tenant context is required to transmit eSocial spool events.',
    );
  }
  return tenantId;
}

function signRecord(
  record: EsocialEventsRecord,
  signedAt: string,
): SgpEsocialSignedEnvelope {
  const xml = buildXml(record);
  const xmlSha256 = sha256(xml);
  const digestSha256 = sha256(
    `${record.tenantId}:${record.messageId}:${record.payloadHash}:${xmlSha256}`,
  );
  return {
    profile: 'SGP-ESOCIAL-SANDBOX-XMLDSIG',
    messageId: record.messageId,
    tenantId: record.tenantId,
    eventClass: record.eventClass,
    payloadHash: record.payloadHash,
    xml,
    xmlSha256,
    signature: {
      algorithm: 'SHA256-RSA-SANDBOX',
      digestSha256,
      certificateFingerprint: sha256(`sgp-esocial:${record.tenantId}`),
      signedAt,
    },
  };
}

function buildXml(record: EsocialEventsRecord): string {
  return [
    '<eSocial>',
    `<evento Id="${escapeXml(record.messageId)}" classe="${escapeXml(record.eventClass)}">`,
    `<tenant>${escapeXml(record.tenantId)}</tenant>`,
    `<payloadHash>${escapeXml(record.payloadHash)}</payloadHash>`,
    `<payload>${escapeXml(stableStringify(record.payload))}</payload>`,
    '</evento>',
    '</eSocial>',
  ].join('');
}

function submitSignedEnvelope(
  envelope: SgpEsocialSignedEnvelope,
  payload: unknown,
): SgpEsocialTransportResponse {
  const flags = readPayloadFlags(payload);
  const receivedAt = new Date().toISOString();
  const protocol = `SGP-${envelope.eventClass}-${envelope.xmlSha256.slice(0, 16)}`;

  if (flags.forceReject) {
    return {
      outcome: 'REJECTED',
      protocol,
      receipt: null,
      message: 'Sandbox SERPRO rejected the event payload.',
      receivedAt,
    };
  }
  if (flags.forceTransientError) {
    return {
      outcome: 'TRANSIENT_ERROR',
      protocol,
      receipt: null,
      message: 'Sandbox SERPRO returned a transient transport error.',
      receivedAt,
    };
  }

  return {
    outcome: 'ACCEPTED',
    protocol,
    receipt: `REC-${envelope.signature.digestSha256.slice(0, 24)}`,
    message: 'Sandbox SERPRO accepted the signed event.',
    receivedAt,
  };
}

function readPayloadFlags(payload: unknown): {
  forceReject: boolean;
  forceTransientError: boolean;
} {
  const data = asRecord(payload)?.data;
  const flags = { ...asRecord(payload), ...asRecord(data) };
  return {
    forceReject: flags.forceReject === true,
    forceTransientError: flags.forceTransientError === true,
  };
}

function buildResponseJson(
  response: SgpEsocialTransportResponse,
  envelope: SgpEsocialSignedEnvelope,
): EsocialEventsJson {
  return {
    transport: {
      adapter: 'sgp-esocial-sandbox-serpro',
      outcome: response.outcome,
      protocol: response.protocol,
      receipt: response.receipt,
      message: response.message,
      receivedAt: response.receivedAt,
    },
    signing: {
      profile: envelope.profile,
      algorithm: envelope.signature.algorithm,
      digestSha256: envelope.signature.digestSha256,
      certificateFingerprint: envelope.signature.certificateFingerprint,
      signedAt: envelope.signature.signedAt,
      xmlSha256: envelope.xmlSha256,
    },
  };
}

function toResult(
  record: EsocialEventsRecord,
  response?: Partial<SgpEsocialTransportResponse> & { skipped?: boolean },
): SgpEsocialTransmissionResult {
  return {
    messageId: record.messageId,
    tenantId: record.tenantId,
    eventClass: record.eventClass,
    status: record.status,
    attempt: record.attempt,
    protocol: response?.protocol,
    receipt: response?.receipt,
    skipped: response?.skipped,
  };
}

function isTerminal(status: EsocialEventsRecord['status']): boolean {
  return status === 'ACCEPTED' || status === 'REJECTED' || status === 'DLQ';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(',')}}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
