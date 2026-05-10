import { createHash } from 'node:crypto';

import { BadRequestException } from '@nestjs/common';

import {
  formatDateOnlyUtc,
  formatInstantIso,
} from '../payroll-bridge/tenant-timezone.util';

export const AFD_LINE_WIDTH = 256;
export const AFD_LAYOUT_VERSION = '671001';

export type AfdRecordType = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export interface AfdRecord {
  nsr: number;
  type: AfdRecordType;
  rawLine: string;
  fields: Record<string, string | number | null>;
}

export interface AfdType1Input {
  nsr: number;
  employerTaxId: string;
  employerName: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
}

export interface AfdType4Input {
  nsr: number;
  employeeIdentifier: string;
  employeeName?: string | null | undefined;
  recordedAt: string;
  source: string;
  repDeviceId: string;
  recordHash?: string | null | undefined;
}

export interface AfdType9Input {
  nsr: number;
  periodStart: string;
  periodEnd: string;
  lineCount: number;
  trailerHash: string;
}

export interface ParsedAfdFile {
  records: AfdRecord[];
  lines: string[];
  bodyLines: string[];
  trailer: AfdRecord;
  fileSha256: string;
}

function right(
  value: string | number | null | undefined,
  width: number,
  fill = '0',
): string {
  const text = String(value ?? '');
  if (text.length > width) return text.slice(-width);
  return text.padStart(width, fill);
}

function left(
  value: string | number | null | undefined,
  width: number,
): string {
  const text = String(value ?? '');
  if (text.length > width) return text.slice(0, width);
  return text.padEnd(width, ' ');
}

function digits(
  value: string | number | null | undefined,
  width: number,
): string {
  return right(String(value ?? '').replace(/\D/g, ''), width);
}

function timestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid AFD timestamp: ${value}`);
  }
  return formatInstantIso(date).replace(/\D/g, '').slice(0, 14);
}

function dateOnly(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid AFD date: ${value}`);
  }
  return formatDateOnlyUtc(date).replace(/\D/g, '');
}

function parseTimestamp(value: string): string {
  const text = value.trim();
  if (!/^\d{14}$/.test(text)) return '';
  const iso = `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T${text.slice(8, 10)}:${text.slice(10, 12)}:${text.slice(12, 14)}.000Z`;
  return formatInstantIso(iso);
}

function base(nsr: number, type: AfdRecordType): string {
  return `${right(nsr, 9)}${type}`;
}

function finish(prefix: string): string {
  return left(prefix, AFD_LINE_WIDTH);
}

export function trailerHashForLines(lines: readonly string[]): string {
  return createHash('sha256').update(lines.join('\n'), 'latin1').digest('hex');
}

export function fileSha256(content: string): string {
  return createHash('sha256').update(content, 'latin1').digest('hex');
}

export function serializeAfd(lines: readonly string[]): string {
  return `${lines.join('\n')}\n`;
}

export function encodeType1(input: AfdType1Input): string {
  return finish(
    base(input.nsr, '1') +
      digits(input.employerTaxId, 14) +
      left(input.employerName, 100) +
      timestamp(input.generatedAt) +
      dateOnly(input.periodStart) +
      dateOnly(input.periodEnd) +
      AFD_LAYOUT_VERSION,
  );
}

export function encodeType4(input: AfdType4Input): string {
  return finish(
    base(input.nsr, '4') +
      left(input.employeeIdentifier, 36) +
      timestamp(input.recordedAt) +
      left(input.source, 5) +
      left(input.repDeviceId, 36) +
      left(input.recordHash ?? '', 64) +
      left(input.employeeName ?? '', 80),
  );
}

export function encodeType9(input: AfdType9Input): string {
  return finish(
    base(input.nsr, '9') +
      dateOnly(input.periodStart) +
      dateOnly(input.periodEnd) +
      right(input.lineCount, 9) +
      left(input.trailerHash, 64) +
      AFD_LAYOUT_VERSION,
  );
}

export function encodeGenericRecord(
  type: Exclude<AfdRecordType, '1' | '4' | '9'>,
  nsr: number,
  payload: string,
): string {
  return finish(base(nsr, type) + left(payload, AFD_LINE_WIDTH - 10));
}

export function decodeLine(line: string, lineNo = 1): AfdRecord {
  if (line.length !== AFD_LINE_WIDTH) {
    throw new BadRequestException(
      `AFD line ${lineNo} must have ${AFD_LINE_WIDTH} characters`,
    );
  }
  const nsr = Number(line.slice(0, 9));
  const type = line.slice(9, 10) as AfdRecordType;
  if (!Number.isInteger(nsr) || nsr < 0 || !/^[1-9]$/.test(type)) {
    throw new BadRequestException(`AFD line ${lineNo} has invalid NSR or type`);
  }

  if (type === '1') {
    return {
      nsr,
      type,
      rawLine: line,
      fields: {
        employerTaxId: line.slice(10, 24).trim(),
        employerName: line.slice(24, 124).trim(),
        generatedAt: parseTimestamp(line.slice(124, 138)),
        periodStart: line.slice(138, 146).trim(),
        periodEnd: line.slice(146, 154).trim(),
        layoutVersion: line.slice(154, 160).trim(),
      },
    };
  }

  if (type === '4') {
    return {
      nsr,
      type,
      rawLine: line,
      fields: {
        employeeIdentifier: line.slice(10, 46).trim(),
        recordedAt: parseTimestamp(line.slice(46, 60)),
        source: line.slice(60, 65).trim(),
        repDeviceId: line.slice(65, 101).trim(),
        recordHash: line.slice(101, 165).trim(),
        employeeName: line.slice(165, 245).trim(),
      },
    };
  }

  if (type === '9') {
    return {
      nsr,
      type,
      rawLine: line,
      fields: {
        periodStart: line.slice(10, 18).trim(),
        periodEnd: line.slice(18, 26).trim(),
        lineCount: Number(line.slice(26, 35)),
        trailerHash: line.slice(35, 99).trim(),
        layoutVersion: line.slice(99, 105).trim(),
      },
    };
  }

  return {
    nsr,
    type,
    rawLine: line,
    fields: {
      payload: line.slice(10).trim(),
    },
  };
}

export function parseAfd(content: string): ParsedAfdFile {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((line, index, all) => {
    return !(index === all.length - 1 && line === '');
  });
  if (lines.length < 2) {
    throw new BadRequestException(
      'AFD content must contain header and trailer',
    );
  }
  const records = lines.map((line, index) => decodeLine(line, index + 1));
  const trailer = records.at(-1);
  if (!trailer || trailer.type !== '9') {
    throw new BadRequestException('AFD trailer type 9 is required');
  }
  const bodyLines = lines.slice(0, -1);
  const expectedTrailerHash = trailerHashForLines(bodyLines);
  if (String(trailer.fields['trailerHash']) !== expectedTrailerHash) {
    throw new BadRequestException('AFD trailer hash is invalid');
  }
  if (Number(trailer.fields['lineCount']) !== lines.length) {
    throw new BadRequestException('AFD trailer line count is invalid');
  }
  return {
    records,
    lines,
    bodyLines,
    trailer,
    fileSha256: fileSha256(serializeAfd(lines)),
  };
}
