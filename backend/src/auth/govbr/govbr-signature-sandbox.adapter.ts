import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';

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
  private readonly requests = new Map<string, GovBrSignatureRequestRecord>();

  createRequest(actor: AuthenticatedActor, input: GovBrSignRequestDto) {
    if (!input.resourceType?.trim()) {
      throw new BadRequestException('resourceType is required');
    }
    if (!input.payload || typeof input.payload !== 'object') {
      throw new BadRequestException('payload is required');
    }

    const id = randomUUID();
    const state = randomUUID();
    const challenge = randomUUID();
    const payloadHash = this.sha256(this.canonical(input.payload));
    const returnUrl = this.normalizeReturnUrl(input.returnUrl);
    const record: GovBrSignatureRequestRecord = {
      id,
      state,
      challenge,
      tenantId: actor.tenantId,
      signer: this.signer(actor),
      resourceType: input.resourceType.trim(),
      resourceId: input.resourceId?.trim() || null,
      payload: input.payload,
      payloadHash,
      returnUrl,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      decidedAt: null,
      signature: null,
    };

    this.requests.set(state, record);

    return {
      request: this.toResponse(record),
      redirectUrl: `/api/portal/v1/auth/govbr/sign/callback?state=${encodeURIComponent(
        state,
      )}&decision=approved&challenge=${encodeURIComponent(challenge)}`,
      provider: 'govbr-local-sandbox' as const,
    };
  }

  complete(
    state: string,
    decision: GovBrSignatureDecision,
    challenge?: string,
  ) {
    const record = this.requests.get(state);
    if (!record) {
      throw new BadRequestException('Unknown gov.br signature state');
    }
    if (record.status !== 'PENDING') {
      throw new BadRequestException(
        'Gov.br signature request is already closed',
      );
    }

    const decidedAt = new Date().toISOString();
    record.decidedAt = decidedAt;

    if (decision === 'DENIED') {
      record.status = 'DENIED';
      return this.toResponse(record);
    }

    if (challenge !== record.challenge) {
      record.status = 'DENIED';
      record.decidedAt = decidedAt;
      return this.toResponse(record);
    }

    record.status = 'SIGNED';
    record.signature = this.signatureEnvelope(record, decidedAt);
    return this.toResponse(record);
  }

  getByState(state: string) {
    const record = this.requests.get(state);
    return record ? this.toResponse(record) : null;
  }

  verifyEnvelope(
    payload: Record<string, unknown>,
    envelope: GovBrAdvancedSignatureEnvelope,
  ): boolean {
    const payloadHash = this.sha256(this.canonical(payload));
    if (payloadHash !== envelope.payloadHash) return false;
    const tamperEvidentHash = this.sha256(
      this.canonical({
        payloadHash: envelope.payloadHash,
        signatureHash: envelope.signatureHash,
        signerUniqueKey: envelope.signerUniqueKey,
        signedAt: envelope.signedAt,
      }),
    );
    return tamperEvidentHash === envelope.tamperEvidentHash;
  }

  private signatureEnvelope(
    record: GovBrSignatureRequestRecord,
    signedAt: string,
  ): GovBrAdvancedSignatureEnvelope {
    const signatureHash = this.sha256(
      this.canonical({
        challenge: record.challenge,
        payloadHash: record.payloadHash,
        signerUniqueKey: record.signer.uniqueKey,
        signedAt,
        state: record.state,
      }),
    );
    const tamperEvidentHash = this.sha256(
      this.canonical({
        payloadHash: record.payloadHash,
        signatureHash,
        signerUniqueKey: record.signer.uniqueKey,
        signedAt,
      }),
    );

    return {
      id: randomUUID(),
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

  private signer(actor: AuthenticatedActor) {
    const cpf = this.stringClaim(actor, 'cpf');
    const email = this.stringClaim(actor, 'email');
    const uniqueKey = this.sha256(
      this.canonical({
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

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private canonical(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.canonical(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      return `{${Object.keys(value as Record<string, unknown>)
        .sort()
        .map(
          (key) =>
            `${JSON.stringify(key)}:${this.canonical(
              (value as Record<string, unknown>)[key],
            )}`,
        )
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }
}
