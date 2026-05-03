import {
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../../database/database.service';

export type ConsignmentLoanKind = 'PAYROLL_LOAN' | 'CARD' | 'OTHER';
type ConsignmentMarginBucket = 'general' | 'credit card' | 'benefit card';

interface ParameterRow extends QueryResultRow {
  key: string;
  value: string;
}

interface BaseRow extends QueryResultRow {
  net_base: string;
}

interface UsedRow extends QueryResultRow {
  used_general: string;
  used_credit_card: string;
  used_benefit_card: string;
}

export interface MarginCalculationInput {
  employeeId: string;
  competence: string;
  netBase?: string;
  generalPercent?: string;
  creditCardPercent?: string;
  benefitCardPercent?: string;
  usedGeneral?: string;
  usedCreditCard?: string;
  usedBenefitCard?: string;
}

export interface ConsignmentMargin {
  employeeId: string;
  competence: string;
  netBase: string;
  availableGeneral: string;
  availableCreditCard: string;
  availableBenefitCard: string;
  usedGeneral: string;
  usedCreditCard: string;
  usedBenefitCard: string;
  generalPercent: string;
  creditCardPercent: string;
  benefitCardPercent: string;
}

@Injectable()
export class MarginCalculatorService {
  constructor(private readonly databaseService: DatabaseService) {}

  calculate(input: MarginCalculationInput): ConsignmentMargin {
    this.assertCompetence(input.competence);
    const netBase = money(input.netBase ?? '0');
    const generalPercent = decimal(input.generalPercent ?? '0.35');
    const creditCardPercent = decimal(input.creditCardPercent ?? '0.05');
    const benefitCardPercent = decimal(input.benefitCardPercent ?? '0.05');
    const usedGeneral = money(input.usedGeneral ?? '0');
    const usedCreditCard = money(input.usedCreditCard ?? '0');
    const usedBenefitCard = money(input.usedBenefitCard ?? '0');

    return {
      employeeId: input.employeeId,
      competence: input.competence,
      netBase: netBase.toFixed(2),
      availableGeneral: Decimal.max(
        netBase.mul(generalPercent).toDecimalPlaces(2).minus(usedGeneral),
        0,
      ).toFixed(2),
      availableCreditCard: Decimal.max(
        netBase.mul(creditCardPercent).toDecimalPlaces(2).minus(usedCreditCard),
        0,
      ).toFixed(2),
      availableBenefitCard: Decimal.max(
        netBase
          .mul(benefitCardPercent)
          .toDecimalPlaces(2)
          .minus(usedBenefitCard),
        0,
      ).toFixed(2),
      usedGeneral: usedGeneral.toFixed(2),
      usedCreditCard: usedCreditCard.toFixed(2),
      usedBenefitCard: usedBenefitCard.toFixed(2),
      generalPercent: generalPercent.toFixed(6),
      creditCardPercent: creditCardPercent.toFixed(6),
      benefitCardPercent: benefitCardPercent.toFixed(6),
    };
  }

  async getMargin(
    employeeId: string,
    competence: string,
    client?: PoolClient,
  ): Promise<ConsignmentMargin> {
    this.ensureDatabase();
    this.assertCompetence(competence);
    if (client) return this.getMarginWithClient(client, employeeId, competence);
    return this.databaseService.transaction((tx) =>
      this.getMarginWithClient(tx, employeeId, competence),
    );
  }

  assertAmountFits(
    margin: ConsignmentMargin,
    kind: ConsignmentLoanKind,
    monthlyAmount: string,
  ): void {
    const amount = money(monthlyAmount);
    const bucket = marginBucketForKind(kind);
    const available = money(availableForBucket(margin, bucket));
    if (amount.gt(available)) {
      throw new UnprocessableEntityException(
        `Consignment loan monthly amount ${amount.toFixed(2)} exceeds available ${bucket} margin ${available.toFixed(2)}.`,
      );
    }
  }

  private async getMarginWithClient(
    client: PoolClient,
    employeeId: string,
    competence: string,
  ): Promise<ConsignmentMargin> {
    const [year, month] = parseCompetence(competence);
    const parameterRows = await client.query<ParameterRow>(
      `
      SELECT key, value
      FROM public.system_parameter
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND key IN (
          'consignment.margin.general_pct',
          'consignment.margin.credit_card_pct',
          'consignment.margin.benefit_card_pct'
        )
      `,
    );
    const parameters = new Map(
      parameterRows.rows.map((row) => [row.key, row.value]),
    );
    const base = await client.query<BaseRow>(
      `
      SELECT coalesce(record.net_amount, 0)::numeric(14, 2)::text AS net_base
      FROM hr.employee employee
      LEFT JOIN payroll.payroll_financial_record record
        ON record.tenant_id = employee.tenant_id
       AND record.employee_id = employee.id
       AND record.competence_year = $2
       AND record.competence_month = $3
      WHERE employee.tenant_id = public.sgp_current_tenant_uuid()
        AND employee.id = $1::uuid
      ORDER BY record.generated_at DESC NULLS LAST
      LIMIT 1
      `,
      [employeeId, year, month],
    );
    if (!base.rows[0]) {
      throw new UnprocessableEntityException(
        'Employee is not visible for consignment margin calculation.',
      );
    }

    const used = await client.query<UsedRow>(
      `
      SELECT
        coalesce(sum(CASE WHEN kind = 'PAYROLL_LOAN' THEN monthly_amount ELSE 0 END), 0)::numeric(14, 2)::text AS used_general,
        coalesce(sum(CASE WHEN kind = 'CARD' THEN monthly_amount ELSE 0 END), 0)::numeric(14, 2)::text AS used_credit_card,
        coalesce(sum(CASE WHEN kind = 'OTHER' THEN monthly_amount ELSE 0 END), 0)::numeric(14, 2)::text AS used_benefit_card
      FROM payment.consignment_loan
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND employee_id = $1::uuid
        AND status = 'ACTIVE'
        AND make_date($2, $3, 1) BETWEEN date_trunc('month', valid_from)::date AND date_trunc('month', valid_to)::date
      `,
      [employeeId, year, month],
    );

    return this.calculate({
      employeeId,
      competence,
      netBase: base.rows[0].net_base,
      generalPercent:
        parameters.get('consignment.margin.general_pct') ?? '0.35',
      creditCardPercent:
        parameters.get('consignment.margin.credit_card_pct') ?? '0.05',
      benefitCardPercent:
        parameters.get('consignment.margin.benefit_card_pct') ?? '0.05',
      usedGeneral: used.rows[0]?.used_general ?? '0',
      usedCreditCard: used.rows[0]?.used_credit_card ?? '0',
      usedBenefitCard: used.rows[0]?.used_benefit_card ?? '0',
    });
  }

  private assertCompetence(competence: string): void {
    parseCompetence(competence);
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}

function marginBucketForKind(
  kind: ConsignmentLoanKind,
): ConsignmentMarginBucket {
  if (kind === 'CARD') return 'credit card';
  if (kind === 'OTHER') return 'benefit card';
  return 'general';
}

function availableForBucket(
  margin: ConsignmentMargin,
  bucket: ConsignmentMarginBucket,
): string {
  if (bucket === 'credit card') return margin.availableCreditCard;
  if (bucket === 'benefit card') return margin.availableBenefitCard;
  return margin.availableGeneral;
}

export function parseCompetence(competence: string): [number, number] {
  const match = /^(\d{4})-(\d{2})$/.exec(competence);
  if (!match) {
    throw new UnprocessableEntityException(
      'Competence must use YYYY-MM format.',
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new UnprocessableEntityException(
      'Competence must use YYYY-MM format.',
    );
  }
  return [year, month];
}

function decimal(value: string): Decimal {
  const parsed = new Decimal(value);
  if (!parsed.isFinite() || parsed.isNegative()) {
    throw new UnprocessableEntityException(
      'Decimal value must be non-negative.',
    );
  }
  return parsed;
}

function money(value: string): Decimal {
  return decimal(value).toDecimalPlaces(2);
}
