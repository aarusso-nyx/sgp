import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  Cnab240BuilderService,
  Cnab240BuildResult,
  Cnab240PaymentInput,
} from './cnab240-builder.service';
import { toAlimonyPaymentInput } from './alimony-segment-builder';

interface EmitInput {
  remittanceId: string;
  bankId: string;
  remittanceNumber: number;
  format: string;
}

interface RemittanceSourceRow extends QueryResultRow {
  remittance_id: string;
  tenant_id: string;
  payroll_run_id: string;
  competence_year: number;
  competence_month: number;
  payment_date: Date | string | null;
  file_name: string | null;
  payroll_status: string;
  company_name: string;
  company_registration: string;
}

interface BankRow extends QueryResultRow {
  bank_id: string;
  bank_code: string;
}

interface PaymentRow extends QueryResultRow {
  employee_id: string;
  employee_name: string;
  employee_document: string | null;
  bank_code: string;
  branch: string;
  branch_digit: string | null;
  account: string;
  account_digit: string;
  amount: string;
}

interface AlimonyPaymentRow extends QueryResultRow {
  alimony_id: string;
  employee_id: string;
  beneficiary_name: string;
  beneficiary_cpf: string | null;
  beneficiary_bank_code: number;
  beneficiary_branch: string;
  beneficiary_account: string;
  amount: string;
}

@Injectable()
export class Cnab240EmitService {
  private readonly builder = new Cnab240BuilderService();

  constructor(private readonly databaseService: DatabaseService) {}

  async emit(input: EmitInput): Promise<Cnab240BuildResult> {
    if (input.format !== 'CNAB240') {
      throw new UnprocessableEntityException(
        'Only CNAB240 remittance is supported',
      );
    }

    return this.databaseService.transaction(async (client) => {
      const remittance = await this.getRemittance(client, input.remittanceId);
      if (remittance.payroll_status !== 'APPROVED') {
        throw new UnprocessableEntityException(
          'Payroll run must be APPROVED before CNAB remittance generation',
        );
      }

      const bank = await this.resolveBank(client, input.bankId);
      const payments = await this.getEligiblePayments(
        client,
        remittance.payroll_run_id,
        bank.bank_code,
      );
      const alimonyPayments = await this.getAlimonyPayments(
        client,
        remittance.payroll_run_id,
      );
      const remittancePayments = [...payments, ...alimonyPayments];
      if (remittancePayments.length === 0) {
        throw new NotFoundException(
          'No valid employee bank account is eligible for CNAB remittance',
        );
      }

      const generatedAt = new Date();
      const artifact = this.builder.build({
        bankCode: bank.bank_code,
        companyName: remittance.company_name,
        companyRegistration: remittance.company_registration,
        paymentDate:
          this.toDateString(remittance.payment_date) ??
          this.defaultPaymentDate(
            remittance.competence_year,
            remittance.competence_month,
          ),
        generatedAt,
        remittanceNumber: input.remittanceNumber,
        payments: remittancePayments,
      });

      await client.query(
        `
        DELETE FROM payroll.payment_remittance_detail
        WHERE file_id = $1::uuid
        `,
        [input.remittanceId],
      );
      for (const detail of artifact.details) {
        await client.query(
          `
          INSERT INTO payroll.payment_remittance_detail (
            tenant_id,
            file_id,
            sequence,
            employee_id,
            amount,
            bank_code,
            branch,
            account,
            purpose_code,
            alimony_id,
            occurrence_code
          )
          VALUES (
            public.sgp_current_tenant_uuid(),
            $1::uuid,
            $2,
            $3::uuid,
            $4::numeric(14,2),
            $5,
            $6,
            $7,
            $8,
            NULLIF($9, '')::uuid,
            NULL
          )
          `,
          [
            input.remittanceId,
            detail.sequence,
            detail.employeeId,
            detail.amount,
            detail.bankCode,
            detail.branch,
            detail.account,
            detail.purposeCode,
            detail.alimonyId ?? '',
          ],
        );
      }

      await client.query(
        `
        UPDATE payroll.payment_remittance_file
        SET status = 'GENERATED'::"PaymentRemittanceStatus",
            bank_code = $2,
            layout_version = $3,
            record_count = $4,
            total_amount = $5::numeric(14,2),
            file_hash = $6,
            file_name = $7,
            generated_at = $8::timestamptz,
            generated_by = NULLIF($9, '')::uuid,
            updated_at = now()
        WHERE id = $1::uuid
        `,
        [
          input.remittanceId,
          Number(bank.bank_code),
          artifact.layoutVersion,
          artifact.recordCount,
          artifact.totalAmount,
          artifact.fileHash,
          artifact.fileName,
          generatedAt.toISOString(),
          '',
        ],
      );

      return artifact;
    });
  }

  private async getRemittance(
    client: PoolClient,
    remittanceId: string,
  ): Promise<RemittanceSourceRow> {
    const rows = await client.query<RemittanceSourceRow>(
      `
      SELECT
        prf.id::text AS remittance_id,
        prf.tenant_id::text AS tenant_id,
        pr.id::text AS payroll_run_id,
        prf.competence_year,
        prf.competence_month,
        prf.payment_date,
        prf.file_name,
        pr.status::text AS payroll_status,
        tenant.name AS company_name,
        tenant.code AS company_registration
      FROM payroll.payment_remittance_file prf
      JOIN payroll.payroll_run pr ON pr.id = prf.payroll_run_id
      JOIN public.tenant tenant ON tenant.id = prf.tenant_id
      WHERE prf.id = $1::uuid
      `,
      [remittanceId],
    );
    const row = rows.rows[0];
    if (!row) throw new NotFoundException('Remittance record not found');
    return row;
  }

  private async resolveBank(
    client: PoolClient,
    bankId: string,
  ): Promise<BankRow> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bankId,
      );
    const rows = await client.query<BankRow>(
      isUuid
        ? `
          SELECT id::text AS bank_id, code AS bank_code
          FROM hr.bank
          WHERE tenant_id = public.sgp_current_tenant_uuid()
            AND blocked = false
            AND id = $1::uuid
          LIMIT 1
          `
        : `
          SELECT id::text AS bank_id, code AS bank_code
          FROM hr.bank
          WHERE tenant_id = public.sgp_current_tenant_uuid()
            AND blocked = false
            AND code = lpad(regexp_replace($1, '\\D', '', 'g'), 3, '0')
          LIMIT 1
          `,
      [bankId],
    );
    const row = rows.rows[0];
    if (!row) throw new NotFoundException('Bank not found for CNAB remittance');
    return row;
  }

  private async getEligiblePayments(
    client: PoolClient,
    payrollRunId: string,
    bankCode: string,
  ): Promise<Cnab240PaymentInput[]> {
    const rows = await client.query<PaymentRow>(
      `
      WITH employee_net AS (
        SELECT
          item.employee_id,
          round(coalesce(sum(
            CASE
              WHEN earning.kind = 'EARNING'::"PayrollEntryKind" THEN item.amount
              WHEN earning.kind = 'DEDUCTION'::"PayrollEntryKind" THEN -item.amount
              ELSE 0
            END
          ), 0), 2)::numeric(14,2) AS amount
        FROM payroll.employee_payroll_item item
        JOIN payroll.payroll_earning_deduction earning
          ON earning.id = item.earning_deduction_id
        WHERE item.payroll_run_id = $1::uuid
          AND item.deleted_at IS NULL
        GROUP BY item.employee_id
      ),
      selected_account AS (
        SELECT DISTINCT ON (account.employee_id)
          account.employee_id,
          bank.code AS bank_code,
          account.agency,
          account.agency_digit,
          account.account_number,
          account.account_digit
        FROM hr.v_employee_bank_account_pii_decrypted account
        JOIN hr.bank bank ON bank.id = account.bank_id
        WHERE account.validation_status = 'VALID'::hr.employee_bank_account_validation_status
          AND bank.code = $2
        ORDER BY account.employee_id, account.updated_at DESC, account.id
      )
      SELECT
        employee.id::text AS employee_id,
        employee.name AS employee_name,
        employee.cpf AS employee_document,
        account.bank_code,
        account.agency AS branch,
        account.agency_digit AS branch_digit,
        account.account_number AS account,
        account.account_digit,
        employee_net.amount::text AS amount
      FROM employee_net
      JOIN hr.employee employee ON employee.id = employee_net.employee_id
      JOIN selected_account account ON account.employee_id = employee.id
      WHERE employee_net.amount > 0
      ORDER BY employee.registration, employee.id
      `,
      [payrollRunId, bankCode],
    );

    return rows.rows.map((row) => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      employeeDocument: row.employee_document ?? '',
      bankCode: row.bank_code,
      branch: row.branch,
      branchDigit: row.branch_digit,
      account: row.account,
      accountDigit: row.account_digit,
      amount: row.amount,
    }));
  }

  private async getAlimonyPayments(
    client: PoolClient,
    payrollRunId: string,
  ): Promise<Cnab240PaymentInput[]> {
    const rows = await client.query<AlimonyPaymentRow>(
      `
      SELECT
        alimony.id::text AS alimony_id,
        alimony.employee_id::text AS employee_id,
        alimony.beneficiary_name,
        alimony.beneficiary_cpf,
        alimony.beneficiary_bank_code,
        alimony.beneficiary_branch,
        alimony.beneficiary_account,
        item.amount::text AS amount
      FROM hr.employee_alimony alimony
      JOIN payroll.employee_payroll_item item
        ON item.tenant_id = alimony.tenant_id
       AND item.employee_id = alimony.employee_id
       AND item.payroll_run_id = $1::uuid
       AND item.idempotency_key = 'alimony:' || alimony.id::text || ':' || item.competence_year::text || '-' || lpad(item.competence_month::text, 2, '0')
       AND item.deleted_at IS NULL
      WHERE alimony.tenant_id = public.sgp_current_tenant_uuid()
        AND alimony.status = 'ACTIVE'::hr.employee_alimony_status
        AND alimony.judicial_account = true
        AND alimony.beneficiary_bank_code IS NOT NULL
        AND alimony.beneficiary_branch IS NOT NULL
        AND alimony.beneficiary_account IS NOT NULL
      ORDER BY alimony.employee_id, alimony.priority, alimony.id
      `,
      [payrollRunId],
    );

    return rows.rows.map((row) =>
      toAlimonyPaymentInput({
        alimonyId: row.alimony_id,
        employeeId: row.employee_id,
        beneficiaryName: row.beneficiary_name,
        beneficiaryCpf: row.beneficiary_cpf ?? '',
        beneficiaryBankCode: String(row.beneficiary_bank_code).padStart(3, '0'),
        beneficiaryBranch: row.beneficiary_branch,
        beneficiaryAccount: row.beneficiary_account,
        amount: row.amount,
      }),
    );
  }

  private toDateString(value: Date | string | null): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value.slice(0, 10);
    return value.toISOString().slice(0, 10);
  }

  private defaultPaymentDate(year: number, month: number): string {
    return new Date(Date.UTC(year, month - 1, 25)).toISOString().slice(0, 10);
  }
}
