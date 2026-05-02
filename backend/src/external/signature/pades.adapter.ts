import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface PadesPrepareInput {
  payload: Buffer;
  verifyUrl: string;
}

@Injectable()
export class PadesAdapter {
  async embedVerificationHint(input: PadesPrepareInput): Promise<Buffer> {
    try {
      const pdf = await PDFDocument.load(input.payload, {
        ignoreEncryption: true,
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
      return Buffer.from(await pdf.save());
    } catch {
      return Buffer.concat([
        input.payload,
        Buffer.from(`\n%%SGP-VERIFY-QR:${input.verifyUrl}\n`, 'utf8'),
      ]);
    }
  }
}
