import { createHash } from 'node:crypto';

import Decimal from 'decimal.js';

export type TceFiscalReportType = 'RREO' | 'RGF';
export type TceFiscalReportSourceStatus = 'CALLER_SELECTED_LRF_STRUCTURE';
export type TceFiscalReportLayoutStatus = 'UNVERIFIED_LAYOUT';
export type TceFiscalReportPeriodKind = 'BIMESTER' | 'QUADRIMESTER';
export type TceFiscalReportPower =
  | 'EXECUTIVE'
  | 'LEGISLATIVE'
  | 'JUDICIARY'
  | 'PUBLIC_PROSECUTION'
  | 'COURT_OF_ACCOUNTS'
  | 'OTHER';
export type TceFiscalReportSphere = 'MUNICIPAL' | 'STATE' | 'FEDERAL';
export type TceFiscalReportStateCode = 'SP' | 'MG';

export interface TceFiscalReportEntity {
  tenantId: string;
  ibgeCode: string;
  name: string;
  cnpj: string;
  power: TceFiscalReportPower;
  sphere: TceFiscalReportSphere;
}

export interface TceFiscalReportResponsible {
  name: string;
  role: string;
  registration: string;
}

export interface TceFiscalReportPeriod {
  fiscalYear: number;
  periodKind: TceFiscalReportPeriodKind;
  periodNumber: number;
  startsOn: string;
  endsOn: string;
  legalDeadline: string;
}

export interface TceFiscalReportSourceLedger {
  closureId: string;
  closedAt: string;
  sourceHash: string;
  accountingSystem: string;
  payrollRunIds: string[];
}

export interface TceFiscalReportPublicationEvidence {
  transparencyUrl: string;
  publishedAt: string;
  evidenceHash: string;
}

export interface TceFiscalReportTargetProfile {
  adapterId: string;
  stateCode: TceFiscalReportStateCode;
  courtName: string;
  systemName: string;
  transportMode: string;
  sourceUrl: string;
  layoutStatus: TceFiscalReportLayoutStatus;
}

export interface TceFiscalReportBaseInput {
  sourceStatus: TceFiscalReportSourceStatus;
  layoutEdition: string;
  legalSourceUrl: string;
  generatedAt: string;
  targetState: TceFiscalReportStateCode;
  entity: TceFiscalReportEntity;
  responsible: TceFiscalReportResponsible;
  period: TceFiscalReportPeriod;
  sourceLedger: TceFiscalReportSourceLedger;
  publicationEvidence?: TceFiscalReportPublicationEvidence;
}

export interface TceFiscalReportEnvelope<
  TReportType extends TceFiscalReportType,
  TSummary,
  TStatement,
> {
  schemaVersion: string;
  reportType: TReportType;
  sourceStatus: TceFiscalReportSourceStatus;
  officialConformance: false;
  layoutEdition: string;
  legalSourceUrl: string;
  generatedAt: string;
  target: TceFiscalReportTargetProfile;
  entity: TceFiscalReportEntity;
  responsible: TceFiscalReportResponsible;
  period: TceFiscalReportPeriod;
  sourceLedger: TceFiscalReportSourceLedger;
  summary: TSummary;
  statements: TStatement[];
  publicationEvidence: TceFiscalReportPublicationEvidence | null;
  evidenceHash: string;
  idempotencyKey: string;
}

export interface RreoBuilderInput extends TceFiscalReportBaseInput {
  period: TceFiscalReportPeriod & { periodKind: 'BIMESTER' };
  lines: RreoStatementLineInput[];
}

export interface RreoStatementLineInput {
  annex: string;
  table: string;
  accountCode: string;
  label: string;
  budgetFunction?: string;
  currentPeriodAmount: string;
  yearToDateAmount: string;
  sourceLedgerRef: string;
}

export interface RreoStatementLine {
  annex: string;
  table: string;
  accountCode: string;
  label: string;
  budgetFunction: string | null;
  currentPeriodAmount: string;
  yearToDateAmount: string;
  sourceLedgerRef: string;
}

export interface RreoSummary {
  currentPeriodTotal: string;
  yearToDateTotal: string;
  lineCount: number;
}

export type RreoFiscalReportEnvelope = TceFiscalReportEnvelope<
  'RREO',
  RreoSummary,
  RreoStatementLine
>;

const STATE_PROFILES: Record<
  TceFiscalReportStateCode,
  TceFiscalReportTargetProfile
> = {
  SP: {
    adapterId: 'audesp-sp',
    stateCode: 'SP',
    courtName: 'TCE-SP',
    systemName: 'AUDESP-SP',
    transportMode: 'audesp-portal-stub',
    sourceUrl: 'https://www.tce.sp.gov.br/audesp',
    layoutStatus: 'UNVERIFIED_LAYOUT',
  },
  MG: {
    adapterId: 'tce-mg',
    stateCode: 'MG',
    courtName: 'TCE-MG',
    systemName: 'SICOM/TCE-MG',
    transportMode: 'tce-mg-portal-stub',
    sourceUrl: 'https://www.tce.mg.gov.br/',
    layoutStatus: 'UNVERIFIED_LAYOUT',
  },
};

export class RreoBuilder {
  build(input: RreoBuilderInput): RreoFiscalReportEnvelope {
    assertFiscalReportBase(input, 'RREO', 'BIMESTER', 6);
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new Error(
        'RREO lines must include at least one fiscal statement line.',
      );
    }

    const statements = input.lines.map((line, index) => ({
      annex: requiredText(line.annex, `lines[${index}].annex`),
      table: requiredText(line.table, `lines[${index}].table`),
      accountCode: requiredText(
        line.accountCode,
        `lines[${index}].accountCode`,
      ),
      label: requiredText(line.label, `lines[${index}].label`),
      budgetFunction: line.budgetFunction ?? null,
      currentPeriodAmount: money(
        line.currentPeriodAmount,
        `lines[${index}].currentPeriodAmount`,
      ),
      yearToDateAmount: money(
        line.yearToDateAmount,
        `lines[${index}].yearToDateAmount`,
      ),
      sourceLedgerRef: requiredText(
        line.sourceLedgerRef,
        `lines[${index}].sourceLedgerRef`,
      ),
    }));

    return buildFiscalReportEnvelope({
      input,
      reportType: 'RREO',
      schemaVersion: 'tce-rreo-v01',
      summary: {
        currentPeriodTotal: sumMoney(
          statements.map((line) => line.currentPeriodAmount),
        ),
        yearToDateTotal: sumMoney(
          statements.map((line) => line.yearToDateAmount),
        ),
        lineCount: statements.length,
      },
      statements,
    });
  }
}

export function buildRreoFiscalReport(
  input: RreoBuilderInput,
): RreoFiscalReportEnvelope {
  return new RreoBuilder().build(input);
}

export function tceFiscalReportStateProfile(
  stateCode: TceFiscalReportStateCode,
): TceFiscalReportTargetProfile {
  return STATE_PROFILES[stateCode];
}

export function assertFiscalReportBase(
  input: TceFiscalReportBaseInput,
  reportType: TceFiscalReportType,
  expectedPeriodKind: TceFiscalReportPeriodKind,
  maxPeriodNumber: number,
): void {
  if (input.sourceStatus !== 'CALLER_SELECTED_LRF_STRUCTURE') {
    throw new Error(
      `${reportType} sourceStatus must be CALLER_SELECTED_LRF_STRUCTURE.`,
    );
  }
  requiredText(input.layoutEdition, 'layoutEdition');
  requiredText(input.legalSourceUrl, 'legalSourceUrl');
  requiredText(input.generatedAt, 'generatedAt');
  assertIsoDateTime(input.generatedAt, 'generatedAt');

  if (!STATE_PROFILES[input.targetState]) {
    throw new Error(
      `Unsupported TCE fiscal report state: ${input.targetState}`,
    );
  }

  requiredText(input.entity?.tenantId, 'entity.tenantId');
  requiredText(input.entity?.ibgeCode, 'entity.ibgeCode');
  requiredText(input.entity?.name, 'entity.name');
  requiredText(input.entity?.cnpj, 'entity.cnpj');
  requiredText(input.entity?.power, 'entity.power');
  requiredText(input.entity?.sphere, 'entity.sphere');
  requiredText(input.responsible?.name, 'responsible.name');
  requiredText(input.responsible?.role, 'responsible.role');
  requiredText(input.responsible?.registration, 'responsible.registration');

  if (input.period?.periodKind !== expectedPeriodKind) {
    throw new Error(`${reportType} periodKind must be ${expectedPeriodKind}.`);
  }
  if (
    !Number.isInteger(input.period.periodNumber) ||
    input.period.periodNumber < 1 ||
    input.period.periodNumber > maxPeriodNumber
  ) {
    throw new Error(
      `${reportType} periodNumber must be between 1 and ${maxPeriodNumber}.`,
    );
  }
  if (
    !Number.isInteger(input.period.fiscalYear) ||
    input.period.fiscalYear < 2000
  ) {
    throw new Error(`${reportType} fiscalYear must be a valid fiscal year.`);
  }
  requiredText(input.period.startsOn, 'period.startsOn');
  requiredText(input.period.endsOn, 'period.endsOn');
  requiredText(input.period.legalDeadline, 'period.legalDeadline');
  assertDate(input.period.startsOn, 'period.startsOn');
  assertDate(input.period.endsOn, 'period.endsOn');
  assertDate(input.period.legalDeadline, 'period.legalDeadline');

  requiredText(input.sourceLedger?.closureId, 'sourceLedger.closureId');
  requiredText(input.sourceLedger?.closedAt, 'sourceLedger.closedAt');
  requiredText(input.sourceLedger?.sourceHash, 'sourceLedger.sourceHash');
  requiredText(
    input.sourceLedger?.accountingSystem,
    'sourceLedger.accountingSystem',
  );
  assertIsoDateTime(input.sourceLedger.closedAt, 'sourceLedger.closedAt');
  if (!Array.isArray(input.sourceLedger.payrollRunIds)) {
    throw new Error('sourceLedger.payrollRunIds must be an array.');
  }

  if (input.publicationEvidence) {
    requiredText(
      input.publicationEvidence.transparencyUrl,
      'publicationEvidence.transparencyUrl',
    );
    requiredText(
      input.publicationEvidence.publishedAt,
      'publicationEvidence.publishedAt',
    );
    requiredText(
      input.publicationEvidence.evidenceHash,
      'publicationEvidence.evidenceHash',
    );
    assertIsoDateTime(
      input.publicationEvidence.publishedAt,
      'publicationEvidence.publishedAt',
    );
  }
}

export function buildFiscalReportEnvelope<
  TReportType extends TceFiscalReportType,
  TSummary,
  TStatement,
>(options: {
  input: TceFiscalReportBaseInput;
  reportType: TReportType;
  schemaVersion: string;
  summary: TSummary;
  statements: TStatement[];
}): TceFiscalReportEnvelope<TReportType, TSummary, TStatement> {
  const base = {
    schemaVersion: options.schemaVersion,
    reportType: options.reportType,
    sourceStatus: options.input.sourceStatus,
    officialConformance: false as const,
    layoutEdition: options.input.layoutEdition,
    legalSourceUrl: options.input.legalSourceUrl,
    generatedAt: options.input.generatedAt,
    target: tceFiscalReportStateProfile(options.input.targetState),
    entity: options.input.entity,
    responsible: options.input.responsible,
    period: options.input.period,
    sourceLedger: options.input.sourceLedger,
    summary: options.summary,
    statements: options.statements,
    publicationEvidence: options.input.publicationEvidence ?? null,
  };
  const evidenceHash = sha256(JSON.stringify(base));

  return {
    ...base,
    evidenceHash,
    idempotencyKey: [
      'sgp',
      'tce',
      options.reportType.toLowerCase(),
      options.input.targetState.toLowerCase(),
      String(options.input.period.fiscalYear),
      options.input.period.periodKind.toLowerCase(),
      String(options.input.period.periodNumber).padStart(2, '0'),
      options.input.sourceLedger.closureId,
      evidenceHash.slice(0, 16),
    ].join(':'),
  };
}

export function money(value: string, fieldPath: string): string {
  return decimal(value, fieldPath).toFixed(2);
}

export function percent(value: string, fieldPath: string): string {
  return decimal(value, fieldPath).toFixed(4);
}

export function decimal(value: string, fieldPath: string): Decimal {
  try {
    return new Decimal(requiredText(value, fieldPath));
  } catch {
    throw new Error(`${fieldPath} must be a decimal string.`);
  }
}

export function sumMoney(values: string[]): string {
  return values
    .reduce((total, value) => total.plus(value), new Decimal(0))
    .toFixed(2);
}

export function requiredText(
  value: string | undefined,
  fieldPath: string,
): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldPath} is required.`);
  }
  return value;
}

function assertDate(value: string, fieldPath: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldPath} must use YYYY-MM-DD.`);
  }
}

function assertIsoDateTime(value: string, fieldPath: string): void {
  if (Number.isNaN(Date.parse(value)) || !value.endsWith('Z')) {
    throw new Error(`${fieldPath} must be an ISO-8601 UTC timestamp.`);
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
