import { BadRequestException, Injectable } from '@nestjs/common';

import { AuthenticatedActor } from '../auth.types';
import {
  GovBrSignatureDecision,
  GovBrSignatureSandboxAdapter,
} from './govbr-signature-sandbox.adapter';
import { GovBrSignCallbackQueryDto, GovBrSignRequestDto } from './sign.dto';
import {
  EsocialPadesPkcs7Envelope,
  EsocialPadesSignInput,
  EsocialPadesSoapStub,
  SoftwarePadesPkcs7Signer,
} from './software-pades-pkcs7.signer';

@Injectable()
export class GovBrSignService {
  private readonly esocialPadesSigner = new SoftwarePadesPkcs7Signer();
  private readonly esocialPadesSoapStub = new EsocialPadesSoapStub(
    this.esocialPadesSigner,
  );

  constructor(private readonly adapter: GovBrSignatureSandboxAdapter) {}

  initiate(actor: AuthenticatedActor | undefined, input: GovBrSignRequestDto) {
    if (!actor) {
      throw new BadRequestException('Authenticated actor is required');
    }
    return this.adapter.createRequest(actor, input);
  }

  complete(query: GovBrSignCallbackQueryDto) {
    if (!query.state) {
      throw new BadRequestException('state is required');
    }
    const decision = this.parseDecision(query.decision);
    const request = this.adapter.complete(
      query.state,
      decision,
      query.challenge,
    );
    return {
      request,
      redirectUrl: this.callbackUrl(request.status, request.id),
    };
  }

  verifyPayload(
    payload: Record<string, unknown>,
    signature: NonNullable<
      ReturnType<GovBrSignService['complete']>['request']['signature']
    >,
  ): boolean {
    return this.adapter.verifyEnvelope(payload, signature);
  }

  signEsocialS1299SoftwareCertificate(input: EsocialPadesSignInput) {
    return this.esocialPadesSigner.signS1299(input);
  }

  verifyEsocialS1299Envelope(envelope: EsocialPadesPkcs7Envelope): boolean {
    return this.esocialPadesSigner.verifyEnvelope(envelope);
  }

  transmitEsocialS1299Sandbox(envelope: EsocialPadesPkcs7Envelope) {
    return this.esocialPadesSoapStub.transmit(envelope);
  }

  private parseDecision(value?: string): GovBrSignatureDecision {
    const normalized = String(value ?? '').toLowerCase();
    if (normalized === 'approved' || normalized === 'signed') return 'APPROVED';
    if (normalized === 'denied' || normalized === 'cancelled') return 'DENIED';
    throw new BadRequestException('Unsupported gov.br signature decision');
  }

  private callbackUrl(status: string, id: string): string {
    const params = new URLSearchParams({
      status: status.toLowerCase(),
      signatureRequestId: id,
    });
    return `/govbr-sign/callback?${params.toString()}`;
  }
}
