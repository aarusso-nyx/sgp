import { createHash } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  PreconditionFailedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  SiaficAccountingLineDto,
  SiaficConnectorResponse,
  SiaficSyncBatchDto,
  SiaficSyncStage,
  SiaficSyncStatus,
  SyncSiaficPayrollRunDto,
} from './siafic.dto';
import { SiaficConnectorService } from './siafic-connector.service';

interface PayrollAccountingRow extends QueryResultRow {
  payroll_run_id: string;
  competence: Date | string;
  source_line_id: string;
  accounting_account_id: string;
  account_code: string;
  account_type: string;
  earning_code: string;
  earning_description: string;
  amount: string;
}

interface BatchRow extends QueryResultRow {
  id: string;
  payroll_run_id: string;
  competence: Date | string;
  ente_code: string;
  status: SiaficSyncStatus;
  circuit_state: SiaficSyncBatchDto['circuitState'];
  attempts: number | string;
  receipt_number: string | null;
  last_error: string | null;
  stage_status: Partial<Record<SiaficSyncStage, SiaficSyncStatus>> | string;
  item_count: number | string;
  total_amount: string;
  created_at: Date | string;
  updated_at: Date | string;
}

const DEFAULT_STAGES: SiaficSyncStage[] = [
  'EMPENHO',
  'LIQUIDACAO',
  'PAGAMENTO',
];

@Injectable()
export class SiaficSyncService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly connector: SiaficConnectorService,
  ) {}

  async syncPayrollRun(
    input: SyncSiaficPayrollRunDto,
  ): Promise<SiaficSyncBatchDto> {
    this.ensureDatabase();
    const stages = input.stages?.length ? input.stages : DEFAULT_STAGES;
    const sourceRows = await this.loadPayrollAccountingRows(input.payrollRunId);
    if (!sourceRows.length) {
      throw new PreconditionFailedException(
        'SIAFIC sync requires payroll_accounting mappings for payroll run lines',
      );
    }

    const lines = sourceRows.map(toAccountingLine);
    const competence = toDateOnly(sourceRows[0]!.competence);
    const batchId = await this.createBatch({
      payrollRunId: input.payrollRunId,
      competence,
      enteCode: input.enteCode,
      stages,
      lines,
    });

    for (const stage of stages) {
      await this.transmitStage({
        batchId,
        payrollRunId: input.payrollRunId,
        competence,
        enteCode: input.enteCode,
        stage,
        lines,
      });
    }

    return this.findBatch(batchId);
  }

  async findBatch(id: string): Promise<SiaficSyncBatchDto> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<BatchRow>(
      batchSelectSql('WHERE batch.id = $1::uuid'),
      [id],
    );
    if (!rows[0]) {
      throw new BadRequestException('SIAFIC sync batch not found');
    }
    return toBatchDto(rows[0]);
  }

  private async loadPayrollAccountingRows(
    payrollRunId: string,
  ): Promise<PayrollAccountingRow[]> {
    return this.databaseService.query<PayrollAccountingRow>(
      `
      SELECT
        run.id::text AS payroll_run_id,
        make_date(run.competence_year, run.competence_month, 1) AS competence,
        item.id::text AS source_line_id,
        account.id::text AS accounting_account_id,
        account.account_code,
        account.account_type::text,
        earning.code AS earning_code,
        earning.description AS earning_description,
        sum(
          CASE
            WHEN earning.kind = 'DEDUCTION'::public."PayrollEntryKind" THEN -item.amount
            ELSE item.amount
          END
        )::numeric(14,2)::text AS amount
      FROM payroll.payroll_run run
      JOIN payroll.v_payroll_run_line_active item
        ON item.tenant_id = run.tenant_id
       AND item.payroll_run_id = run.id
      JOIN payroll.payroll_earning_deduction earning
        ON earning.id = item.earning_deduction_id
      JOIN payroll.accounting_account account
        ON account.tenant_id = run.tenant_id
       AND account.earning_deduction_id = item.earning_deduction_id
       AND account.status = 'ACTIVE'::"RecordStatus"
      WHERE run.id = $1::uuid
        AND run.status IN (
          'GENERATED'::public."PayrollRunStatus",
          'APPROVED'::public."PayrollRunStatus",
          'PAID'::public."PayrollRunStatus",
          'CLOSED'::public."PayrollRunStatus"
        )
      GROUP BY
        run.id,
        run.competence_year,
        run.competence_month,
        item.id,
        account.id,
        account.account_code,
        account.account_type,
        earning.code,
        earning.description
      HAVING sum(
        CASE
          WHEN earning.kind = 'DEDUCTION'::public."PayrollEntryKind" THEN -item.amount
          ELSE item.amount
        END
      ) <> 0
      ORDER BY account.account_type, account.account_code, earning.code
      `,
      [payrollRunId],
    );
  }

  private async createBatch(input: {
    payrollRunId: string;
    competence: string;
    enteCode: string;
    stages: SiaficSyncStage[];
    lines: SiaficAccountingLineDto[];
  }): Promise<string> {
    const totalAmount = input.lines
      .reduce((sum, line) => sum + Math.abs(Number(line.amount)), 0)
      .toFixed(2);
    const stageStatus = Object.fromEntries(
      input.stages.map((stage) => [stage, 'PENDING']),
    );
    const rows = await this.databaseService.query<{ id: string }>(
      `
      INSERT INTO fiscal.siafic_sync_batch (
        tenant_id,
        payroll_run_id,
        competence,
        ente_code,
        status,
        circuit_state,
        stage_status,
        item_count,
        total_amount
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::date,
        $3,
        'PENDING'::fiscal.siafic_sync_status,
        $4::fiscal.siafic_circuit_state,
        $5::jsonb,
        $6,
        $7::numeric
      )
      RETURNING id::text
      `,
      [
        input.payrollRunId,
        input.competence,
        input.enteCode,
        this.connector.getCircuitState(input.enteCode),
        JSON.stringify(stageStatus),
        input.lines.length,
        totalAmount,
      ],
    );
    return rows[0]!.id;
  }

  private async transmitStage(input: {
    batchId: string;
    payrollRunId: string;
    competence: string;
    enteCode: string;
    stage: SiaficSyncStage;
    lines: SiaficAccountingLineDto[];
  }): Promise<void> {
    const payload = {
      idempotencyKey: sha256(
        `${input.enteCode}:${input.payrollRunId}:${input.stage}`,
      ),
      enteCode: input.enteCode,
      payrollRunId: input.payrollRunId,
      competence: input.competence,
      stage: input.stage,
      items: input.lines,
    };

    try {
      const response = await this.connector.sendStage(payload);
      await this.recordStageResult(input, response);
    } catch (error) {
      await this.recordStageFailure(input, error);
      throw error;
    }
  }

  private async recordStageResult(
    input: {
      batchId: string;
      stage: SiaficSyncStage;
      lines: SiaficAccountingLineDto[];
      enteCode: string;
    },
    response: SiaficConnectorResponse,
  ): Promise<void> {
    const status: SiaficSyncStatus = response.accepted
      ? 'ACCEPTED'
      : 'REJECTED';
    await this.databaseService.transaction(async (client) => {
      await this.insertStageItems(client, input, status, response);
      await this.updateBatchStage(client, input, status, response, null);
    });
  }

  private async recordStageFailure(
    input: {
      batchId: string;
      stage: SiaficSyncStage;
      lines: SiaficAccountingLineDto[];
      enteCode: string;
    },
    error: unknown,
  ): Promise<void> {
    const message =
      error instanceof Error ? error.message : 'Unknown SIAFIC sync failure';
    await this.databaseService.transaction(async (client) => {
      await this.insertStageItems(client, input, 'FAILED', {
        accepted: false,
        receiptNumber: null,
        payload: { error: message },
      });
      await this.updateBatchStage(
        client,
        input,
        'FAILED',
        {
          accepted: false,
          receiptNumber: null,
          payload: { error: message },
        },
        message,
      );
    });
  }

  private async insertStageItems(
    client: PoolClient,
    input: {
      batchId: string;
      stage: SiaficSyncStage;
      lines: SiaficAccountingLineDto[];
    },
    status: SiaficSyncStatus,
    response: SiaficConnectorResponse,
  ): Promise<void> {
    for (const line of input.lines) {
      await client.query(
        `
        INSERT INTO fiscal.siafic_sync_item (
          tenant_id,
          batch_id,
          stage,
          source_line_id,
          accounting_account_id,
          account_code,
          account_type,
          amount,
          status,
          receipt_number,
          payload
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1::uuid,
          $2::fiscal.siafic_sync_stage,
          $3::uuid,
          $4::uuid,
          $5,
          $6,
          $7::numeric,
          $8::fiscal.siafic_sync_status,
          $9,
          $10::jsonb
        )
        ON CONFLICT (tenant_id, batch_id, stage, source_line_id, accounting_account_id)
        DO UPDATE
        SET status = EXCLUDED.status,
            receipt_number = EXCLUDED.receipt_number,
            payload = EXCLUDED.payload,
            updated_at = now()
        `,
        [
          input.batchId,
          input.stage,
          line.sourceLineId,
          line.accountingAccountId,
          line.accountCode,
          line.accountType,
          line.amount,
          status,
          response.receiptNumber,
          JSON.stringify({
            line,
            response: response.payload,
          }),
        ],
      );
    }
  }

  private async updateBatchStage(
    client: PoolClient,
    input: { batchId: string; stage: SiaficSyncStage; enteCode: string },
    status: SiaficSyncStatus,
    response: SiaficConnectorResponse,
    errorMessage: string | null,
  ): Promise<void> {
    await client.query(
      `
      UPDATE fiscal.siafic_sync_batch
      SET status = CASE
            WHEN $2::fiscal.siafic_sync_status IN ('REJECTED', 'FAILED')
              THEN $2::fiscal.siafic_sync_status
            WHEN NOT EXISTS (
              SELECT 1
              FROM jsonb_each_text(stage_status) stage
              WHERE stage.key <> $3
                AND stage.value NOT IN ('ACCEPTED', 'SENT')
            )
              THEN $2::fiscal.siafic_sync_status
            ELSE 'SENT'::fiscal.siafic_sync_status
          END,
          circuit_state = $4::fiscal.siafic_circuit_state,
          attempts = attempts + 1,
          receipt_number = COALESCE($5, receipt_number),
          last_error = $6,
          response_payload = $7::jsonb,
          stage_status = jsonb_set(stage_status, ARRAY[$3], to_jsonb($2::text), true),
          updated_at = now()
      WHERE id = $1::uuid
      `,
      [
        input.batchId,
        status,
        input.stage,
        this.connector.getCircuitState(input.enteCode),
        response.receiptNumber,
        errorMessage,
        JSON.stringify(response.payload),
      ],
    );
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for SIAFIC sync operations',
      );
    }
  }
}

function batchSelectSql(where: string): string {
  return `
    SELECT
      batch.id::text,
      batch.payroll_run_id::text,
      batch.competence,
      batch.ente_code,
      batch.status::text,
      batch.circuit_state::text,
      batch.attempts,
      batch.receipt_number,
      batch.last_error,
      batch.stage_status,
      batch.item_count,
      batch.total_amount::text,
      batch.created_at,
      batch.updated_at
    FROM fiscal.siafic_sync_batch batch
    ${where}
  `;
}

function toAccountingLine(row: PayrollAccountingRow): SiaficAccountingLineDto {
  return {
    sourceLineId: row.source_line_id,
    accountingAccountId: row.accounting_account_id,
    accountCode: row.account_code,
    accountType: row.account_type,
    earningCode: row.earning_code,
    earningDescription: row.earning_description,
    amount: row.amount,
  };
}

function toBatchDto(row: BatchRow): SiaficSyncBatchDto {
  const stageStatus =
    typeof row.stage_status === 'string'
      ? (JSON.parse(row.stage_status) as Partial<
          Record<SiaficSyncStage, SiaficSyncStatus>
        >)
      : row.stage_status;
  return {
    id: row.id,
    payrollRunId: row.payroll_run_id,
    competence: toDateOnly(row.competence),
    enteCode: row.ente_code,
    status: row.status,
    circuitState: row.circuit_state,
    attempts: Number(row.attempts),
    receiptNumber: row.receipt_number,
    lastError: row.last_error,
    stageStatus,
    itemCount: Number(row.item_count),
    totalAmount: row.total_amount,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function toDateOnly(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function toIso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
