import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../../database/database.service';
import { Cnab240ReturnParserService } from './cnab240-return-parser.service';
import {
  Cnab240ReturnInternalStatus,
  OccurrenceMapperService,
} from './occurrence-mapper.service';

export interface ProcessCnab240ReturnInput {
  remittanceFileId: string;
  content: string;
  encoding?: 'ascii' | 'base64' | undefined;
  remittanceFileHash: string;
  processedBy?: string | null | undefined;
}

export interface ReprocessRejectedResult {
  remittanceFileId: string;
  sourceReturnFileId: string;
  detailCount: number;
}

interface RemittanceRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  payroll_run_id: string | null;
  competence_year: number;
  competence_month: number;
  payment_date: Date | string | null;
  file_hash: string | null;
  bank_code: number | null;
  processing_type_id: string | null;
  total_amount: string;
}

interface DetailRow extends QueryResultRow {
  id: string;
  employee_id: string;
  amount: string;
}

interface IdCountRow extends QueryResultRow {
  id: string;
  count: string;
}

@Injectable()
export class Cnab240ReturnProcessService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly parser: Cnab240ReturnParserService,
    private readonly mapper: OccurrenceMapperService,
  ) {}

  async process(input: ProcessCnab240ReturnInput) {
    this.ensureDatabase();
    const content = Buffer.from(
      input.content,
      input.encoding === 'base64' ? 'base64' : 'ascii',
    );
    const parsed = this.parser.parse(content);

    return this.databaseService.transaction(async (client) => {
      const remittance = await this.loadRemittance(
        client,
        input.remittanceFileId,
      );
      if (
        !remittance.file_hash ||
        remittance.file_hash !== input.remittanceFileHash
      ) {
        throw new BadRequestException(
          'CNAB return remittance hash does not match the original remittance file',
        );
      }
      if (
        remittance.bank_code &&
        String(remittance.bank_code).padStart(3, '0') !== parsed.bankCode
      ) {
        throw new BadRequestException(
          'CNAB return bank code does not match the original remittance file',
        );
      }

      const returnFileRows = await client.query<IdCountRow>(
        `
        INSERT INTO payroll.payment_return_file (
          tenant_id,
          remittance_file_id,
          bank_code,
          file_hash,
          processed_by,
          status
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3,
          $4,
          NULLIF($5, '')::uuid,
          'PROCESSING'::"PaymentReturnFileStatus"
        )
        RETURNING return_file_id::text AS id, '0'::text AS count
        `,
        [
          remittance.tenant_id,
          remittance.id,
          Number(parsed.bankCode),
          parsed.fileHash,
          input.processedBy ?? '',
        ],
      );
      const returnFileId = returnFileRows.rows[0]!.id;

      let rejectedCount = 0;
      for (const parsedDetail of parsed.details) {
        const detail = await this.matchDetail(client, remittance, parsedDetail);
        const mapping = this.mapper.map(
          parsedDetail.bankCode,
          parsedDetail.occurrenceCode,
        );
        if (mapping.internalStatus !== 'ACCEPTED') {
          rejectedCount += 1;
        }

        await client.query(
          `
          INSERT INTO payroll.payment_return_detail (
            tenant_id,
            return_file_id,
            sequence,
            remittance_detail_id,
            occurrence_code,
            internal_status,
            message,
            employee_id,
            amount
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3,
            $4::uuid,
            $5,
            $6,
            $7,
            $8::uuid,
            $9::numeric(14,2)
          )
          `,
          [
            remittance.tenant_id,
            returnFileId,
            parsedDetail.sequence,
            detail.id,
            parsedDetail.occurrenceCode,
            mapping.internalStatus,
            mapping.message,
            detail.employee_id,
            detail.amount,
          ],
        );

        await client.query(
          `
          UPDATE payroll.payment_remittance_detail
          SET occurrence_code = $2,
              last_occurrence_code = $2,
              last_internal_status = $3,
              last_settled_at = now()
          WHERE id = $1::uuid
          `,
          [detail.id, parsedDetail.occurrenceCode, mapping.internalStatus],
        );

        if (remittance.payroll_run_id) {
          await client.query(
            `
            UPDATE payroll.employee_payroll_item
            SET payment_status = $4,
                updated_at = now()
            WHERE tenant_id = $1::uuid
              AND payroll_run_id = $2::uuid
              AND employee_id = $3::uuid
              AND deleted_at IS NULL
            `,
            [
              remittance.tenant_id,
              remittance.payroll_run_id,
              detail.employee_id,
              toPayrollPaymentStatus(mapping.internalStatus),
            ],
          );
        }
      }

      await client.query(
        `
        UPDATE payroll.payment_return_file
        SET status = 'PROCESSED'::"PaymentReturnFileStatus",
            updated_at = now()
        WHERE return_file_id = $1::uuid
        `,
        [returnFileId],
      );
      await client.query(
        `
        UPDATE payroll.payment_remittance_file
        SET status = 'RETURNED'::"PaymentRemittanceStatus",
            updated_at = now()
        WHERE id = $1::uuid
          AND NOT EXISTS (
            SELECT 1
            FROM payroll.payment_remittance_detail detail
            WHERE detail.file_id = payroll.payment_remittance_file.id
              AND detail.last_internal_status IS NULL
          )
        `,
        [remittance.id],
      );

      return {
        returnFileId,
        remittanceFileId: remittance.id,
        bankCode: Number(parsed.bankCode),
        fileHash: parsed.fileHash,
        processedRecords: parsed.details.length,
        rejectedRecords: rejectedCount,
      };
    });
  }

  async reprocessRejected(
    returnFileId: string,
  ): Promise<ReprocessRejectedResult> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const rows = await client.query<IdCountRow>(
        `
        WITH source_return AS (
          SELECT rf.*
          FROM payroll.payment_return_file rf
          WHERE rf.return_file_id = $1::uuid
        ),
        original AS (
          SELECT prf.*
          FROM payroll.payment_remittance_file prf
          JOIN source_return sr ON sr.remittance_file_id = prf.id
        ),
        rejected AS (
          SELECT rd.*, original.payroll_run_id
          FROM payroll.payment_return_detail rd
          JOIN source_return sr ON sr.return_file_id = rd.return_file_id
          JOIN original ON true
          WHERE rd.internal_status <> 'ACCEPTED'
        ),
        new_file AS (
          INSERT INTO payroll.payment_remittance_file (
            tenant_id,
            payroll_run_id,
            branch_id,
            processing_type_id,
            reason_id,
            status,
            competence_year,
            competence_month,
            payment_date,
            file_name,
            bank_code,
            total_amount
          )
          SELECT
            original.tenant_id,
            original.payroll_run_id,
            original.branch_id,
            original.processing_type_id,
            original.reason_id,
            'DRAFT'::"PaymentRemittanceStatus",
            original.competence_year,
            original.competence_month,
            original.payment_date,
            'reprocess_' || $1::text || '.txt',
            original.bank_code,
            COALESCE(sum(rejected.amount), 0)::numeric(14,2)
          FROM original
          LEFT JOIN rejected ON true
          GROUP BY original.id
          HAVING count(rejected.return_detail_id) > 0
          RETURNING id, tenant_id
        ),
        inserted_details AS (
          INSERT INTO payroll.payment_remittance_detail (
            tenant_id,
            file_id,
            sequence,
            employee_id,
            amount,
            bank_code,
            branch,
            account,
            occurrence_code
          )
          SELECT
            nf.tenant_id,
            nf.id,
            row_number() OVER (ORDER BY rejected.sequence)::integer,
            rejected.employee_id,
            rejected.amount,
            original_detail.bank_code,
            original_detail.branch,
            original_detail.account,
            NULL
          FROM new_file nf
          JOIN rejected ON true
          JOIN payroll.payment_remittance_detail original_detail
            ON original_detail.id = rejected.remittance_detail_id
          RETURNING file_id
        )
        SELECT nf.id::text, count(inserted_details.file_id)::text AS count
        FROM new_file nf
        JOIN inserted_details ON inserted_details.file_id = nf.id
        GROUP BY nf.id
        `,
        [returnFileId],
      );

      const row = rows.rows[0];
      if (!row) {
        throw new UnprocessableEntityException(
          'No rejected CNAB return details are available for reprocessing',
        );
      }
      return {
        remittanceFileId: row.id,
        sourceReturnFileId: returnFileId,
        detailCount: Number(row.count),
      };
    });
  }

  private async loadRemittance(
    client: PoolClient,
    id: string,
  ): Promise<RemittanceRow> {
    const rows = await client.query<RemittanceRow>(
      `
      SELECT
        id::text,
        tenant_id::text,
        payroll_run_id::text,
        competence_year,
        competence_month,
        payment_date,
        file_hash,
        bank_code,
        processing_type_id::text,
        total_amount::text
      FROM payroll.payment_remittance_file
      WHERE id = $1::uuid
      `,
      [id],
    );
    if (!rows.rows[0]) {
      throw new NotFoundException('Payment remittance file not found');
    }
    return rows.rows[0];
  }

  private async matchDetail(
    client: PoolClient,
    remittance: RemittanceRow,
    parsedDetail: { sequence: number; employeeId: string; amount: string },
  ): Promise<DetailRow> {
    const rows = await client.query<DetailRow>(
      `
      SELECT id::text, employee_id::text, amount::text
      FROM payroll.payment_remittance_detail
      WHERE tenant_id = $1::uuid
        AND file_id = $2::uuid
        AND sequence = $3
        AND employee_id = $4::uuid
        AND amount = $5::numeric(14,2)
      `,
      [
        remittance.tenant_id,
        remittance.id,
        parsedDetail.sequence,
        parsedDetail.employeeId,
        parsedDetail.amount,
      ],
    );
    if (!rows.rows[0]) {
      throw new UnprocessableEntityException(
        `CNAB return detail ${parsedDetail.sequence} does not match the original remittance detail`,
      );
    }
    return rows.rows[0];
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for CNAB return processing',
      );
    }
  }
}

function toPayrollPaymentStatus(
  internalStatus: Cnab240ReturnInternalStatus,
): 'PROCESSED' | 'REJECTED' | 'RETURNED' {
  if (internalStatus === 'ACCEPTED') return 'PROCESSED';
  if (internalStatus === 'RETURNED_OTHER') return 'RETURNED';
  return 'REJECTED';
}
