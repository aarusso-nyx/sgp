import Decimal from 'decimal.js';

import {
  assertFiscalReportBase,
  buildFiscalReportEnvelope,
  decimal,
  money,
  percent,
  requiredText,
  type TceFiscalReportBaseInput,
  type TceFiscalReportEnvelope,
  type TceFiscalReportPeriod,
} from './rreo.builder';

export interface RgfBuilderInput extends TceFiscalReportBaseInput {
  period: TceFiscalReportPeriod & { periodKind: 'QUADRIMESTER' };
  personnelLimit: RgfPersonnelLimitInput;
  lines: RgfStatementLineInput[];
}

export interface RgfPersonnelLimitInput {
  netCurrentRevenue: string;
  personnelExpenseTotal: string;
  legalLimitPercentage: string;
  alertLimitPercentage: string;
  prudentialLimitPercentage: string;
}

export interface RgfStatementLineInput {
  annex: string;
  table: string;
  lineCode: string;
  label: string;
  amount: string;
  sourceLedgerRef: string;
}

export interface RgfStatementLine {
  annex: string;
  table: string;
  lineCode: string;
  label: string;
  amount: string;
  sourceLedgerRef: string;
}

export interface RgfSummary {
  netCurrentRevenue: string;
  personnelExpenseTotal: string;
  personnelExpensePercentage: string;
  legalLimitPercentage: string;
  legalLimitAmount: string;
  prudentialLimitPercentage: string;
  prudentialLimitAmount: string;
  alertLimitPercentage: string;
  alertLimitAmount: string;
  legalMarginAmount: string;
  exceedsLegalLimit: boolean;
  lineCount: number;
}

export type RgfFiscalReportEnvelope = TceFiscalReportEnvelope<
  'RGF',
  RgfSummary,
  RgfStatementLine
>;

export class RgfBuilder {
  build(input: RgfBuilderInput): RgfFiscalReportEnvelope {
    assertFiscalReportBase(input, 'RGF', 'QUADRIMESTER', 3);
    assertPersonnelLimit(input.personnelLimit);
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new Error(
        'RGF lines must include at least one fiscal statement line.',
      );
    }

    const statements = input.lines.map((line, index) => ({
      annex: requiredText(line.annex, `lines[${index}].annex`),
      table: requiredText(line.table, `lines[${index}].table`),
      lineCode: requiredText(line.lineCode, `lines[${index}].lineCode`),
      label: requiredText(line.label, `lines[${index}].label`),
      amount: money(line.amount, `lines[${index}].amount`),
      sourceLedgerRef: requiredText(
        line.sourceLedgerRef,
        `lines[${index}].sourceLedgerRef`,
      ),
    }));
    const netCurrentRevenue = decimal(
      input.personnelLimit.netCurrentRevenue,
      'personnelLimit.netCurrentRevenue',
    );
    const personnelExpenseTotal = decimal(
      input.personnelLimit.personnelExpenseTotal,
      'personnelLimit.personnelExpenseTotal',
    );
    const legalLimitPercentage = decimal(
      input.personnelLimit.legalLimitPercentage,
      'personnelLimit.legalLimitPercentage',
    );
    const prudentialLimitPercentage = decimal(
      input.personnelLimit.prudentialLimitPercentage,
      'personnelLimit.prudentialLimitPercentage',
    );
    const alertLimitPercentage = decimal(
      input.personnelLimit.alertLimitPercentage,
      'personnelLimit.alertLimitPercentage',
    );
    const legalLimitAmount = percentageAmount(
      netCurrentRevenue,
      legalLimitPercentage,
    );
    const prudentialLimitAmount = percentageAmount(
      netCurrentRevenue,
      prudentialLimitPercentage,
    );
    const alertLimitAmount = percentageAmount(
      netCurrentRevenue,
      alertLimitPercentage,
    );

    return buildFiscalReportEnvelope({
      input,
      reportType: 'RGF',
      schemaVersion: 'tce-rgf-v01',
      summary: {
        netCurrentRevenue: netCurrentRevenue.toFixed(2),
        personnelExpenseTotal: personnelExpenseTotal.toFixed(2),
        personnelExpensePercentage: personnelExpenseTotal
          .div(netCurrentRevenue)
          .mul(100)
          .toFixed(4),
        legalLimitPercentage: percent(
          input.personnelLimit.legalLimitPercentage,
          'personnelLimit.legalLimitPercentage',
        ),
        legalLimitAmount: legalLimitAmount.toFixed(2),
        prudentialLimitPercentage: percent(
          input.personnelLimit.prudentialLimitPercentage,
          'personnelLimit.prudentialLimitPercentage',
        ),
        prudentialLimitAmount: prudentialLimitAmount.toFixed(2),
        alertLimitPercentage: percent(
          input.personnelLimit.alertLimitPercentage,
          'personnelLimit.alertLimitPercentage',
        ),
        alertLimitAmount: alertLimitAmount.toFixed(2),
        legalMarginAmount: legalLimitAmount
          .minus(personnelExpenseTotal)
          .toFixed(2),
        exceedsLegalLimit: personnelExpenseTotal.gt(legalLimitAmount),
        lineCount: statements.length,
      },
      statements,
    });
  }
}

export function buildRgfFiscalReport(
  input: RgfBuilderInput,
): RgfFiscalReportEnvelope {
  return new RgfBuilder().build(input);
}

function assertPersonnelLimit(limit: RgfPersonnelLimitInput | undefined): void {
  if (!limit) {
    throw new Error('personnelLimit is required.');
  }
  decimal(limit.netCurrentRevenue, 'personnelLimit.netCurrentRevenue');
  decimal(limit.personnelExpenseTotal, 'personnelLimit.personnelExpenseTotal');
  decimal(limit.legalLimitPercentage, 'personnelLimit.legalLimitPercentage');
  decimal(
    limit.prudentialLimitPercentage,
    'personnelLimit.prudentialLimitPercentage',
  );
  decimal(limit.alertLimitPercentage, 'personnelLimit.alertLimitPercentage');
}

function percentageAmount(base: Decimal, percentage: Decimal): Decimal {
  return base.mul(percentage).div(100);
}
