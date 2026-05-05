import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DatabaseService } from '../../../database/database.service';
import {
  CompanyBankAccountLookup,
  ResolvedCompanyBankAccount,
} from './company-bank-account.types';

interface CompanyBankAccountRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  bank_id: string;
  bank_code: number;
  branch: string;
  branch_dv: string | null;
  account: string;
  account_dv: string;
  convenio: string;
  agency_agreement: string;
  modality: string;
  service_form_code: string;
  purpose_code_default: string | null;
  layout_version: string;
  relay_endpoint_url: string | null;
  relay_credential_secret_ref: string | null;
  relay_mode: 'mock' | 'http' | 'sftp';
  active: boolean;
}

@Injectable()
export class CompanyBankAccountService {
  constructor(private readonly databaseService: DatabaseService) {}

  async resolve(
    lookup: CompanyBankAccountLookup,
  ): Promise<ResolvedCompanyBankAccount> {
    this.ensureDatabase();
    const bankCode = this.normalizeBankCode(lookup.bankCode);
    const rows = await this.databaseService.query<CompanyBankAccountRow>(
      `
      SELECT
        id::text,
        tenant_id::text,
        bank_id::text,
        bank_code,
        branch,
        branch_dv,
        account,
        account_dv,
        convenio,
        agency_agreement,
        modality,
        service_form_code,
        purpose_code_default,
        layout_version,
        relay_endpoint_url,
        relay_credential_secret_ref,
        relay_mode,
        active
      FROM payroll.company_bank_account
      WHERE tenant_id = public.sgp_current_tenant_uuid()
        AND bank_code = $1::smallint
        AND service_form_code = $2
        AND active = true
      ORDER BY updated_at DESC
      LIMIT 1
      `,
      [Number(bankCode), lookup.serviceFormCode],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException(
        `No active company_bank_account for bank ${bankCode} service form ${lookup.serviceFormCode}`,
      );
    }
    return this.toResolved(row);
  }

  async list(): Promise<ResolvedCompanyBankAccount[]> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<CompanyBankAccountRow>(
      `
      SELECT
        id::text,
        tenant_id::text,
        bank_id::text,
        bank_code,
        branch,
        branch_dv,
        account,
        account_dv,
        convenio,
        agency_agreement,
        modality,
        service_form_code,
        purpose_code_default,
        layout_version,
        relay_endpoint_url,
        relay_credential_secret_ref,
        relay_mode,
        active
      FROM payroll.company_bank_account
      WHERE tenant_id = public.sgp_current_tenant_uuid()
      ORDER BY bank_code, service_form_code, updated_at DESC
      `,
    );
    return rows.map((row) => this.toResolved(row));
  }

  private normalizeBankCode(bankCode: string): string {
    const digits = String(bankCode ?? '').replace(/\D/g, '');
    if (!digits) {
      throw new NotFoundException('bankCode is required');
    }
    return digits.padStart(3, '0');
  }

  private toResolved(row: CompanyBankAccountRow): ResolvedCompanyBankAccount {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      bankId: row.bank_id,
      bankCode: String(row.bank_code).padStart(3, '0'),
      branch: row.branch,
      branchDv: row.branch_dv,
      account: row.account,
      accountDv: row.account_dv,
      convenio: row.convenio,
      agencyAgreement: row.agency_agreement,
      modality: row.modality,
      serviceFormCode: row.service_form_code,
      purposeCodeDefault: row.purpose_code_default,
      layoutVersion: row.layout_version,
      relayEndpointUrl: row.relay_endpoint_url,
      relayCredentialSecretRef: row.relay_credential_secret_ref,
      relayMode: row.relay_mode,
      active: row.active,
    };
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException('Database is not configured');
    }
  }
}
