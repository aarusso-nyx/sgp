import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PoolClient, QueryResultRow } from 'pg';

import { DatabaseService } from '../../../database/database.service';
import { CreateBankAccountDto } from './bank-account.dto';
import { BankAccountValidatorService } from './bank-account-validator.service';

interface EmployeeBankContextRow extends QueryResultRow {
  tenant_id: string;
  employee_id: string;
  employee_cpf: string | null;
  bank_id: string;
  bank_code: string;
  dependent_id: string | null;
  dependent_cpf: string | null;
  payroll_credit_authorized: boolean | null;
  authorization_document_id: string | null;
}

interface BankAccountRow extends QueryResultRow {
  id: string;
  bank_code: string;
  agency: string;
  agency_digit: string | null;
  account_number: string;
  account_digit: string;
  holder_kind: string;
  holder_cpf: string;
  validation_status: string;
  validation_error_code: string | null;
  validated_at: Date | string | null;
  updated_at: Date | string;
}

export interface BankAccountSummary {
  id: string;
  bankCode: string;
  agency: string;
  agencyDigit: string | null;
  accountNumber: string;
  accountDigit: string;
  holderKind: string;
  holderCpf: string;
  validationStatus: string;
  validationErrorCode: string | null;
  validatedAt: string | null;
  updatedAt: string;
}

@Injectable()
export class BankAccountService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly validator: BankAccountValidatorService,
  ) {}

  async list(employeeId: string): Promise<BankAccountSummary[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<BankAccountRow>(
      `
      SELECT
        account.id::text,
        bank.code AS bank_code,
        account.agency,
        account.agency_digit,
        account.account_number,
        account.account_digit,
        account.holder_kind::text,
        account.holder_cpf,
        account.validation_status::text,
        account.validation_error_code,
        account.validated_at,
        account.updated_at
      FROM hr.v_employee_bank_account_pii_decrypted account
      JOIN hr.bank bank ON bank.id = account.bank_id
      WHERE account.employee_id = $1::uuid
      ORDER BY account.updated_at DESC
      `,
      [employeeId],
    );
    return rows.map((row) => this.toSummary(row));
  }

  async create(
    employeeId: string,
    input: CreateBankAccountDto,
  ): Promise<BankAccountSummary> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const context = await this.getContext(client, employeeId, input);
      this.assertHolder(context, input);
      const validation = this.validator.validate({
        bankCode: context.bank_code,
        agency: input.agency,
        agencyDigit: input.agencyDigit,
        accountNumber: input.accountNumber,
        accountDigit: input.accountDigit,
        holderCpf: input.holderCpf,
      });
      if (!validation.valid) {
        throw new UnprocessableEntityException({
          validation_error_code: validation.validationErrorCode,
        });
      }

      const rows = await client.query<BankAccountRow>(
        `
        WITH inserted AS (
          INSERT INTO hr.employee_bank_account (
            tenant_id,
            employee_id,
            bank_id,
            agency,
            agency_digit,
            account_number,
            account_digit,
            holder_kind,
            holder_cpf,
            dependent_id,
            validation_status,
            validation_error_code,
            validated_at,
            validated_by
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3::uuid,
            $4,
            NULLIF($5, ''),
            $6,
            $7,
            $8::hr.employee_bank_account_holder_kind,
            $9,
            NULLIF($10, '')::uuid,
            'VALID'::hr.employee_bank_account_validation_status,
            NULL,
            now(),
            NULL
          )
          RETURNING *
        )
        SELECT
          inserted.id::text,
          bank.code AS bank_code,
          inserted.agency,
          inserted.agency_digit,
          account.account_number,
          inserted.account_digit,
          inserted.holder_kind::text,
          inserted.holder_cpf,
          inserted.validation_status::text,
          inserted.validation_error_code,
          inserted.validated_at,
          inserted.updated_at
        FROM inserted
        JOIN hr.v_employee_bank_account_pii_decrypted account
          ON account.id = inserted.id
        JOIN hr.bank bank ON bank.id = inserted.bank_id
        `,
        [
          context.tenant_id,
          employeeId,
          context.bank_id,
          input.agency,
          input.agencyDigit ?? '',
          input.accountNumber,
          input.accountDigit,
          input.holderKind,
          input.holderCpf,
          input.dependentId ?? '',
        ],
      );

      return this.toSummary(rows.rows[0]!);
    });
  }

  async revalidate(
    employeeId: string,
    accountId: string,
  ): Promise<BankAccountSummary> {
    this.ensureDatabase();
    return this.databaseService.transaction(async (client) => {
      const account = await client.query<BankAccountRow & { bank_id: string }>(
        `
        SELECT
          account.id::text,
          account.bank_id::text,
          bank.code AS bank_code,
          account.agency,
          account.agency_digit,
          account.account_number,
          account.account_digit,
          account.holder_kind::text,
          account.holder_cpf,
          account.validation_status::text,
          account.validation_error_code,
          account.validated_at,
          account.updated_at
        FROM hr.v_employee_bank_account_pii_decrypted account
        JOIN hr.bank bank ON bank.id = account.bank_id
        WHERE account.employee_id = $1::uuid
          AND account.id = $2::uuid
        `,
        [employeeId, accountId],
      );
      const current = account.rows[0];
      if (!current) throw new NotFoundException('Bank account not found');

      const validation = this.validator.validate({
        bankCode: current.bank_code,
        agency: current.agency,
        agencyDigit: current.agency_digit,
        accountNumber: current.account_number,
        accountDigit: current.account_digit,
        holderCpf: current.holder_cpf,
      });
      const rows = await client.query<BankAccountRow>(
        `
        WITH updated AS (
          UPDATE hr.employee_bank_account
          SET validation_status = $3::hr.employee_bank_account_validation_status,
              validation_error_code = $4,
              validated_at = CASE WHEN $3 = 'VALID' THEN now() ELSE NULL END,
              updated_at = now()
          WHERE employee_id = $1::uuid
            AND id = $2::uuid
          RETURNING id
        )
        SELECT
          account.id::text,
          bank.code AS bank_code,
          account.agency,
          account.agency_digit,
          account.account_number,
          account.account_digit,
          account.holder_kind::text,
          account.holder_cpf,
          account.validation_status::text,
          account.validation_error_code,
          account.validated_at,
          account.updated_at
        FROM updated
        JOIN hr.v_employee_bank_account_pii_decrypted account
          ON account.id = updated.id
        JOIN hr.bank bank ON bank.id = account.bank_id
        `,
        [
          employeeId,
          accountId,
          validation.valid ? 'VALID' : 'REJECTED',
          validation.validationErrorCode,
        ],
      );
      return this.toSummary(rows.rows[0]!);
    });
  }

  private async getContext(
    client: PoolClient,
    employeeId: string,
    input: CreateBankAccountDto,
  ): Promise<EmployeeBankContextRow> {
    const rows = await client.query<EmployeeBankContextRow>(
      `
      SELECT
        employee.tenant_id::text,
        employee.id::text AS employee_id,
        employee.cpf AS employee_cpf,
        bank.id::text AS bank_id,
        bank.code AS bank_code,
        dependent.id::text AS dependent_id,
        dependent.cpf AS dependent_cpf,
        COALESCE(dependent.payroll_credit_authorized, false) AS payroll_credit_authorized,
        dependent.authorization_document_id::text AS authorization_document_id
      FROM hr.employee employee
      JOIN hr.bank bank
        ON bank.code = lpad(regexp_replace($2, '\\D', '', 'g'), 3, '0')
       AND bank.tenant_id = employee.tenant_id
       AND bank.blocked = false
      LEFT JOIN hr.employee_dependent dependent
        ON dependent.id = NULLIF($3, '')::uuid
       AND dependent.employee_id = employee.id
       AND dependent.tenant_id = employee.tenant_id
      WHERE employee.id = $1::uuid
      `,
      [employeeId, input.bankCode, input.dependentId ?? ''],
    );
    const context = rows.rows[0];
    if (!context) throw new NotFoundException('Employee or bank not found');
    return context;
  }

  private assertHolder(
    context: EmployeeBankContextRow,
    input: CreateBankAccountDto,
  ): void {
    const holderCpf = this.onlyDigits(input.holderCpf);
    if (input.holderKind === 'SELF') {
      if (holderCpf !== this.onlyDigits(context.employee_cpf ?? '')) {
        throw new UnprocessableEntityException({
          validation_error_code: 'HOLDER_CPF_NOT_EMPLOYEE',
        });
      }
      return;
    }

    if (
      !context.dependent_id ||
      holderCpf !== this.onlyDigits(context.dependent_cpf ?? '') ||
      !context.payroll_credit_authorized ||
      !context.authorization_document_id
    ) {
      throw new UnprocessableEntityException({
        validation_error_code: 'DEPENDENT_NOT_AUTHORIZED',
      });
    }
  }

  private toSummary(row: BankAccountRow): BankAccountSummary {
    return {
      id: row.id,
      bankCode: row.bank_code,
      agency: row.agency,
      agencyDigit: row.agency_digit,
      accountNumber: row.account_number,
      accountDigit: row.account_digit,
      holderKind: row.holder_kind,
      holderCpf: row.holder_cpf,
      validationStatus: row.validation_status,
      validationErrorCode: row.validation_error_code,
      validatedAt: row.validated_at
        ? new Date(row.validated_at).toISOString()
        : null,
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private onlyDigits(value: string): string {
    return String(value ?? '').replace(/\D/g, '');
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('Database is not configured');
    }
  }
}
