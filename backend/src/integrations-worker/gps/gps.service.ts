import { createHash } from 'node:crypto';

import {
  Injectable,
  PreconditionFailedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { PoolClient, QueryResultRow } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import {
  GenerateGpsDto,
  GpsPaymentCodeDto,
  GpsRemittanceDetailsDto,
  GpsRemittanceDto,
  GpsReason,
  GpsStatus,
} from './gps.dto';
import { GPSDuplicatesDCTFWebError } from './gps.errors';
import { calculateGpsLateCharges } from './gps-late-charges';
import { GpsTxtSerializer } from './gps-txt.serializer';

interface PaymentCodeRow extends QueryResultRow {
  id: string;
  code: string;
  description: string;
  applies_to: GpsPaymentCodeDto['appliesTo'];
  active: boolean;
  valid_from: Date | string;
  valid_to: Date | string | null;
}

interface RemittanceRow extends QueryResultRow {
  id: string;
  competence: Date | string;
  payment_code_id: string;
  payment_code: string;
  payment_code_description: string;
  reason: GpsReason;
  reason_detail: string;
  base_amount: string;
  amount: string;
  interest_amount: string;
  fine_amount: string;
  total_amount: string;
  status: GpsStatus;
  file_uri: string | null;
  txt_content?: string;
  txt_hash: string;
  generated_at: Date | string;
  paid_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface BaseRow extends QueryResultRow {
  base_amount: string;
  amount: string;
}

@Injectable()
export class GpsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly serializer: GpsTxtSerializer,
  ) {}

  async list(
    reason?: GpsReason,
    status?: GpsStatus,
  ): Promise<GpsRemittanceDto[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RemittanceRow>(
      `
      SELECT
        id::text,
        competence,
        payment_code_id::text,
        payment_code,
        payment_code_description,
        reason::text,
        reason_detail,
        base_amount::text,
        amount::text,
        interest_amount::text,
        fine_amount::text,
        total_amount::text,
        status::text,
        file_uri,
        txt_hash,
        generated_at,
        paid_at,
        created_at,
        updated_at
      FROM fiscal.v_gps_remittance_summary
      WHERE ($1::fiscal.gps_remittance_reason IS NULL OR reason = $1::fiscal.gps_remittance_reason)
        AND ($2::fiscal.gps_remittance_status IS NULL OR status = $2::fiscal.gps_remittance_status)
      ORDER BY competence DESC, generated_at DESC
      `,
      [reason ?? null, status ?? null],
    );
    return rows.map(toRemittanceDto);
  }

  async find(id: string): Promise<GpsRemittanceDetailsDto> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RemittanceRow>(
      `
      SELECT
        remittance.id::text,
        remittance.competence,
        remittance.payment_code_id::text,
        code.code AS payment_code,
        code.description AS payment_code_description,
        remittance.reason::text,
        remittance.reason_detail,
        remittance.base_amount::text,
        remittance.amount::text,
        remittance.interest_amount::text,
        remittance.fine_amount::text,
        remittance.total_amount::text,
        remittance.status::text,
        remittance.file_uri,
        remittance.txt_content,
        remittance.txt_hash,
        remittance.generated_at,
        remittance.paid_at,
        remittance.created_at,
        remittance.updated_at
      FROM fiscal.gps_remittance remittance
      JOIN fiscal.gps_payment_code code ON code.id = remittance.payment_code_id
      WHERE remittance.id = $1::uuid
      `,
      [id],
    );
    const row = rows[0];
    if (!row) {
      throw new PreconditionFailedException('GPS remittance not found');
    }
    return { ...toRemittanceDto(row), txtContent: row.txt_content ?? '' };
  }

  async paymentCodes(): Promise<GpsPaymentCodeDto[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<PaymentCodeRow>(
      `
      SELECT id::text, code, description, applies_to::text, active, valid_from, valid_to
      FROM fiscal.gps_payment_code
      WHERE active = true
        AND valid_from <= current_date
        AND (valid_to IS NULL OR valid_to >= current_date)
      ORDER BY code
      `,
    );
    return rows.map(toPaymentCodeDto);
  }

  async generateResidualGPS(
    input: GenerateGpsDto,
  ): Promise<GpsRemittanceDetailsDto> {
    this.ensureDatabase();
    const tenantId = this.currentTenantId();
    const competence = monthStart(input.competence);
    const reasonDetail = input.reasonDetail.trim();
    if (!reasonDetail) {
      throw new PreconditionFailedException('GPS reason detail is required');
    }

    const id = await this.databaseService.transaction(async (client) => {
      await this.assertNoDctfweb(client, tenantId, competence);
      const code = await this.loadPaymentCode(
        client,
        input.paymentCodeId,
        competence,
      );
      const source = await this.loadResidualBase(client, tenantId, competence);
      await this.evaluateFormulaHookIfConfigured(client, tenantId, competence);
      const charges = calculateGpsLateCharges({
        competence,
        amount: source.amount,
      });
      const generatedAt = new Date().toISOString();
      const txt = this.serializer.serialize({
        layout: 'GPS-IN925-2009',
        tenantId,
        competence,
        paymentCode: code.code,
        reason: input.reason,
        baseAmount: source.base_amount,
        amount: source.amount,
        interestAmount: charges.interestAmount,
        fineAmount: charges.fineAmount,
        totalAmount: charges.totalAmount,
        generatedAt,
      });
      const txtHash = sha256(txt);
      const fileUri = `s3://local-fiscal/${tenantId}/gps/${competence}/${code.code}/${txtHash}.txt`;

      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO fiscal.gps_remittance (
          tenant_id,
          competence,
          payment_code_id,
          reason,
          reason_detail,
          base_amount,
          amount,
          interest_amount,
          fine_amount,
          total_amount,
          status,
          file_uri,
          txt_content,
          txt_hash,
          generated_at
        )
        VALUES (
          $1::uuid,
          $2::date,
          $3::uuid,
          $4::fiscal.gps_remittance_reason,
          $5,
          $6::numeric(14,2),
          $7::numeric(14,2),
          $8::numeric(14,2),
          $9::numeric(14,2),
          $10::numeric(14,2),
          'GENERATED'::fiscal.gps_remittance_status,
          $11,
          $12,
          $13,
          $14::timestamptz
        )
        RETURNING id::text
        `,
        [
          tenantId,
          competence,
          input.paymentCodeId,
          input.reason,
          reasonDetail,
          source.base_amount,
          source.amount,
          charges.interestAmount,
          charges.fineAmount,
          charges.totalAmount,
          fileUri,
          txt,
          txtHash,
          generatedAt,
        ],
      );
      return inserted.rows[0]!.id;
    });

    return this.find(id);
  }

  private async assertNoDctfweb(
    client: PoolClient,
    tenantId: string,
    competence: string,
  ): Promise<void> {
    try {
      await client.query(
        'SELECT fiscal.assert_no_dctfweb_for_competence($1::uuid, $2::date)',
        [tenantId, competence],
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('GPS residual duplicates')
      ) {
        throw new GPSDuplicatesDCTFWebError(competence);
      }
      throw error;
    }
  }

  private async loadPaymentCode(
    client: PoolClient,
    paymentCodeId: string,
    competence: string,
  ): Promise<PaymentCodeRow> {
    const result = await client.query<PaymentCodeRow>(
      `
      SELECT id::text, code, description, applies_to::text, active, valid_from, valid_to
      FROM fiscal.gps_payment_code
      WHERE id = $1::uuid
        AND active = true
        AND valid_from <= $2::date
        AND (valid_to IS NULL OR valid_to >= $2::date)
      `,
      [paymentCodeId, competence],
    );
    const code = result.rows[0];
    if (!code) {
      throw new PreconditionFailedException(
        'Active GPS payment code not found for competence',
      );
    }
    return code;
  }

  private async loadResidualBase(
    client: PoolClient,
    tenantId: string,
    competence: string,
  ): Promise<BaseRow> {
    const result = await client.query<BaseRow>(
      `
      SELECT
        COALESCE(sum(item.base_amount), 0)::numeric(14,2)::text AS base_amount,
        COALESCE(sum(item.amount), 0)::numeric(14,2)::text AS amount
      FROM payroll.v_payroll_run_line_active item
      JOIN payroll.payroll_earning_deduction earning
        ON earning.id = item.earning_deduction_id
      JOIN payroll.payroll_run run
        ON run.id = item.payroll_run_id
       AND run.tenant_id = item.tenant_id
       AND run.status IN (
         'GENERATED'::public."PayrollRunStatus",
         'APPROVED'::public."PayrollRunStatus",
         'PAID'::public."PayrollRunStatus",
         'CLOSED'::public."PayrollRunStatus"
       )
      WHERE item.tenant_id = $1::uuid
        AND make_date(item.competence_year, item.competence_month, 1) = $2::date
        AND earning.kind = 'DEDUCTION'::public."PayrollEntryKind"
        AND (
          earning.code IN ('INSS', 'RGPS')
          OR earning.description ILIKE '%inss%'
          OR earning.incidences ? 'official_social_security'
        )
      `,
      [tenantId, competence],
    );
    const row = result.rows[0] ?? { base_amount: '0.00', amount: '0.00' };
    if (new Decimal(row.amount).lte(0)) {
      throw new PreconditionFailedException(
        'Residual GPS requires positive RGPS totalizers',
      );
    }
    return row;
  }

  private async evaluateFormulaHookIfConfigured(
    client: PoolClient,
    tenantId: string,
    competence: string,
  ): Promise<void> {
    const [year, month] = competence.slice(0, 7).split('-').map(Number);
    await client.query(
      `
      SELECT payroll_calc.evaluate_earning_deduction(ped.id, employee.id, $3::integer, $4::integer)
      FROM payroll.payroll_earning_deduction ped
      JOIN hr.employee employee ON employee.tenant_id = ped.tenant_id
      WHERE ped.tenant_id = $1::uuid
        AND ped.formula_ready = true
        AND ped.code = 'GPS_LATE_CHARGE'
        AND EXISTS (
          SELECT 1
          FROM payroll.v_payroll_run_line_active item
          WHERE item.tenant_id = $1::uuid
            AND item.employee_id = employee.id
            AND make_date(item.competence_year, item.competence_month, 1) = $2::date
        )
      LIMIT 1
      `,
      [tenantId, competence, month, year],
    );
  }

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new PreconditionFailedException(
        'Tenant context is required for GPS',
      );
    }
    return tenantId;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for GPS operations',
      );
    }
  }
}

function toPaymentCodeDto(row: PaymentCodeRow): GpsPaymentCodeDto {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    appliesTo: row.applies_to,
    active: row.active,
    validFrom: dateOnly(row.valid_from),
    validTo: row.valid_to ? dateOnly(row.valid_to) : null,
  };
}

function toRemittanceDto(row: RemittanceRow): GpsRemittanceDto {
  return {
    id: row.id,
    competence: dateOnly(row.competence),
    paymentCodeId: row.payment_code_id,
    paymentCode: row.payment_code,
    paymentCodeDescription: row.payment_code_description,
    reason: row.reason,
    reasonDetail: row.reason_detail,
    baseAmount: row.base_amount,
    amount: row.amount,
    interestAmount: row.interest_amount,
    fineAmount: row.fine_amount,
    totalAmount: row.total_amount,
    status: row.status,
    fileUri: row.file_uri,
    txtHash: row.txt_hash,
    generatedAt: timestamp(row.generated_at),
    paidAt: row.paid_at ? timestamp(row.paid_at) : null,
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  };
}

function monthStart(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function dateOnly(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10);
}

function timestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
