import { sha256CanonicalJson } from '@stynx/signature';

import {
  SgpQueueAdapter,
  type QueueAdapterResponseEnvelope,
  type QueueAdapterTransport,
} from '../../../common/adapters';
import type { AuthenticatedActor } from '../../actor.types';
import {
  GOVBR_RELAY_QUEUE_KIND,
  type GovBrRelayAck,
  type GovBrRelayCompleteRequestPayload,
  type GovBrRelayCreateRequestPayload,
  type GovBrRelayKind,
  type GovBrRelayRequestPayload,
  type GovBrRelayResponsePayload,
  type GovBrRelayScenario,
  type GovBrRelaySignatureRequestResponse,
} from '../../../external/mocks/govbr-relay';
import type {
  GovBrAdvancedSignatureEnvelope,
  GovBrSignatureDecision,
} from '../govbr-signature-sandbox.adapter';
import type { GovBrSignRequestDto } from '../sign.dto';
import { domainError } from '../../../common/errors/domain-error';

export type GovBrQueueRequestOptions = Readonly<{
  requestId?: string | undefined;
  correlationId?: string | undefined;
  idempotencyKey?: string | undefined;
  maxAttempts?: number | undefined;
  scenario?: GovBrRelayScenario | undefined;
}>;

export type GovBrQueueCreateInput = GovBrQueueRequestOptions &
  Readonly<{
    actor: AuthenticatedActor;
    request: GovBrSignRequestDto;
  }>;

export type GovBrQueueCompleteInput = GovBrQueueRequestOptions &
  Readonly<{
    state: string;
    decision: GovBrSignatureDecision;
    challenge?: string | undefined;
    tenantId?: string | undefined;
  }>;

export type GovBrQueueAdapterResult = Readonly<{
  queueResponse: QueueAdapterResponseEnvelope<
    GovBrRelayKind,
    GovBrRelayResponsePayload
  >;
  relay: GovBrRelayResponsePayload;
  request: GovBrRelaySignatureRequestResponse;
  ack: GovBrRelayAck;
  provider: 'govbr-local-sandbox';
  redirectUrl: string | null;
}>;

export type GovBrQueueAdapterOptions = Readonly<{
  transport?: QueueAdapterTransport | undefined;
  queue?: SgpQueueAdapter<GovBrRelayKind> | undefined;
  maxAttempts?: number | undefined;
  responseTimeoutMs?: number | undefined;
  retryDelayMs?: ((attempt: number) => number) | undefined;
  now?: (() => Date) | undefined;
  idFactory?: (() => string) | undefined;
}>;

export class GovBrQueueAdapter {
  private readonly queue: SgpQueueAdapter<GovBrRelayKind>;
  private readonly ownsQueue: boolean;
  private readonly stateTenants = new Map<string, string>();

  constructor(options: GovBrQueueAdapterOptions) {
    if (options.queue) {
      this.queue = options.queue;
      this.ownsQueue = false;
      return;
    }

    if (!options.transport) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'GovBrQueueAdapter requires either a queue or a queue transport.',
      );
    }
    this.queue = new SgpQueueAdapter({
      kind: GOVBR_RELAY_QUEUE_KIND,
      transport: options.transport,
      maxAttempts: options.maxAttempts,
      responseTimeoutMs: options.responseTimeoutMs,
      retryDelayMs: options.retryDelayMs,
      now: options.now,
      idFactory: options.idFactory,
    });
    this.ownsQueue = true;
  }

  close(): void {
    if (this.ownsQueue) {
      this.queue.close();
    }
  }

  onModuleDestroy(): void {
    this.close();
  }

  async createRequest(
    actor: AuthenticatedActor,
    request: GovBrSignRequestDto,
    options: GovBrQueueRequestOptions = {},
  ): Promise<GovBrQueueAdapterResult> {
    return this.submitCreateRequest({ actor, request, ...options });
  }

  async complete(
    state: string,
    decision: GovBrSignatureDecision,
    challenge?: string,
    options: GovBrQueueRequestOptions & { tenantId?: string } = {},
  ): Promise<GovBrRelaySignatureRequestResponse> {
    const result = await this.completeRequest({
      state,
      decision,
      challenge,
      ...options,
    });
    return result.request;
  }

  async submitCreateRequest(
    input: GovBrQueueCreateInput,
  ): Promise<GovBrQueueAdapterResult> {
    const payload = this.buildCreatePayload(input);
    const result = await this.requestRelay(input.actor.tenantId, payload, {
      requestId: input.requestId,
      correlationId: input.correlationId,
      idempotencyKey:
        input.idempotencyKey ?? this.createIdempotencyKey(input, payload),
      maxAttempts: input.maxAttempts,
    });
    this.stateTenants.set(result.request.state, input.actor.tenantId);
    return result;
  }

  async completeRequest(
    input: GovBrQueueCompleteInput,
  ): Promise<GovBrQueueAdapterResult> {
    const tenantId = input.tenantId ?? this.stateTenants.get(input.state);
    if (!tenantId) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'GovBrQueueAdapter cannot complete an unknown state without tenantId.',
      );
    }
    const payload = this.buildCompletePayload(input);
    const result = await this.requestRelay(tenantId, payload, {
      requestId: input.requestId,
      correlationId: input.correlationId,
      idempotencyKey:
        input.idempotencyKey ??
        `${tenantId}:govbr-sign:complete:${input.state}:${input.decision}`,
      maxAttempts: input.maxAttempts,
    });
    this.stateTenants.set(result.request.state, tenantId);
    return result;
  }

  verifyEnvelope(
    payload: Record<string, unknown>,
    envelope: GovBrAdvancedSignatureEnvelope,
  ): boolean {
    const payloadHash = sha256CanonicalJson(payload);
    if (payloadHash !== envelope.payloadHash) return false;
    const tamperEvidentHash = sha256CanonicalJson({
      payloadHash: envelope.payloadHash,
      signatureHash: envelope.signatureHash,
      signerUniqueKey: envelope.signerUniqueKey,
      signedAt: envelope.signedAt,
    });
    return tamperEvidentHash === envelope.tamperEvidentHash;
  }

  private buildCreatePayload(
    input: GovBrQueueCreateInput,
  ): GovBrRelayCreateRequestPayload {
    if (!input.request.payload || typeof input.request.payload !== 'object') {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'GovBrQueueAdapter requires an object payload.',
      );
    }

    return {
      action: 'CREATE_SIGNATURE_REQUEST',
      actor: input.actor,
      resourceType: input.request.resourceType,
      resourceId: input.request.resourceId,
      payload: input.request.payload,
      returnUrl: input.request.returnUrl,
      scenario: input.scenario,
    };
  }

  private buildCompletePayload(
    input: GovBrQueueCompleteInput,
  ): GovBrRelayCompleteRequestPayload {
    return {
      action: 'COMPLETE_SIGNATURE_REQUEST',
      state: input.state,
      decision: input.decision,
      challenge: input.challenge,
      scenario: input.scenario,
    };
  }

  private async requestRelay(
    tenantId: string,
    payload: GovBrRelayRequestPayload,
    options: GovBrQueueRequestOptions,
  ): Promise<GovBrQueueAdapterResult> {
    const queueResponse = await this.queue.request<
      GovBrRelayRequestPayload,
      GovBrRelayResponsePayload
    >({
      tenantId,
      requestId: options.requestId,
      correlationId: options.correlationId,
      idempotencyKey: options.idempotencyKey,
      maxAttempts: options.maxAttempts,
      payload,
    });

    const relay = queueResponse.payload;
    if (!relay) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'GovBR relay returned an OK response without payload.',
      );
    }
    this.assertRelayPayload(payload, relay);

    return {
      queueResponse,
      relay,
      request: relay.request,
      ack: relay.ack,
      provider: relay.provider,
      redirectUrl: relay.redirectUrl,
    };
  }

  private assertRelayPayload(
    payload: GovBrRelayRequestPayload,
    relay: GovBrRelayResponsePayload,
  ): void {
    if (relay.relay !== 'govbr-relay') {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'GovBR relay returned an unexpected relay identifier.',
      );
    }
    if (relay.action !== payload.action) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'GovBR relay returned a different action.',
      );
    }
    if (payload.action === 'COMPLETE_SIGNATURE_REQUEST') {
      if (relay.request.state !== payload.state) {
        throw domainError.internal(
          'INTERNAL_INVARIANT',
          'GovBR relay returned a different signature state.',
        );
      }
    }
  }

  private createIdempotencyKey(
    input: GovBrQueueCreateInput,
    payload: GovBrRelayCreateRequestPayload,
  ): string {
    return [
      input.actor.tenantId,
      'govbr-sign',
      'create',
      payload.resourceType,
      payload.resourceId ?? 'none',
      sha256CanonicalJson(payload.payload),
    ].join(':');
  }
}
