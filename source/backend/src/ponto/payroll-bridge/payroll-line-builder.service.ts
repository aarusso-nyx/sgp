import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  PayrollBridgeLine,
  PayrollBridgeLineCode,
  TimesheetPayrollAggregate,
} from './payroll-bridge.types';

const LINE_DEFINITIONS: ReadonlyArray<{
  code: PayrollBridgeLineCode;
  source: keyof Pick<
    TimesheetPayrollAggregate,
    | 'overtime50Minutes'
    | 'overtime100Minutes'
    | 'nightMinutes'
    | 'lateMinutes'
    | 'absenceUnpaidMinutes'
    | 'hourBankSettlementMinutes'
  >;
  kind: 'EARNING' | 'DEDUCTION';
  multiplier: string;
}> = [
  {
    code: 'PONTO_HE50',
    source: 'overtime50Minutes',
    kind: 'EARNING',
    multiplier: '1.5',
  },
  {
    code: 'PONTO_HE100',
    source: 'overtime100Minutes',
    kind: 'EARNING',
    multiplier: '2',
  },
  {
    code: 'PONTO_NIGHT',
    source: 'nightMinutes',
    kind: 'EARNING',
    multiplier: '0.2',
  },
  {
    code: 'PONTO_LATE',
    source: 'lateMinutes',
    kind: 'DEDUCTION',
    multiplier: '1',
  },
  {
    code: 'PONTO_ABSENCE',
    source: 'absenceUnpaidMinutes',
    kind: 'DEDUCTION',
    multiplier: '1',
  },
  {
    code: 'PONTO_HOUR_BANK',
    source: 'hourBankSettlementMinutes',
    kind: 'EARNING',
    multiplier: '1.5',
  },
];

interface RubricRow extends QueryResultRow {
  id: string;
  code: PayrollBridgeLineCode;
  kind: 'EARNING' | 'DEDUCTION';
}

interface EvaluationRow extends QueryResultRow {
  amount: string | number;
}

@Injectable()
export class PayrollLineBuilderService {
  constructor(private readonly databaseService: DatabaseService) {}

  async buildLines(
    aggregate: TimesheetPayrollAggregate,
    competenceMonth: number,
    competenceYear: number,
  ): Promise<PayrollBridgeLine[]> {
    this.ensureDatabase();
    const rubrics = await this.loadRubrics();
    const lines: PayrollBridgeLine[] = [];

    for (const definition of LINE_DEFINITIONS) {
      const sourceMinutes = Number(aggregate[definition.source]);
      if (sourceMinutes <= 0) continue;
      const rubric = rubrics.get(definition.code);
      if (!rubric) continue;
      const referenceValue = await this.evaluateRubric(
        rubric.id,
        aggregate.employeeId,
        competenceMonth,
        competenceYear,
      );
      const quantityHours = new Decimal(sourceMinutes).div(60);
      const amount = referenceValue
        .mul(quantityHours)
        .mul(new Decimal(definition.multiplier))
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      lines.push({
        code: definition.code,
        earningDeductionId: rubric.id,
        kind: definition.kind,
        quantityHours: quantityHours
          .toDecimalPlaces(4, Decimal.ROUND_HALF_UP)
          .toFixed(4),
        referenceValue: referenceValue
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
          .toFixed(2),
        amount: amount.toFixed(2),
        sourceMinutes,
      });
    }

    return lines;
  }

  private async loadRubrics(): Promise<Map<PayrollBridgeLineCode, RubricRow>> {
    const rows = await this.databaseService.query<RubricRow>(
      `
      SELECT id::text, code, kind::text AS kind
      FROM payroll.payroll_earning_deduction
      WHERE code = ANY($1::text[])
        AND active = true
      `,
      [LINE_DEFINITIONS.map((definition) => definition.code)],
    );
    return new Map(rows.map((row) => [row.code, row]));
  }

  private async evaluateRubric(
    earningDeductionId: string,
    employeeId: string,
    competenceMonth: number,
    competenceYear: number,
  ): Promise<Decimal> {
    const rows = await this.databaseService.query<EvaluationRow>(
      `
      SELECT payroll_calc.evaluate_earning_deduction(
        $1::uuid,
        $2::uuid,
        $3::integer,
        $4::integer
      ) AS amount
      `,
      [earningDeductionId, employeeId, competenceMonth, competenceYear],
    );
    return new Decimal(rows[0]?.amount ?? 0);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
