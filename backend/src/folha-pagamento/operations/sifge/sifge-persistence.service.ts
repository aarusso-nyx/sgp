import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import {
  CaixaSifgeAdapter,
  FgtsRemittanceKind,
  SifgePayload,
} from './caixa-adapter.contract';

interface AdapterRow extends QueryResultRow {
  adapter_key: string;
  layout_version: string;
}

export interface GrfSourceRow extends QueryResultRow {
  payroll_run_id: string;
  employee_count: string;
  base_amount: string;
  rate: string;
  amount: string;
}

export interface MovementDetailRow extends QueryResultRow {
  employee_id: string;
  employment_link_id: string;
  payroll_run_id: string | null;
  base_amount: string;
  rate: string;
  amount: string;
  movement_id: string | null;
}

interface GrrfSourceRow extends QueryResultRow {
  employee_id: string;
  employment_link_id: string;
  payroll_run_id: string;
  termination_date: string | Date;
  base_balance: string;
  fine_rate: string;
  fine_amount: string;
  notice_amount: string;
  movement_id: string;
}

export type GrrfSourceRowWithTenant = GrrfSourceRow & { tenant_id: string };

interface RemittanceRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  competence: string | Date;
  kind: FgtsRemittanceKind;
  status: string;
  generated_at: string | Date | null;
  paid_at: string | Date | null;
  total_base: string;
  total_amount: string;
  file_uri: string | null;
  dae_barcode: string | null;
  layout_version: string;
  adapter_key: string;
  file_hash: string | null;
  signed: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  file_content_base64?: string | null | undefined;
}

export interface FgtsRemittanceSummary {
  id: string;
  tenantId: string;
  competence: string;
  kind: FgtsRemittanceKind;
  status: string;
  generatedAt: string | null;
  paidAt: string | null;
  totalBase: string;
  totalAmount: string;
  fileUri: string | null;
  daeBarcode: string | null;
  layoutVersion: string;
  adapterKey: string;
  fileHash: string | null;
  signed: boolean;
  createdAt: string;
  updatedAt: string;
  fileContentBase64?: string | null | undefined;
}

@Injectable()
export class SifgePersistenceService {
  async findById(
    query: <T extends QueryResultRow = QueryResultRow>(
      sql: string,
      values?: unknown[],
    ) => Promise<T[]>,
    id: string,
  ): Promise<FgtsRemittanceSummary> {
    const rows = await query<RemittanceRow>(
      `
      SELECT
        id::text,
        tenant_id::text,
        competence,
        kind::text,
        status::text,
        generated_at,
        paid_at,
        total_base::text,
        total_amount::text,
        file_uri,
        dae_barcode,
        layout_version,
        adapter_key,
        file_hash,
        signed,
        created_at,
        updated_at
      FROM payment.fgts_remittance
      WHERE id = $1::uuid
      `,
      [id],
    );
    return this.toSummary(rows[0]);
  }

  async resolveAdapter(
    client: PoolClient,
    adapters: CaixaSifgeAdapter[],
  ): Promise<CaixaSifgeAdapter> {
    const configured = await client.query<AdapterRow>(
      `
      SELECT adapter_key, layout_version
      FROM payment.fgts_caixa_adapter
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND active = true
      ORDER BY updated_at DESC
      LIMIT 1
      `,
    );
    const key = configured.rows[0]?.adapter_key ?? 'caixa-sifge-v4';
    const adapter = adapters.find((candidate) => candidate.adapterKey === key);
    if (!adapter) {
      throw new BadRequestException(`Unknown Caixa FGTS adapter: ${key}`);
    }
    return adapter;
  }

  async getMonthlySource(
    client: PoolClient,
    tenantId: string,
    competence: string,
  ): Promise<GrfSourceRow[]> {
    const result = await client.query<GrfSourceRow>(
      `
      SELECT
        movement.payroll_run_id::text,
        count(DISTINCT account.employee_id)::text AS employee_count,
        sum(movement.base_amount)::numeric(14,2)::text AS base_amount,
        max(movement.rate)::numeric(18,6)::text AS rate,
        sum(movement.amount)::numeric(14,2)::text AS amount
      FROM payment.fgts_movement movement
      JOIN payment.fgts_account account
        ON account.tenant_id = movement.tenant_id
       AND account.fgts_account_id = movement.fgts_account_id
      WHERE movement.tenant_id = $1::uuid
        AND movement.competence = $2::date
        AND movement.kind IN ('DEPOSIT_8', 'DEPOSIT_AVISO')
        AND movement.source_event = 'MONTHLY'
        AND movement.payroll_run_id IS NOT NULL
      GROUP BY movement.payroll_run_id
      ORDER BY movement.payroll_run_id
      `,
      [tenantId, competence],
    );
    return result.rows;
  }

  async getMonthlyDetails(
    client: PoolClient,
    tenantId: string,
    competence: string,
  ): Promise<MovementDetailRow[]> {
    const result = await client.query<MovementDetailRow>(
      `
      SELECT
        account.employee_id::text,
        account.employment_link_id::text,
        movement.payroll_run_id::text,
        movement.base_amount::text,
        movement.rate::text,
        movement.amount::text,
        movement.fgts_movement_id::text AS movement_id
      FROM payment.fgts_movement movement
      JOIN payment.fgts_account account
        ON account.tenant_id = movement.tenant_id
       AND account.fgts_account_id = movement.fgts_account_id
      WHERE movement.tenant_id = $1::uuid
        AND movement.competence = $2::date
        AND movement.kind IN ('DEPOSIT_8', 'DEPOSIT_AVISO')
        AND movement.source_event = 'MONTHLY'
        AND movement.payroll_run_id IS NOT NULL
      ORDER BY account.employee_id, movement.fgts_movement_id
      `,
      [tenantId, competence],
    );
    return result.rows;
  }

  async getTerminationSource(
    client: PoolClient,
    employmentLinkId: string,
    terminationId: string,
  ): Promise<GrrfSourceRowWithTenant | null> {
    const result = await client.query<GrrfSourceRowWithTenant>(
      `
      SELECT
        account.tenant_id::text,
        account.employee_id::text,
        account.employment_link_id::text,
        movement.payroll_run_id::text,
        COALESCE(employee.terminated_on, movement.competence)::date AS termination_date,
        movement.base_amount::text AS base_balance,
        movement.rate::text AS fine_rate,
        movement.amount::text AS fine_amount,
        COALESCE(
          CASE WHEN notice.kind = 'INDEMNIFIED' THEN notice.base_amount ELSE 0 END,
          0
        )::numeric(14,2)::text AS notice_amount,
        movement.fgts_movement_id::text AS movement_id
      FROM payment.fgts_movement movement
      JOIN payment.fgts_account account
        ON account.tenant_id = movement.tenant_id
       AND account.fgts_account_id = movement.fgts_account_id
      JOIN hr.employee employee
        ON employee.tenant_id = account.tenant_id
       AND employee.id = account.employee_id
      LEFT JOIN payment.prior_notice notice
        ON notice.tenant_id = account.tenant_id
       AND notice.employment_link_id = account.employment_link_id
      WHERE account.employment_link_id = $1::uuid
        AND movement.payroll_run_id = $2::uuid
        AND movement.kind = 'RESCISION_FINE_40'
        AND movement.source_event = 'TERMINATION'
      ORDER BY movement.created_at DESC
      LIMIT 1
      `,
      [employmentLinkId, terminationId],
    );
    return result.rows[0] ?? null;
  }

  async insertRemittance(
    client: PoolClient,
    input: {
      tenantId: string;
      competence: string;
      kind: FgtsRemittanceKind;
      totalBase: string;
      totalAmount: string;
      adapter: CaixaSifgeAdapter;
    },
  ): Promise<FgtsRemittanceSummary> {
    const generatedAt = new Date().toISOString();
    const daeBarcode = this.daeBarcode(
      input.tenantId,
      input.kind,
      input.competence,
    );
    const result = await client.query<RemittanceRow>(
      `
      INSERT INTO payment.fgts_remittance (
        tenant_id,
        competence,
        kind,
        status,
        generated_at,
        total_base,
        total_amount,
        dae_barcode,
        layout_version,
        adapter_key
      )
      VALUES (
        $1::uuid,
        $2::date,
        $3::payment.fgts_remittance_kind,
        'GENERATED'::payment.fgts_remittance_status,
        $4::timestamptz,
        $5::numeric(14,2),
        $6::numeric(14,2),
        $7,
        $8,
        $9
      )
      RETURNING
        id::text,
        tenant_id::text,
        competence,
        kind::text,
        status::text,
        generated_at,
        paid_at,
        total_base::text,
        total_amount::text,
        file_uri,
        dae_barcode,
        layout_version,
        adapter_key,
        file_hash,
        signed,
        created_at,
        updated_at
      `,
      [
        input.tenantId,
        input.competence,
        input.kind,
        generatedAt,
        input.totalBase,
        input.totalAmount,
        daeBarcode,
        input.adapter.layoutVersion,
        input.adapter.adapterKey,
      ],
    );
    return this.toSummary(result.rows[0]);
  }

  async insertMonthlyGrfRows(
    client: PoolClient,
    tenantId: string,
    remittanceId: string,
    source: GrfSourceRow[],
  ): Promise<void> {
    for (const row of source) {
      await client.query(
        `
        INSERT INTO payment.fgts_grf (
          tenant_id,
          fgts_remittance_id,
          payroll_run_id,
          employee_count,
          base_amount,
          rate,
          amount
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4::integer,
          $5::numeric(14,2),
          $6::numeric(18,6),
          $7::numeric(14,2)
        )
        `,
        [
          tenantId,
          remittanceId,
          row.payroll_run_id,
          row.employee_count,
          row.base_amount,
          row.rate,
          row.amount,
        ],
      );
    }
  }

  async insertTerminationGrrfRow(
    client: PoolClient,
    remittanceId: string,
    source: GrrfSourceRowWithTenant,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO payment.fgts_grrf (
        tenant_id,
        fgts_remittance_id,
        employment_link_id,
        termination_date,
        base_balance,
        fine_rate,
        fine_amount,
        notice_amount
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::date,
        $5::numeric(14,2),
        $6::numeric(18,6),
        $7::numeric(14,2),
        $8::numeric(14,2)
      )
      `,
      [
        source.tenant_id,
        remittanceId,
        source.employment_link_id,
        this.dateText(source.termination_date),
        source.base_balance,
        source.fine_rate,
        source.fine_amount,
        source.notice_amount,
      ],
    );
  }

  async finalizeRemittance(
    client: PoolClient,
    adapter: CaixaSifgeAdapter,
    remittance: FgtsRemittanceSummary,
    payload: SifgePayload,
  ): Promise<FgtsRemittanceSummary> {
    const assembled = adapter.assemble(payload);
    const finalBuffer = adapter.requiresSignature
      ? adapter.signIfRequired(assembled)
      : assembled;
    const fileHash = createHash('sha256').update(finalBuffer).digest('hex');
    const fileUri = `sifge://fgts-remittances/${remittance.id}.sifge`;
    const parsed = adapter.parse(finalBuffer);
    const rows = await client.query<RemittanceRow>(
      `
      UPDATE payment.fgts_remittance
      SET file_uri = $2,
          file_hash = $3,
          signed = $4,
          updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id::text,
        tenant_id::text,
        competence,
        kind::text,
        status::text,
        generated_at,
        paid_at,
        total_base::text,
        total_amount::text,
        file_uri,
        dae_barcode,
        layout_version,
        adapter_key,
        file_hash,
        signed,
        created_at,
        updated_at
      `,
      [remittance.id, fileUri, fileHash, parsed.signed],
    );
    return {
      ...this.toSummary(rows.rows[0]),
      fileContentBase64: finalBuffer.toString('base64'),
    };
  }

  private toSummary(row: RemittanceRow | undefined): FgtsRemittanceSummary {
    if (!row) throw new NotFoundException('FGTS remittance not found');
    return {
      id: row.id,
      tenantId: row.tenant_id,
      competence: this.dateText(row.competence),
      kind: row.kind,
      status: row.status,
      generatedAt: row.generated_at
        ? this.dateTimeText(row.generated_at)
        : null,
      paidAt: row.paid_at ? this.dateTimeText(row.paid_at) : null,
      totalBase: row.total_base,
      totalAmount: row.total_amount,
      fileUri: row.file_uri,
      daeBarcode: row.dae_barcode,
      layoutVersion: row.layout_version,
      adapterKey: row.adapter_key,
      fileHash: row.file_hash,
      signed: row.signed,
      createdAt: this.dateTimeText(row.created_at),
      updatedAt: this.dateTimeText(row.updated_at),
      fileContentBase64: row.file_content_base64 ?? undefined,
    };
  }

  private daeBarcode(
    tenantId: string,
    kind: FgtsRemittanceKind,
    competence: string,
  ): string {
    const digest = createHash('sha256')
      .update(`${tenantId}:${kind}:${competence}`)
      .digest('hex')
      .replace(/\D/g, '');
    return digest.padEnd(44, '0').slice(0, 44);
  }

  private dateText(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }

  private dateTimeText(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
