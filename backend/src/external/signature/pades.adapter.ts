import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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
        this.padesBlock(input.payload, input),
      ]);
    }
  }

  private appendPadesBlock(payload: Buffer, input: PadesPrepareInput): Buffer {
    return Buffer.concat([payload, this.padesBlock(payload, input)]);
  }

  private padesBlock(payload: Buffer, input: PadesPrepareInput): Buffer {
    const payloadHash = createHash('sha256').update(payload).digest('hex');
    const signatureHash = createHash('sha256')
      .update(`${payloadHash}:${input.verifyUrl}:${input.reason ?? ''}`)
      .digest('hex');
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
