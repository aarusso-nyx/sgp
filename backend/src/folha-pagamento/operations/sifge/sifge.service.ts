import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { toMoney } from '../../../common/money/money';
import { DatabaseService } from '../../../database/database.service';
import {
  CaixaSifgeAdapter,
  FgtsRemittanceKind,
  SIFGE_ADAPTERS,
  SifgePayload,
  SifgeRecord,
} from './caixa-adapter.contract';

interface AdapterRow extends QueryResultRow {
  adapter_key: string;
  layout_version: string;
}

interface GrfSourceRow extends QueryResultRow {
  payroll_run_id: string;
  employee_count: string;
  base_amount: string;
  rate: string;
  amount: string;
}

interface MovementDetailRow extends QueryResultRow {
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
export class SifgeService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(SIFGE_ADAPTERS)
    private readonly adapters: CaixaSifgeAdapter[],
  ) {}

  async generateMonthlyGRF(
    tenantId: string,
    competence: string,
  ): Promise<FgtsRemittanceSummary> {
    this.ensureDatabase();
    const competenceDate = this.competenceDate(competence);
    if (!this.isUuid(tenantId)) {
      throw new BadRequestException('Tenant context is required');
    }

    return this.databaseService.transaction(async (client) => {
      const adapter = await this.resolveAdapter(client);
      const source = await this.getMonthlySource(
        client,
        tenantId,
        competenceDate,
      );
      if (source.length === 0) {
        throw new NotFoundException(
          'No monthly FGTS movements found for competence',
        );
      }
      const details = await this.getMonthlyDetails(
        client,
        tenantId,
        competenceDate,
      );
      const totals = this.totalsFromGrf(source);
      const remittance = await this.insertRemittance(client, {
        tenantId,
        competence: competenceDate,
        kind: 'GRF_MONTHLY',
        totalBase: totals.totalBase,
        totalAmount: totals.totalAmount,
        adapter,
      });

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
            remittance.id,
            row.payroll_run_id,
            row.employee_count,
            row.base_amount,
            row.rate,
            row.amount,
          ],
        );
      }

      return this.finalizeRemittance(client, adapter, remittance, {
        header: {
          tenantId,
          remittanceId: remittance.id,
          competence: competenceDate,
          kind: 'GRF_MONTHLY',
          generatedAt: remittance.generatedAt ?? new Date().toISOString(),
          daeBarcode: remittance.daeBarcode ?? '',
        },
        totals: {
          employeeCount: Number(totals.employeeCount),
          totalBase: totals.totalBase,
          totalAmount: totals.totalAmount,
        },
        records: details.map((row) => this.detailToRecord(row)),
      });
    });
  }

  async generateTerminationGRRF(
    employmentLinkId: string,
    terminationId: string,
  ): Promise<FgtsRemittanceSummary> {
    this.ensureDatabase();
    if (!this.isUuid(employmentLinkId) || !this.isUuid(terminationId)) {
      throw new BadRequestException(
        'Employment link and termination payroll run are required',
      );
    }

    return this.databaseService.transaction(async (client) => {
      const adapter = await this.resolveAdapter(client);
      const source = await this.getTerminationSource(
        client,
        employmentLinkId,
        terminationId,
      );
      if (!source) {
        throw new NotFoundException('No termination FGTS fine found for GRRF');
      }
      const remittance = await this.insertRemittance(client, {
        tenantId: source.tenant_id,
        competence: this.dateText(source.termination_date),
        kind: 'GRRF_TERMINATION',
        totalBase: source.base_balance,
        totalAmount: source.fine_amount,
        adapter,
      });

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
          remittance.id,
          source.employment_link_id,
          this.dateText(source.termination_date),
          source.base_balance,
          source.fine_rate,
          source.fine_amount,
          source.notice_amount,
        ],
      );

      return this.finalizeRemittance(client, adapter, remittance, {
        header: {
          tenantId: source.tenant_id,
          remittanceId: remittance.id,
          competence: this.dateText(source.termination_date),
          kind: 'GRRF_TERMINATION',
          generatedAt: remittance.generatedAt ?? new Date().toISOString(),
          daeBarcode: remittance.daeBarcode ?? '',
        },
        totals: {
          employeeCount: 1,
          totalBase: source.base_balance,
          totalAmount: source.fine_amount,
        },
        records: [
          {
            employeeId: source.employee_id,
            employmentLinkId: source.employment_link_id,
            payrollRunId: source.payroll_run_id,
            baseAmount: source.base_balance,
            rate: source.fine_rate,
            amount: source.fine_amount,
            movementId: source.movement_id,
            terminationDate: this.dateText(source.termination_date),
            noticeAmount: source.notice_amount,
          },
        ],
      });
    });
  }

  async find(id: string): Promise<FgtsRemittanceSummary> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<RemittanceRow>(
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
    const row = rows[0];
    if (!row) throw new NotFoundException('FGTS remittance not found');
    return this.toSummary(row);
  }

  private async resolveAdapter(client: PoolClient): Promise<CaixaSifgeAdapter> {
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
    const adapter = this.adapters.find(
      (candidate) => candidate.adapterKey === key,
    );
    if (!adapter) {
      throw new BadRequestException(`Unknown Caixa FGTS adapter: ${key}`);
    }
    return adapter;
  }

  private async getMonthlySource(
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

  private async getMonthlyDetails(
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

  private async getTerminationSource(
    client: PoolClient,
    employmentLinkId: string,
    terminationId: string,
  ): Promise<(GrrfSourceRow & { tenant_id: string }) | null> {
    const result = await client.query<GrrfSourceRow & { tenant_id: string }>(
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

  private async insertRemittance(
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

  private async finalizeRemittance(
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

  private totalsFromGrf(source: GrfSourceRow[]): {
    employeeCount: string;
    totalBase: string;
    totalAmount: string;
  } {
    const employeeCount = source.reduce(
      (total, row) => total + Number(row.employee_count),
      0,
    );
    const totalBase = source
      .reduce((total, row) => total.plus(row.base_amount), toMoney(0))
      .toFixed(2);
    const totalAmount = source
      .reduce((total, row) => total.plus(row.amount), toMoney(0))
      .toFixed(2);
    return { employeeCount: String(employeeCount), totalBase, totalAmount };
  }

  private detailToRecord(row: MovementDetailRow): SifgeRecord {
    return {
      employeeId: row.employee_id,
      employmentLinkId: row.employment_link_id,
      payrollRunId: row.payroll_run_id,
      baseAmount: row.base_amount,
      rate: row.rate,
      amount: row.amount,
      movementId: row.movement_id,
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

  private competenceDate(value: string): string {
    if (!value) throw new BadRequestException('Competence is required');
    const match = value.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
    if (!match) {
      throw new BadRequestException('Competence must be YYYY-MM or YYYY-MM-DD');
    }
    return `${match[1]}-${match[2]}-01`;
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

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for FGTS remittance operations',
      );
    }
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private dateText(value: Date | string): string {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }

  private dateTimeText(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
