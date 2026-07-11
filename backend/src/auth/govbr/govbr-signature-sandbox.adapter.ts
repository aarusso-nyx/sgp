import { BadRequestException, Injectable } from '@nestjs/common';
import {
  createGovBrSandboxAdapter,
  type GovBrSandboxAdapter,
  type GovBrSandboxResult,
} from '@stynx-nyx/signature';

import { AuthenticatedActor } from '../actor.types';
import { GovBrSignRequestDto } from './sign.dto';

export type GovBrSignatureDecision = 'APPROVED' | 'DENIED';
export type GovBrSignatureStatus = 'PENDING' | 'SIGNED' | 'DENIED';

export interface GovBrSignatureRequestRecord {
  id: string;
  state: string;
  challenge: string;
  tenantId: string;
  signer: {
    sub: string;
    username: string;
    cpf: string | null;
    email: string | null;
    uniqueKey: string;
  };
  resourceType: string;
  resourceId: string | null;
  payload: Record<string, unknown>;
  payloadHash: string;
  returnUrl: string;
  status: GovBrSignatureStatus;
  createdAt: string;
  decidedAt: string | null;
  signature: GovBrAdvancedSignatureEnvelope | null;
}

export interface GovBrAdvancedSignatureEnvelope {
  id: string;
  provider: 'govbr-local-sandbox';
  legalBasis: 'Lei 14.063/2020 art. 4 II';
  level: 'ADVANCED';
  signerUniqueKey: string;
  payloadHash: string;
  signatureHash: string;
  tamperEvidentHash: string;
  evidence: {
    uniqueAssociation: true;
    signerControlHighConfidence: true;
    laterModificationDetectable: true;
    creationDataControl: 'sandbox-state-challenge';
  };
  signedAt: string;
}

@Injectable()
export class GovBrSignatureSandboxAdapter {
  private readonly adapter: GovBrSandboxAdapter = createGovBrSandboxAdapter(
    () => new Date(),
  );
  private readonly requests = new Map<
    string,
    {
      actor: AuthenticatedActor;
      input: GovBrSignRequestDto;
      returnUrl: string;
      record: GovBrSignatureRequestRecord;
    }
  >();

  createRequest(actor: AuthenticatedActor, input: GovBrSignRequestDto) {
    if (!input.resourceType?.trim()) {
      throw new BadRequestException('resourceType is required');
    }
    if (!input.payload || typeof input.payload !== 'object') {
      throw new BadRequestException('payload is required');
    }

    const returnUrl = this.normalizeReturnUrl(input.returnUrl);
    const result = this.adapter.createRequest({
      tenantId: actor.tenantId,
      signer: this.signer(actor),
      resourceType: input.resourceType.trim(),
      resourceId: input.resourceId?.trim() || null,
      payload: input.payload,
      returnUrl,
    });
    const record = this.toRecord(result, actor, input, returnUrl);
    this.requests.set(result.state, { actor, input, returnUrl, record });

    return {
      request: this.toResponse(record),
      redirectUrl: `/api/portal/v1/auth/govbr/sign/callback?state=${encodeURIComponent(
        result.state,
      )}&decision=approved&challenge=${encodeURIComponent(result.challenge)}`,
      provider: 'govbr-local-sandbox' as const,
    };
  }

  complete(
    state: string,
    decision: GovBrSignatureDecision,
    challenge?: string,
  ) {
    const context = this.requests.get(state);
    let result: GovBrSandboxResult;
    try {
      result = this.adapter.complete(
        state,
        decision === 'APPROVED' ? 'approved' : 'denied',
        challenge,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Unknown gov.br signature state',
      );
    }
    const record = this.toRecord(
      result,
      context?.actor,
      context?.input,
      context?.returnUrl,
    );
    if (context) {
      context.record = record;
    }
    return this.toResponse(record);
  }

  getByState(state: string) {
    const context = this.requests.get(state);
    return context ? this.toResponse(context.record) : null;
  }

  verifyEnvelope(
    payload: Record<string, unknown>,
    envelope: GovBrAdvancedSignatureEnvelope,
  ): boolean {
    return this.adapter.verify(payload, {
      id: envelope.id,
      state: '',
      challenge: '',
      provider: 'govbr-local-sandbox',
      status: 'completed',
      signerUniqueKey: envelope.signerUniqueKey,
      payloadHash: envelope.payloadHash,
      signatureHash: envelope.signatureHash,
      tamperEvidentHash: envelope.tamperEvidentHash,
      evidenceUri: `govbr-sandbox://advanced-signatures/${envelope.id}`,
      evidence: envelope.evidence,
      createdAt: envelope.signedAt,
      decidedAt: envelope.signedAt,
    });
  }

  private signer(actor: AuthenticatedActor) {
    return {
      sub: actor.sub,
      username: actor.username,
      cpf: this.stringClaim(actor, 'cpf'),
      email: this.stringClaim(actor, 'email'),
    };
  }

  private stringClaim(actor: AuthenticatedActor, key: string): string | null {
    const value = actor.claims?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private normalizeReturnUrl(value?: string): string {
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

  private toResponse(record: GovBrSignatureRequestRecord) {
    return {
      id: record.id,
      state: record.state,
      provider: 'govbr-local-sandbox',
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

  private toRecord(
    result: GovBrSandboxResult,
    actor?: AuthenticatedActor,
    input?: GovBrSignRequestDto,
    returnUrl = '/govbr-sign/callback',
  ): GovBrSignatureRequestRecord {
    const cpf = actor ? this.stringClaim(actor, 'cpf') : null;
    const email = actor ? this.stringClaim(actor, 'email') : null;
    return {
      id: result.id,
      state: result.state,
      challenge: result.challenge,
      tenantId: actor?.tenantId ?? '',
      signer: {
        sub: actor?.sub ?? '',
        username: actor?.username ?? '',
        cpf,
        email,
        uniqueKey: result.signerUniqueKey,
      },
      resourceType: input?.resourceType.trim() ?? '',
      resourceId: input?.resourceId?.trim() || null,
      payload: input?.payload ?? {},
      payloadHash: result.payloadHash,
      returnUrl,
      status: this.toSgpStatus(result.status),
      createdAt: result.createdAt,
      decidedAt: result.decidedAt,
      signature: this.toSignatureEnvelope(result),
    };
  }

  private toSignatureEnvelope(
    result: GovBrSandboxResult,
  ): GovBrAdvancedSignatureEnvelope | null {
    if (
      result.status !== 'completed' ||
      !result.signatureHash ||
      !result.tamperEvidentHash ||
      !result.evidence
    ) {
      return null;
    }

    return {
      id: result.id,
      provider: 'govbr-local-sandbox',
      legalBasis: 'Lei 14.063/2020 art. 4 II',
      level: 'ADVANCED',
      signerUniqueKey: result.signerUniqueKey,
      payloadHash: result.payloadHash,
      signatureHash: result.signatureHash,
      tamperEvidentHash: result.tamperEvidentHash,
      evidence: result.evidence,
      signedAt: result.decidedAt ?? result.createdAt,
    };
  }

  private toSgpStatus(
    status: GovBrSandboxResult['status'],
  ): GovBrSignatureStatus {
    if (status === 'completed') return 'SIGNED';
    if (status === 'failed') return 'DENIED';
    return 'PENDING';
  }
}
