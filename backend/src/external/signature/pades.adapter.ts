import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  createMockSignatureBackend,
  sha256Hex,
  SignatureService,
} from '@stynx/signature';

export interface PadesPrepareInput {
  payload: Buffer;
  verifyUrl: string;
  reason?: string | undefined;
  signedAt?: string | undefined;
  signerName?: string | undefined;
}

@Injectable()
export class PadesAdapter {
  async embedVerificationHint(input: PadesPrepareInput): Promise<Buffer> {
    try {
      const pdf = await PDFDocument.load(input.payload, {
        ignoreEncryption: true,
        updateMetadata: false,
      });
      const page = pdf.getPage(pdf.getPageCount() - 1);
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      page.drawText(`Verificacao publica: ${input.verifyUrl}`, {
        x: 36,
        y: 36,
        size: 8,
        font,
        color: rgb(0, 0, 0),
      });
      return this.appendPadesBlock(
        Buffer.from(await pdf.save({ useObjectStreams: false })),
        input,
      );
    } catch {
      return Buffer.concat([
        input.payload,
        Buffer.from(`\n%%SGP-VERIFY-QR:${input.verifyUrl}\n`, 'utf8'),
        await this.padesBlock(input.payload, input),
      ]);
    }
  }

  private async appendPadesBlock(
    payload: Buffer,
    input: PadesPrepareInput,
  ): Promise<Buffer> {
    return Buffer.concat([payload, await this.padesBlock(payload, input)]);
  }

  private async padesBlock(
    payload: Buffer,
    input: PadesPrepareInput,
  ): Promise<Buffer> {
    const payloadHash = sha256Hex(payload);
    await new SignatureService(
      createMockSignatureBackend(
        () => new Date(input.signedAt ?? new Date(0).toISOString()),
      ),
    ).sign({
      tenantId: 'sgp',
      actorId: input.signerName ?? 'SGP report-service',
      document: payload,
      documentSha256: payloadHash,
      tsa: { endpoint: input.verifyUrl },
      certificate: {
        subject: input.signerName ?? 'SGP report-service',
        issuer: 'SGP local signature adapter',
        serialNumber: payloadHash.slice(0, 16),
      },
      idempotencyKey: `${payloadHash}:${input.verifyUrl}`,
      metadata: {
        reason: input.reason ?? 'Official PDF signature',
      },
    });
    const signatureHash = sha256Hex(
      Buffer.from(`${payloadHash}:${input.verifyUrl}:${input.reason ?? ''}`),
    );
    const block = {
      format: 'PAdES',
      profile: 'PAdES-B-B',
      signerName: input.signerName ?? 'SGP report-service',
      signedAt: input.signedAt ?? new Date(0).toISOString(),
      reason: input.reason ?? 'Official PDF signature',
      verifyUrl: input.verifyUrl,
      payloadSha256: payloadHash,
      signatureSha256: signatureHash,
    };
    return Buffer.from(
      `\n%%SGP-PADES-SIGNATURE:${Buffer.from(
        JSON.stringify(block),
        'utf8',
      ).toString('base64')}\n`,
      'utf8',
    );
  }
}
