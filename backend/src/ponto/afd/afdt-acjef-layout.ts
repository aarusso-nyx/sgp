import { createHash } from 'node:crypto';

import {
  formatDateOnlyUtc,
  formatInstantIso,
} from '../payroll-bridge/tenant-timezone.util';

export const AFDT_LAYOUT_VERSION = 'SGP-AFDT-001';
export const ACJEF_LAYOUT_VERSION = 'SGP-ACJEF-001';

export interface AfdtHeaderInput {
  employerTaxId: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  generatedAt: string | Date;
}

export interface AfdtRecordInput {
  nsr: number;
  employeeId: string;
  employeeRegistration: string;
  employeeCpf: string | null;
  employeeName: string;
  recordedAt: string | Date;
  source: string;
  repDeviceId: string;
  recordHash: string;
}

export interface AcjefSummaryInput {
  employeeId: string;
  employeeRegistration: string;
  employeeCpf: string | null;
  employeeName: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  workedMinutes: number;
  expectedMinutes: number;
  overtime50Minutes: number;
  overtime100Minutes: number;
  nightMinutes: number;
  lateMinutes: number;
  absenceUnpaidMinutes: number;
  absencePaidMinutes: number;
  hourBankSettlementMinutes: number;
}

function field(value: string | number | null | undefined): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[;\r\n]+/g, ' ')
    .trim();
}

function dateField(value: string | Date): string {
  return formatDateOnlyUtc(value);
}

function instantField(value: string | Date): string {
  return formatInstantIso(value);
}

function sha256(lines: readonly string[]): string {
  return createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex');
}

export function serializeFiscalFlatFile(lines: readonly string[]): string {
  return `${lines.join('\n')}\n`;
}

export function serializeAfdt(
  header: AfdtHeaderInput,
  records: readonly AfdtRecordInput[],
): string[] {
  const bodyLines = [
    [
      'AFDT',
      AFDT_LAYOUT_VERSION,
      field(header.employerTaxId),
      dateField(header.periodStart),
      dateField(header.periodEnd),
      instantField(header.generatedAt),
    ].join(';'),
    ...records.map((record) =>
      [
        'AFDT-DETAIL',
        String(record.nsr).padStart(9, '0'),
        instantField(record.recordedAt),
        field(record.source),
        field(record.repDeviceId),
        field(record.employeeId),
        field(record.employeeRegistration),
        field(record.employeeCpf),
        field(record.employeeName),
        field(record.recordHash),
      ].join(';'),
    ),
  ];

  return [
    ...bodyLines,
    ['AFDT-TRAILER', bodyLines.length + 1, sha256(bodyLines)].join(';'),
  ];
}

export function serializeAcjef(
  header: AfdtHeaderInput,
  summaries: readonly AcjefSummaryInput[],
): string[] {
  const bodyLines = [
    [
      'ACJEF',
      ACJEF_LAYOUT_VERSION,
      field(header.employerTaxId),
      dateField(header.periodStart),
      dateField(header.periodEnd),
      instantField(header.generatedAt),
    ].join(';'),
    ...summaries.map((summary) =>
      [
        'ACJEF-SUMMARY',
        field(summary.employeeId),
        field(summary.employeeRegistration),
        field(summary.employeeCpf),
        field(summary.employeeName),
        dateField(summary.periodStart),
        dateField(summary.periodEnd),
        summary.workedMinutes,
        summary.expectedMinutes,
        summary.overtime50Minutes,
        summary.overtime100Minutes,
        summary.nightMinutes,
        summary.lateMinutes,
        summary.absenceUnpaidMinutes,
        summary.absencePaidMinutes,
        summary.hourBankSettlementMinutes,
      ].join(';'),
    ),
  ];

  return [
    ...bodyLines,
    ['ACJEF-TRAILER', bodyLines.length + 1, sha256(bodyLines)].join(';'),
  ];
}
