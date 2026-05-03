import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  PreconditionFailedException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { PoolClient, QueryResultRow } from 'pg';

import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import {
  DirfArquivoDetailsDto,
  DirfArquivoDto,
  DirfArquivoKind,
  DirfBeneficiarioDto,
  DirfPagamentoDto,
  DirfSourcePayment,
  GenerateDirfDto,
} from './dirf.dto';
import {
  DirfBeneficiaryBlock,
  DirfFormatterService,
  layoutVersionForYear,
} from './dirf-formatter.service';
import { DirfValidatorService } from './dirf-validator.service';

interface SourcePaymentRow extends QueryResultRow {
  beneficiary_kind: DirfSourcePayment['beneficiaryKind'];
  beneficiary_document: string;
  beneficiary_name: string;
  revenue_code: string;
  month_year: Date | string;
  amount: string;
  irrf: string;
  deductions: Record<string, unknown> | string;
}

interface ArquivoRow extends QueryResultRow {
  id: string;
  year_base: number | string;
  kind: DirfArquivoKind;
  status: DirfArquivoDto['status'];
  original_arquivo_id: string | null;
  txt_ref: string;
  txt_content: string;
  txt_hash: string;
  layout_version: string;
  generated_at: Date | string | null;
  beneficiary_count: number | string;
  payment_count: number | string;
  total_amount: string;
  total_irrf: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface BeneficiaryRow extends QueryResultRow {
  id: string;
  cpf_cnpj: string;
  kind: DirfBeneficiarioDto['kind'];
  name: string;
  totals: Record<string, unknown> | string;
}

interface PaymentRow extends QueryResultRow {
  id: string;
  code: string;
  month_year: Date | string;
  amount: string;
  irrf: string;
  deductions: Record<string, unknown> | string;
}

/**
 * @deprecated DIRF file generation is retained only for year-base competences
 * before 2025-01-01. Use EFD-Reinf R-4000 for facts from 2025-01-01 onward.
 */
@Injectable()
export class DirfBuilderService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly formatter: DirfFormatterService,
    private readonly validator: DirfValidatorService,
  ) {}

  async list(yearBase?: number): Promise<DirfArquivoDto[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ArquivoRow>(
      `
      SELECT
        arquivo_id::text AS id,
        year_base,
        kind::text,
        status::text,
        original_arquivo_id::text,
        txt_ref,
        NULL::text AS txt_content,
        txt_hash,
        layout_version,
        generated_at,
        beneficiary_count,
        payment_count,
        total_amount::text,
        total_irrf::text,
        created_at,
        updated_at
      FROM fiscal.v_dirf_summary
      WHERE ($1::integer IS NULL OR year_base = $1::integer)
      ORDER BY year_base DESC, created_at DESC
      `,
      [yearBase ?? null],
    );
    return rows.map(toArquivoDto);
  }

  async find(id: string): Promise<DirfArquivoDetailsDto> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<ArquivoRow>(
      arquivoSelectSql('WHERE arquivo.id = $1::uuid'),
      [id],
    );
    const arquivo = rows[0];
    if (!arquivo) {
      throw new BadRequestException('DIRF arquivo not found');
    }

    const beneficiaries = await this.databaseService.query<BeneficiaryRow>(
      `
      SELECT id::text, cpf_cnpj, kind::text, name, totals
      FROM fiscal.dirf_beneficiario
      WHERE dirf_arquivo_id = $1::uuid
      ORDER BY cpf_cnpj
      `,
      [id],
    );
    const beneficiaryDtos: DirfBeneficiarioDto[] = [];
    for (const beneficiary of beneficiaries) {
      const payments = await this.databaseService.query<PaymentRow>(
        `
        SELECT id::text, code, month_year, amount::text, irrf::text, deductions
        FROM fiscal.dirf_pagamento
        WHERE dirf_beneficiario_id = $1::uuid
        ORDER BY code, month_year
        `,
        [beneficiary.id],
      );
      beneficiaryDtos.push({
        id: beneficiary.id,
        cpfCnpj: beneficiary.cpf_cnpj,
        kind: beneficiary.kind,
        name: beneficiary.name,
        totals: parseJsonObject(beneficiary.totals),
        payments: payments.map(toPagamentoDto),
      });
    }

    return {
      ...toArquivoDto(arquivo),
      txtContent: arquivo.txt_content,
      beneficiaries: beneficiaryDtos,
    };
  }

  async generate(input: GenerateDirfDto): Promise<DirfArquivoDetailsDto> {
    this.ensureDatabase();
    const tenantId = this.currentTenantId();
    const kind = input.kind ?? 'ORIGINAL';
    if (kind === 'RETIFICADORA' && !input.originalArquivoId) {
      throw new UnprocessableEntityException(
        'Retificadora must reference original dirf_arquivo',
      );
    }
    const layoutVersion = layoutVersionForYear(input.yearBase);
    const payments = await this.loadSourcePayments(input.yearBase);
    if (!payments.length) {
      throw new PreconditionFailedException(
        'DIRF generation requires payment.dirf_payment_source rows for the year-base',
      );
    }
    const beneficiaries = this.formatter.aggregate(payments);
    this.assertBeneficiaryTotals(beneficiaries);
    const txtContent = this.formatter.format({
      tenantId,
      yearBase: input.yearBase,
      kind,
      originalArquivoId: input.originalArquivoId ?? null,
      layoutVersion,
      beneficiaries,
    });
    this.validator.validate(txtContent);
    const txtHash = sha256(txtContent);
    const txtRef = `s3://local-fiscal/${tenantId}/dirf/${input.yearBase}/${txtHash}.txt`;

    const id = await this.databaseService.transaction(async (client) => {
      if (kind === 'RETIFICADORA') {
        await this.assertOriginalExists(
          client,
          input.originalArquivoId as string,
        );
      }
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO fiscal.dirf_arquivo (
          tenant_id,
          year_base,
          kind,
          status,
          original_arquivo_id,
          txt_ref,
          txt_content,
          txt_hash,
          layout_version,
          generated_at
        )
        VALUES (
          $1::uuid,
          $2::integer,
          $3::fiscal.dirf_arquivo_kind,
          'VALIDATED'::fiscal.dirf_arquivo_status,
          $4::uuid,
          $5,
          $6,
          $7,
          $8,
          now()
        )
        RETURNING id::text
        `,
        [
          tenantId,
          input.yearBase,
          kind,
          input.originalArquivoId ?? null,
          txtRef,
          txtContent,
          txtHash,
          layoutVersion,
        ],
      );
      const arquivoId = inserted.rows[0]!.id;
      for (const beneficiary of beneficiaries) {
        const beneficiaryId = await this.insertBeneficiary(
          client,
          tenantId,
          arquivoId,
          beneficiary,
        );
        for (const payment of beneficiary.payments) {
          await client.query(
            `
            INSERT INTO fiscal.dirf_pagamento (
              tenant_id,
              dirf_beneficiario_id,
              code,
              month_year,
              amount,
              irrf,
              deductions
            )
            VALUES ($1::uuid, $2::uuid, $3, $4::date, $5::numeric(14,2), $6::numeric(14,2), $7::jsonb)
            `,
            [
              tenantId,
              beneficiaryId,
              payment.revenueCode,
              payment.monthYear,
              payment.amount,
              payment.irrf,
              JSON.stringify(payment.deductions),
            ],
          );
        }
      }
      return arquivoId;
    });

    return this.find(id);
  }

  private async loadSourcePayments(
    yearBase: number,
  ): Promise<DirfSourcePayment[]> {
    const rows = await this.databaseService.query<SourcePaymentRow>(
      `
      SELECT
        beneficiary_kind::text,
        beneficiary_document,
        beneficiary_name,
        revenue_code,
        month_year,
        amount::text,
        irrf::text,
        deductions
      FROM payment.dirf_payment_source
      WHERE year_base = $1::integer
      ORDER BY beneficiary_document, revenue_code, month_year
      `,
      [yearBase],
    );
    return rows.map((row) => ({
      beneficiaryKind: row.beneficiary_kind,
      beneficiaryDocument: row.beneficiary_document,
      beneficiaryName: row.beneficiary_name,
      revenueCode: row.revenue_code,
      monthYear: dateText(row.month_year),
      amount: moneyText(row.amount),
      irrf: moneyText(row.irrf),
      deductions: parseJsonObject(row.deductions),
    }));
  }

  private async insertBeneficiary(
    client: PoolClient,
    tenantId: string,
    arquivoId: string,
    beneficiary: DirfBeneficiaryBlock,
  ): Promise<string> {
    const inserted = await client.query<{ id: string }>(
      `
      INSERT INTO fiscal.dirf_beneficiario (
        tenant_id,
        dirf_arquivo_id,
        cpf_cnpj,
        kind,
        name,
        totals
      )
      VALUES ($1::uuid, $2::uuid, $3, $4::payment.dirf_beneficiary_kind, $5, $6::jsonb)
      RETURNING id::text
      `,
      [
        tenantId,
        arquivoId,
        beneficiary.cpfCnpj,
        beneficiary.kind,
        beneficiary.name,
        JSON.stringify(beneficiary.totals),
      ],
    );
    return inserted.rows[0]!.id;
  }

  private async assertOriginalExists(
    client: PoolClient,
    originalArquivoId: string,
  ): Promise<void> {
    const found = await client.query(
      `
      SELECT 1
      FROM fiscal.dirf_arquivo
      WHERE id = $1::uuid
        AND kind = 'ORIGINAL'::fiscal.dirf_arquivo_kind
      `,
      [originalArquivoId],
    );
    if (!found.rowCount) {
      throw new UnprocessableEntityException(
        'Retificadora must reference an existing original DIRF arquivo',
      );
    }
  }

  private assertBeneficiaryTotals(beneficiaries: DirfBeneficiaryBlock[]): void {
    for (const beneficiary of beneficiaries) {
      const paymentTotal = beneficiary.payments.reduce(
        (total, payment) => total.plus(payment.amount),
        new Decimal(0),
      );
      if (!paymentTotal.eq(String(beneficiary.totals.amount))) {
        throw new UnprocessableEntityException(
          `DIRF beneficiary total mismatch for ${beneficiary.cpfCnpj}`,
        );
      }
    }
  }

  private currentTenantId(): string {
    const context = RequestContextStore.get();
    const tenantId = context?.actor?.tenantId ?? context?.tenantId;
    if (!tenantId) {
      throw new UnprocessableEntityException(
        'Tenant context is required for DIRF',
      );
    }
    return tenantId;
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for DIRF operations',
      );
    }
  }
}

function arquivoSelectSql(where: string): string {
  return `
    SELECT
      arquivo.id::text,
      arquivo.year_base,
      arquivo.kind::text,
      arquivo.status::text,
      arquivo.original_arquivo_id::text,
      arquivo.txt_ref,
      arquivo.txt_content,
      arquivo.txt_hash,
      arquivo.layout_version,
      arquivo.generated_at,
      count(DISTINCT beneficiario.id)::integer AS beneficiary_count,
      count(pagamento.id)::integer AS payment_count,
      COALESCE(sum(pagamento.amount), 0)::numeric(14,2)::text AS total_amount,
      COALESCE(sum(pagamento.irrf), 0)::numeric(14,2)::text AS total_irrf,
      arquivo.created_at,
      arquivo.updated_at
    FROM fiscal.dirf_arquivo arquivo
    LEFT JOIN fiscal.dirf_beneficiario beneficiario
      ON beneficiario.tenant_id = arquivo.tenant_id
     AND beneficiario.dirf_arquivo_id = arquivo.id
    LEFT JOIN fiscal.dirf_pagamento pagamento
      ON pagamento.tenant_id = beneficiario.tenant_id
     AND pagamento.dirf_beneficiario_id = beneficiario.id
    ${where}
    GROUP BY arquivo.tenant_id, arquivo.id
  `;
}

function toArquivoDto(row: ArquivoRow): DirfArquivoDto {
  return {
    id: row.id,
    yearBase: Number(row.year_base),
    kind: row.kind,
    status: row.status,
    originalArquivoId: row.original_arquivo_id,
    txtRef: row.txt_ref,
    txtHash: row.txt_hash,
    layoutVersion: row.layout_version,
    generatedAt: row.generated_at
      ? new Date(row.generated_at).toISOString()
      : null,
    beneficiaryCount: Number(row.beneficiary_count),
    paymentCount: Number(row.payment_count),
    totalAmount: row.total_amount,
    totalIrrf: row.total_irrf,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function toPagamentoDto(row: PaymentRow): DirfPagamentoDto {
  return {
    id: row.id,
    code: row.code,
    monthYear: dateText(row.month_year),
    amount: row.amount,
    irrf: row.irrf,
    deductions: parseJsonObject(row.deductions),
  };
}

function parseJsonObject(value: Record<string, unknown> | string) {
  return typeof value === 'string'
    ? (JSON.parse(value) as Record<string, unknown>)
    : value;
}

function dateText(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

function moneyText(value: string): string {
  return new Decimal(value).toFixed(2);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
