import { createHash } from 'node:crypto';

import {
  adapterQueueTopics,
  type QueueAdapterErrorEnvelope,
  type QueueAdapterRequestEnvelope,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterResponseStatus,
  type QueueAdapterTransport,
  type QueueSubscription,
} from '../../../common/adapters';
import type {
  GovBrAdvancedSignatureEnvelope,
  GovBrSignatureDecision,
  GovBrSignatureRequestRecord,
  GovBrSignatureStatus,
} from '../../../auth/govbr/govbr-signature-sandbox.adapter';

export const GOVBR_RELAY_QUEUE_KIND = 'govbr-sign' as const;

export type GovBrRelayKind = typeof GOVBR_RELAY_QUEUE_KIND;
export type GovBrRelayScenario =
  'ACCEPT' | 'TRANSIENT_ERROR' | 'DEFINITIVE_ERROR';
export type GovBrRelayAction =
  'CREATE_SIGNATURE_REQUEST' | 'COMPLETE_SIGNATURE_REQUEST';

export type GovBrRelayActor = Readonly<{
  sub: string;
  username: string;
  tenantId: string;
  groups?: readonly string[] | undefined;
  permissions?: readonly string[] | undefined;
  claims?: Record<string, unknown> | undefined;
}>;

export type GovBrRelayCreateRequestPayload = Readonly<{
  action: 'CREATE_SIGNATURE_REQUEST';
  actor: GovBrRelayActor;
  resourceType: string;
  resourceId?: string | undefined;
  payload: Record<string, unknown>;
  returnUrl?: string | undefined;
  scenario?: GovBrRelayScenario | undefined;
}>;

export type GovBrRelayCompleteRequestPayload = Readonly<{
  action: 'COMPLETE_SIGNATURE_REQUEST';
  state: string;
  decision: GovBrSignatureDecision;
  challenge?: string | undefined;
  scenario?: GovBrRelayScenario | undefined;
}>;

export type GovBrRelayRequestPayload =
  GovBrRelayCreateRequestPayload | GovBrRelayCompleteRequestPayload;

export type GovBrRelaySignatureRequestResponse = Readonly<{
  id: string;
  state: string;
  provider: 'govbr-local-sandbox';
  status: GovBrSignatureStatus;
  resourceType: string;
  resourceId: string | null;
  payloadHash: string;
  signer: {
    username: string;
    uniqueKey: string;
  };
  evidenceUri: string | null;
  signature: GovBrAdvancedSignatureEnvelope | null;
  createdAt: string;
  decidedAt: string | null;
}>;

export type GovBrRelayAck = Readonly<{
  protocol: string;
  status: 'SANDBOX_ACK';
  receivedAt: string;
  message: string;
}>;

export type GovBrRelayResponsePayload = Readonly<{
  relay: 'govbr-relay';
  handledBy: 'govbr-relay-mock';
  action: GovBrRelayAction;
  provider: 'govbr-local-sandbox';
  ack: GovBrRelayAck;
  request: GovBrRelaySignatureRequestResponse;
  redirectUrl: string | null;
  hashes: {
    requestSha256: string;
    payloadSha256: string;
    signatureSha256: string | null;
  };
}>;

type RelayDecision =
  | {
      status: 'OK';
      payload: GovBrRelayResponsePayload;
    }
  | {
      status: 'RETRY' | 'DEAD_LETTER';
      error: QueueAdapterErrorEnvelope;
    };

type StoredGovBrSignatureRequest = GovBrSignatureRequestRecord;

export type GovBrRelayMockResponderOptions = Readonly<{
  transport: QueueAdapterTransport;
  concurrency?: number | undefined;
  now?: (() => Date) | undefined;
}>;

export class GovBrRelayMockResponder {
  private readonly transport: QueueAdapterTransport;
  private readonly now: () => Date;
  private readonly subscription: QueueSubscription;
  private readonly requestsByState = new Map<
    string,
    StoredGovBrSignatureRequest
  >();

  constructor(options: GovBrRelayMockResponderOptions) {
    this.transport = options.transport;
    this.now = options.now ?? (() => new Date());
    this.subscription = this.transport.subscribe<
      QueueAdapterRequestEnvelope<GovBrRelayKind, GovBrRelayRequestPayload>
    >(
      adapterQueueTopics(GOVBR_RELAY_QUEUE_KIND).request,
      (request) => this.handleRequest(request),
      { concurrency: options.concurrency ?? 4 },
    );
  }

  close(): void {
    this.subscription.unsubscribe();
  }

  onModuleDestroy(): void {
    this.close();
  }

  private async handleRequest(
    request: QueueAdapterRequestEnvelope<
      GovBrRelayKind,
      GovBrRelayRequestPayload
    >,
  ): Promise<void> {
    const decision = this.evaluate(request);
    const response = this.buildResponse(request, decision);
    await this.transport.publish(request['reply-to'], response);
  }

  private evaluate(
    request: QueueAdapterRequestEnvelope<
      GovBrRelayKind,
      GovBrRelayRequestPayload
    >,
  ): RelayDecision {
    const payload = request.payload;
    if (payload.scenario === 'TRANSIENT_ERROR') {
      return this.error('RETRY', 'TRANSIENT', 'GOVBR_RELAY_TRANSIENT');
    }
    if (payload.scenario === 'DEFINITIVE_ERROR') {
      return this.error('DEAD_LETTER', 'DEFINITIVE', 'GOVBR_RELAY_DEFINITIVE');
    }

    if (payload.action === 'CREATE_SIGNATURE_REQUEST') {
      return this.createSignatureRequest(request, payload);
    }
    return this.completeSignatureRequest(request, payload);
  }

  private createSignatureRequest(
    request: QueueAdapterRequestEnvelope<
      GovBrRelayKind,
      GovBrRelayRequestPayload
    >,
    payload: GovBrRelayCreateRequestPayload,
  ): RelayDecision {
    if (payload.actor.tenantId !== request.tenant_id) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'GOVBR_RELAY_TENANT_MISMATCH',
        'GovBR signer tenant does not match queue envelope tenant.',
      );
    }
    if (!payload.resourceType?.trim()) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'GOVBR_RELAY_RESOURCE_TYPE_REQUIRED',
        'GovBR sign relay requires resourceType.',
      );
    }
    if (!payload.payload || typeof payload.payload !== 'object') {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'GOVBR_RELAY_PAYLOAD_REQUIRED',
        'GovBR sign relay requires an object payload.',
      );
    }

    const createdAt = this.now().toISOString();
    const payloadHash = sha256(canonical(payload.payload));
    const seed = [
      request.tenant_id,
      request['idempotency-key'],
      payload.resourceType.trim(),
      payload.resourceId?.trim() ?? '',
      payloadHash,
    ].join(':');
    const actorSigner = signer(payload.actor);
    const record: StoredGovBrSignatureRequest = {
      id: uuidFromSeed(`govbr-request:${seed}`),
      state: uuidFromSeed(`govbr-state:${seed}`),
      challenge: uuidFromSeed(`govbr-challenge:${seed}`),
      tenantId: request.tenant_id,
      signer: actorSigner,
      resourceType: payload.resourceType.trim(),
      resourceId: payload.resourceId?.trim() || null,
      payload: payload.payload,
      payloadHash,
      returnUrl: normalizeReturnUrl(payload.returnUrl),
      status: 'PENDING',
      createdAt,
      decidedAt: null,
      signature: null,
    };
    this.requestsByState.set(record.state, record);

    return this.okPayload(
      request,
      payload.action,
      record,
      this.sandboxRedirect(record),
    );
  }

  private completeSignatureRequest(
    request: QueueAdapterRequestEnvelope<
      GovBrRelayKind,
      GovBrRelayRequestPayload
    >,
    payload: GovBrRelayCompleteRequestPayload,
  ): RelayDecision {
    const record = this.requestsByState.get(payload.state);
    if (!record) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'GOVBR_RELAY_UNKNOWN_STATE',
        'Unknown gov.br signature state.',
      );
    }
    if (record.tenantId !== request.tenant_id) {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'GOVBR_RELAY_STATE_TENANT_MISMATCH',
        'GovBR signature state does not belong to queue envelope tenant.',
      );
    }
    if (record.status !== 'PENDING') {
      return this.error(
        'DEAD_LETTER',
        'DEFINITIVE',
        'GOVBR_RELAY_STATE_ALREADY_CLOSED',
        'GovBR signature request is already closed.',
      );
    }

    const decidedAt = this.now().toISOString();
    record.decidedAt = decidedAt;

    if (
      payload.decision === 'DENIED' ||
      payload.challenge !== record.challenge
    ) {
      record.status = 'DENIED';
      record.signature = null;
    } else {
      record.status = 'SIGNED';
      record.signature = signatureEnvelope(record, decidedAt);
    }

    return this.okPayload(
      request,
      payload.action,
      record,
      portalRedirect(record.status, record.id),
    );
  }

  private okPayload(
    request: QueueAdapterRequestEnvelope<
      GovBrRelayKind,
      GovBrRelayRequestPayload
    >,
    action: GovBrRelayAction,
    record: StoredGovBrSignatureRequest,
    redirectUrl: string | null,
  ): RelayDecision {
    const response = this.toResponse(record);
    const requestSha256 = sha256(JSON.stringify(request.payload));
    const protocol = [
      'GOVBR',
      'SIGN',
      record.status,
      requestSha256.slice(0, 16).toUpperCase(),
    ].join('-');

    return {
      status: 'OK',
      payload: {
        relay: 'govbr-relay',
        handledBy: 'govbr-relay-mock',
        action,
        provider: 'govbr-local-sandbox',
        ack: {
          protocol,
          status: 'SANDBOX_ACK',
          receivedAt: this.now().toISOString(),
          message:
            'GovBR local sandbox relay accepted the signature queue request.',
        },
        request: response,
        redirectUrl,
        hashes: {
          requestSha256,
          payloadSha256: record.payloadHash,
          signatureSha256: record.signature
            ? sha256(canonical(record.signature))
            : null,
        },
      },
    };
  }

  private sandboxRedirect(record: StoredGovBrSignatureRequest): string {
    const params = new URLSearchParams({
      state: record.state,
      decision: 'approved',
      challenge: record.challenge,
    });
    return `/api/portal/v1/auth/govbr/sign/callback?${params.toString()}`;
  }

  private error(
    status: 'RETRY' | 'DEAD_LETTER',
    kind: QueueAdapterErrorEnvelope['kind'],
    code: string,
    message = 'Mock GovBR sign relay requested adapter retry.',
  ): RelayDecision {
    return {
      status,
      error: {
        kind,
        code,
        message,
      },
    };
  }

  private buildResponse(
    request: QueueAdapterRequestEnvelope<
      GovBrRelayKind,
      GovBrRelayRequestPayload
    >,
    decision: RelayDecision,
  ): QueueAdapterResponseEnvelope<GovBrRelayKind, GovBrRelayResponsePayload> {
    return {
      'request-id': request['request-id'],
      'correlation-id': request['correlation-id'],
      'created-at': this.now().toISOString(),
      tenant_id: request.tenant_id,
      kind: request.kind,
      status: decision.status satisfies QueueAdapterResponseStatus,
      attempt: request.attempt,
      payload: decision.status === 'OK' ? decision.payload : undefined,
      error: decision.status === 'OK' ? undefined : decision.error,
    };
  }

  private toResponse(
    record: StoredGovBrSignatureRequest,
  ): GovBrRelaySignatureRequestResponse {
    return {
      id: record.id,
      state: record.state,
      provider: 'govbr-local-sandbox' as const,
      status: record.status,
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      payloadHash: record.payloadHash,
      signer: {
        username: record.signer.username,
        uniqueKey: record.signer.uniqueKey,
      },
      evidenceUri: record.signature
        ? `govbr-sandbox://advanced-signatures/${record.signature.id}`
        : null,
      signature: record.signature,
      createdAt: record.createdAt,
      decidedAt: record.decidedAt,
    };
  }
}

function signer(actor: GovBrRelayActor): StoredGovBrSignatureRequest['signer'] {
  const cpf = stringClaim(actor, 'cpf');
  const email = stringClaim(actor, 'email');
  const uniqueKey = sha256(
    canonical({
      cpf,
      sub: actor.sub,
      tenantId: actor.tenantId,
    }),
  );
  return {
    sub: actor.sub,
    username: actor.username,
    cpf,
    email,
    uniqueKey,
  };
}

function stringClaim(actor: GovBrRelayActor, key: string): string | null {
  const value = actor.claims?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function signatureEnvelope(
  record: StoredGovBrSignatureRequest,
  signedAt: string,
): GovBrAdvancedSignatureEnvelope {
  const signatureHash = sha256(
    canonical({
      challenge: record.challenge,
      payloadHash: record.payloadHash,
      signerUniqueKey: record.signer.uniqueKey,
      signedAt,
      state: record.state,
    }),
  );
  const tamperEvidentHash = sha256(
    canonical({
      payloadHash: record.payloadHash,
      signatureHash,
      signerUniqueKey: record.signer.uniqueKey,
      signedAt,
    }),
  );

  return {
    id: uuidFromSeed(`govbr-signature:${record.state}:${signedAt}`),
    provider: 'govbr-local-sandbox',
    legalBasis: 'Lei 14.063/2020 art. 4 II',
    level: 'ADVANCED',
    signerUniqueKey: record.signer.uniqueKey,
    payloadHash: record.payloadHash,
    signatureHash,
    tamperEvidentHash,
    evidence: {
      uniqueAssociation: true,
      signerControlHighConfidence: true,
      laterModificationDetectable: true,
      creationDataControl: 'sandbox-state-challenge',
    },
    signedAt,
  };
}

function portalRedirect(status: string, id: string): string {
  const params = new URLSearchParams({
    status: status.toLowerCase(),
    signatureRequestId: id,
  });
  return `/govbr-sign/callback?${params.toString()}`;
}

function normalizeReturnUrl(value?: string): string {
  const fallback = '/govbr-sign/callback';
  if (!value?.trim()) return fallback;
  const trimmed = value.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;

  try {
    const url = new URL(trimmed);
    const allowed = new Set(
      (process.env.GOVBR_SIGN_ALLOWED_RETURN_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    );
    ['http://localhost:4200', 'http://localhost:4300'].forEach((origin) =>
      allowed.add(origin),
    );
    return allowed.has(url.origin) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function uuidFromSeed(seed: string): string {
  const chars = Array.from(sha256(seed).slice(0, 32));
  chars[12] = '4';
  chars[16] = ((Number.parseInt(chars[16] ?? '0', 16) & 0x3) | 0x8).toString(
    16,
  );
  const hex = chars.join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonical(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical(
            (value as Record<string, unknown>)[key],
          )}`,
      )
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
