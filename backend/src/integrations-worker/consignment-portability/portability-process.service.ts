import { createHash } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { AuditMutationContextStore } from '../../common/audit/audit-mutation-context.store';
import { DatabaseService } from '../../database/database.service';
import { UploadPortabilityFileDto } from './portability.dto';
import {
  ParsedPortabilityDetail,
  PortabilityParserService,
} from './portability-parser.service';

interface FileRow extends QueryResultRow {
  file_id: string;
  status: string;
}

interface DetailRow extends ParsedPortabilityDetail, QueryResultRow {
  file_id: string;
  internal_status: string;
  reject_reason: string | null;
}

interface MatchRow extends QueryResultRow {
  loan_id: string;
  employee_id: string;
  kind: string;
  installments_paid: number;
  valid_to: string;
}

export interface PortabilityUploadResult {
  fileId: string;
  status: string;
  detailCount: number;
  fileHash: string;
}

export interface PortabilityProcessResult {
  fileId: string;
  processed: number;
  matched: number;
  unmatched: number;
}

@Injectable()
export class PortabilityProcessService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly parser: PortabilityParserService,
  ) {}

  async upload(
    input: UploadPortabilityFileDto,
  ): Promise<PortabilityUploadResult> {
    this.ensureDatabase();
    const details = this.parser.parse(input.content, input.layout);
    const fileHash = createHash('sha256').update(input.content).digest('hex');

    return this.databaseService.transaction(async (client) => {
      const inserted = await client.query<FileRow>(
        `
        INSERT INTO payment.consignment_portability_file (
          tenant_id,
          source_consignment_entity_id,
          target_consignment_entity_id,
          received_by,
          file_hash,
          status
        )
        VALUES (
          public.sgp_current_tenant_uuid(),
          $1::uuid,
          $2::uuid,
          NULL::uuid,
          $3,
          'RECEIVED'
        )
        RETURNING file_id::text, status::text
        `,
        [
          input.sourceConsignmentEntityId,
          input.targetConsignmentEntityId,
          fileHash,
        ],
      );
      const insertedFile = inserted.rows[0]!;
      const fileId = insertedFile.file_id;
      for (const detail of details) {
        await this.insertDetail(client, fileId, detail);
      }
      await this.appendAudit(client, 'CREATE', fileId, {
        event: 'consignment.portability.file.received',
        layout: input.layout,
        fileName: input.fileName ?? null,
        detailCount: details.length,
        fileHash,
      });
      return {
        fileId,
        status: insertedFile.status,
        detailCount: details.length,
        fileHash,
      };
    });
  }

  async process(fileId: string): Promise<PortabilityProcessResult> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const file = await client.query<
        FileRow & {
          source_consignment_entity_id: string;
          target_consignment_entity_id: string;
        }
      >(
        `
        UPDATE payment.consignment_portability_file
        SET status = 'PROCESSING', updated_at = now()
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND file_id = $1::uuid
          AND status IN ('RECEIVED', 'FAILED', 'PROCESSED')
        RETURNING
          file_id::text,
          status::text,
          source_consignment_entity_id::text,
          target_consignment_entity_id::text
        `,
        [fileId],
      );
      if (!file.rows[0]) {
        throw new NotFoundException('Portability file not found.');
      }

      const details = await client.query<DetailRow>(
        `
        SELECT
          file_id::text,
          sequence,
          employee_cpf AS "employeeCpf",
          source_contract_number AS "sourceContractNumber",
          target_contract_number AS "targetContractNumber",
          transferred_balance::text AS "transferredBalance",
          new_monthly_amount::text AS "newMonthlyAmount",
          new_rate::text AS "newRate",
          new_installments_total AS "newInstallmentsTotal",
          internal_status::text,
          reject_reason
        FROM payment.consignment_portability_detail
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND file_id = $1::uuid
        ORDER BY sequence
        `,
        [fileId],
      );

      let matched = 0;
      let unmatched = 0;
      for (const detail of details.rows) {
        const wasMatched = await this.processDetail(
          client,
          file.rows[0],
          detail,
        );
        if (wasMatched) matched += 1;
        else unmatched += 1;
      }

      await client.query(
        `
        UPDATE payment.consignment_portability_file
        SET status = 'PROCESSED', updated_at = now()
        WHERE tenant_id = public.sgp_current_tenant_uuid()
          AND file_id = $1::uuid
        `,
        [fileId],
      );
      await this.appendAudit(client, 'UPDATE', fileId, {
        event: 'consignment.portability.file.processed',
        matched,
        unmatched,
      });

      return { fileId, processed: details.rows.length, matched, unmatched };
    });
  }

  private async processDetail(
    client: PoolClient,
    file: FileRow & {
      source_consignment_entity_id: string;
      target_consignment_entity_id: string;
    },
    detail: DetailRow,
  ): Promise<boolean> {
    const match = await client.query<MatchRow>(
      `
      SELECT
        loan.loan_id::text,
        loan.employee_id::text,
        loan.kind::text,
        loan.installments_paid,
        loan.valid_to::text
      FROM payment.consignment_loan loan
      JOIN hr.employee employee
        ON employee.tenant_id = loan.tenant_id
       AND employee.id = loan.employee_id
      WHERE loan.tenant_id = public.sgp_current_tenant_uuid()
        AND employee.cpf = $1
        AND loan.contract_number = $2
        AND loan.consignment_entity_id = $3::uuid
        AND loan.status = 'ACTIVE'
      FOR UPDATE OF loan
      `,
      [
        detail.employeeCpf,
        detail.sourceContractNumber,
        file.source_consignment_entity_id,
      ],
    );

    const sourceLoan = match.rows[0];
    if (!sourceLoan) {
      await this.markUnmatched(client, file.file_id, detail.sequence);
      await this.appendLineAudit(client, file.file_id, detail.sequence, {
        status: 'UNMATCHED',
        reason: 'source contract not found',
      });
      return false;
    }

    const inserted = await client.query<{ loan_id: string }>(
      `
      INSERT INTO payment.consignment_loan (
        tenant_id,
        employee_id,
        consignment_entity_id,
        contract_number,
        kind,
        monthly_amount,
        installments_total,
        installments_paid,
        rate,
        valid_from,
        valid_to,
        status,
        transferred_from_loan_id
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2::uuid,
        $3,
        $4::payment.consignment_loan_kind,
        $5::numeric(14, 2),
        $6,
        0,
        $7::numeric(18, 6),
        CURRENT_DATE,
        $8::date,
        'ACTIVE'::payment.consignment_loan_status,
        $9::uuid
      )
      RETURNING loan_id::text
      `,
      [
        sourceLoan.employee_id,
        file.target_consignment_entity_id,
        detail.targetContractNumber,
        sourceLoan.kind,
        detail.newMonthlyAmount,
        detail.newInstallmentsTotal,
        detail.newRate,
        sourceLoan.valid_to,
        sourceLoan.loan_id,
      ],
    );
    const newLoanId = inserted.rows[0]!.loan_id;

    await client.query(
      `
      UPDATE payment.consignment_loan
      SET status = 'TRANSFERRED',
          transferred_to_loan_id = $2::uuid,
          updated_at = now()
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND loan_id = $1::uuid
      `,
      [sourceLoan.loan_id, newLoanId],
    );
    await client.query(
      `
      UPDATE payment.consignment_portability_detail
      SET internal_status = 'MATCHED',
          reject_reason = NULL,
          matched_loan_id = $3::uuid,
          created_loan_id = $4::uuid,
          processed_at = now(),
          updated_at = now()
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND file_id = $1::uuid
        AND sequence = $2
      `,
      [file.file_id, detail.sequence, sourceLoan.loan_id, newLoanId],
    );
    await this.appendLineAudit(client, file.file_id, detail.sequence, {
      status: 'MATCHED',
      sourceLoanId: sourceLoan.loan_id,
      targetLoanId: newLoanId,
      newMonthlyAmount: detail.newMonthlyAmount,
    });
    return true;
  }

  private async insertDetail(
    client: PoolClient,
    fileId: string,
    detail: ParsedPortabilityDetail,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO payment.consignment_portability_detail (
        tenant_id,
        file_id,
        sequence,
        employee_cpf,
        source_contract_number,
        target_contract_number,
        transferred_balance,
        new_monthly_amount,
        new_rate,
        new_installments_total,
        internal_status
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6::numeric(14, 2),
        $7::numeric(14, 2),
        $8::numeric(18, 6),
        $9,
        'REJECTED'
      )
      `,
      [
        fileId,
        detail.sequence,
        detail.employeeCpf,
        detail.sourceContractNumber,
        detail.targetContractNumber,
        detail.transferredBalance,
        detail.newMonthlyAmount,
        detail.newRate,
        detail.newInstallmentsTotal,
      ],
    );
  }

  private async markUnmatched(
    client: PoolClient,
    fileId: string,
    sequence: number,
  ): Promise<void> {
    await client.query(
      `
      UPDATE payment.consignment_portability_detail
      SET internal_status = 'UNMATCHED',
          reject_reason = 'source contract not found',
          matched_loan_id = NULL,
          created_loan_id = NULL,
          processed_at = now(),
          updated_at = now()
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND file_id = $1::uuid
        AND sequence = $2
      `,
      [fileId, sequence],
    );
  }

  private async appendLineAudit(
    client: PoolClient,
    fileId: string,
    sequence: number,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.appendAudit(client, 'UPDATE', `${fileId}:${sequence}`, {
      event: 'consignment.portability.detail.processed',
      fileId,
      sequence,
      ...metadata,
    });
  }

  private async appendAudit(
    client: PoolClient,
    action: 'CREATE' | 'UPDATE',
    resourceId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await client.query(
      `
      SELECT public.sgp_append_audit_event(
        $1,
        'payment.consignment_portability',
        $2,
        NULL::uuid,
        NULLIF(current_setting('app.current_user_sub', true), ''),
        NULLIF(current_setting('app.current_login', true), ''),
        'payment.consignment_portability_detail',
        NULLIF(current_setting('app.request_id', true), ''),
        $3::jsonb,
        NULL::text,
        NULL::text,
        NULL::text
      )
      `,
      [action, resourceId, JSON.stringify(metadata)],
    );
    AuditMutationContextStore.markMutationAudited();
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('DATABASE_URL is not configured');
    }
  }
}
