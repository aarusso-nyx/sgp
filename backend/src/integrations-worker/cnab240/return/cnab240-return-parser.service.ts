import { createHash } from 'node:crypto';

import { Injectable, UnprocessableEntityException } from '@nestjs/common';

const RECORD_SIZE = 240;

export interface ParsedCnab240ReturnDetail {
  bankCode: string;
  sequence: number;
  employeeId: string;
  amount: string;
  occurrenceCode: string;
}

export interface ParsedCnab240Return {
  bankCode: string;
  fileHash: string;
  details: ParsedCnab240ReturnDetail[];
}

@Injectable()
export class Cnab240ReturnParserService {
  parse(content: Buffer | string): ParsedCnab240Return {
    const buffer = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content, 'ascii');
    if (buffer.byteLength === 0 || buffer.byteLength % RECORD_SIZE !== 0) {
      throw new UnprocessableEntityException(
        'CNAB 240 return content must contain fixed 240-byte records',
      );
    }

    const text = buffer.toString('ascii');
    const lines = splitRecords(text);
    const header = lines[0];
    const bankCode = header.slice(0, 3);
    const details = lines
      .filter((line) => line.slice(7, 8) === '3' && line.slice(13, 14) === 'A')
      .map((line) => this.parseSegmentA(line, bankCode));

    if (details.length === 0) {
      throw new UnprocessableEntityException(
        'CNAB 240 return does not contain segment A detail records',
      );
    }

    return {
      bankCode,
      fileHash: createHash('sha256').update(buffer).digest('hex'),
      details,
    };
  }

  private parseSegmentA(
    line: string,
    headerBankCode: string,
  ): ParsedCnab240ReturnDetail {
    const bankCode = line.slice(0, 3) || headerBankCode;
    const sequence = Number(line.slice(8, 13));
    const employeeId = line.slice(73, 93).trim();
    const amountCents = line.slice(119, 134);
    const occurrenceCode = line.slice(230, 235).trim() || line.slice(15, 17);

    if (!sequence || !employeeId || !occurrenceCode.trim()) {
      throw new UnprocessableEntityException(
        'CNAB 240 segment A return line is missing sequence, employee id, or occurrence code',
      );
    }

    return {
      bankCode,
      sequence,
      employeeId,
      amount: centsToDecimal(amountCents),
      occurrenceCode,
    };
  }
}

function splitRecords(text: string): string[] {
  const clean = text.replace(/\r?\n/g, '');
  const lines: string[] = [];
  for (let offset = 0; offset < clean.length; offset += RECORD_SIZE) {
    lines.push(clean.slice(offset, offset + RECORD_SIZE));
  }
  return lines;
}

function centsToDecimal(value: string): string {
  const digits = value.replace(/\D/g, '') || '0';
  const cents = digits.padStart(3, '0');
  const whole = cents.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  return `${whole}.${cents.slice(-2)}`;
}
