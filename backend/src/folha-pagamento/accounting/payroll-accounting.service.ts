import {
  Injectable,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import {
  PayrollAccountingAccountMutationDto,
  PayrollCatalogMutationDto,
} from './payroll-accounting.dto';

interface CountRow extends QueryResultRow {
  total: string;
}

interface CatalogRow extends QueryResultRow {
  id: string;
  code: string;
  description: string;
  active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface AccountingAccountRow extends QueryResultRow {
  id: string;
  code: string;
  description: string;
  active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PayrollCatalogResource {
  key: string;
  label: string;
  route: string;
}

export interface PayrollCatalogRecord {
  id: string;
  code: string;
  description: string;
  active: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface CatalogMapping {
  table: string;
  label: string;
  route: string;
  searchExpression: string;
  metadataExpression?: string;
  typeColumn?: string;
}

const CATALOGS: Record<string, CatalogMapping> = {
  'gps-codes': {
    table: 'payroll.gps_payment_code',
    label: 'Codigos GPS',
    route: '#!/folha/catalogos/codigoPagamentoGps',
    searchExpression: "lower(concat_ws(' ', code, description))",
  },
  sefip: {
    table: 'payroll.sefip_code',
    label: 'Codigos SEFIP',
    route: '#!/folha/catalogos/sefip',
    searchExpression: "lower(concat_ws(' ', code, description, type))",
    metadataExpression: "jsonb_build_object('type', type)",
    typeColumn: 'type',
  },
  'accounting-histories': {
    table: 'payroll.accounting_history',
    label: 'Historicos Contabeis',
    route: '#!/folha/catalogos/historicoContabil',
    searchExpression: "lower(concat_ws(' ', code, description))",
  },
  'simple-accounts': {
    table: 'payroll.simple_account',
    label: 'Contas Simples',
    route: '#!/folha/catalogos/contaContabilSimples',
    searchExpression: "lower(concat_ws(' ', code, description))",
  },
};

@Injectable()
export class PayrollAccountingService {
  constructor(private readonly databaseService: DatabaseService) {}

  listCatalogResources(): PayrollCatalogResource[] {
    return Object.entries(CATALOGS).map(([key, mapping]) => ({
      key,
      label: mapping.label,
      route: mapping.route,
    }));
  }

  async listCatalogRecords(
    resource: string,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<PayrollCatalogRecord>> {
    this.ensureDatabase();
    const mapping = this.getCatalogMapping(resource);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(*)::text AS total
      FROM ${mapping.table}
      WHERE ($1 = '%%') OR ${mapping.searchExpression} LIKE $1
      `,
      [searchTerm],
    );

    const rows = await this.databaseService.query<CatalogRow>(
      `
      SELECT
        id::text AS id,
        code,
        description,
        status = 'ACTIVE'::"RecordStatus" AS active,
        ${mapping.metadataExpression ?? "'{}'::jsonb"} AS metadata,
        created_at,
        updated_at
      FROM ${mapping.table}
      WHERE ($1 = '%%') OR ${mapping.searchExpression} LIKE $1
      ORDER BY code
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );

    return {
      items: rows.map((row) => this.toCatalogRecord(row)),
      page,
      pageSize,
      total: Number(count[0]?.total ?? 0),
      totalPages:
        Number(count[0]?.total ?? 0) === 0
          ? 0
          : Math.ceil(Number(count[0]?.total ?? 0) / pageSize),
    };
  }

  async createCatalogRecord(
    resource: string,
    input: PayrollCatalogMutationDto,
  ): Promise<PayrollCatalogRecord> {
    this.ensureDatabase();
    const mapping = this.getCatalogMapping(resource);
    const typeValue = this.getCatalogTypeValue(mapping, input);
    const rows = await this.databaseService.query<CatalogRow>(
      `
      INSERT INTO ${mapping.table} (
        tenant_id,
        code,
        description,
        ${mapping.typeColumn ? `${mapping.typeColumn},` : ''}
        status
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        $1,
        $2,
        ${mapping.typeColumn ? '$3,' : ''}
        ${mapping.typeColumn ? '$4' : '$3'}::"RecordStatus"
      )
      RETURNING
        id::text AS id,
        code,
        description,
        status = 'ACTIVE'::"RecordStatus" AS active,
        ${mapping.metadataExpression ?? "'{}'::jsonb"} AS metadata,
        created_at,
        updated_at
      `,
      mapping.typeColumn
        ? [
            input.code.trim(),
            input.description.trim(),
            typeValue,
            this.toRecordStatus(input.active),
          ]
        : [
            input.code.trim(),
            input.description.trim(),
            this.toRecordStatus(input.active),
          ],
    );
    return this.toCatalogRecord(rows[0]);
  }

  async updateCatalogRecord(
    resource: string,
    id: string,
    input: PayrollCatalogMutationDto,
  ): Promise<PayrollCatalogRecord> {
    this.ensureDatabase();
    const mapping = this.getCatalogMapping(resource);
    const typeValue = this.getCatalogTypeValue(mapping, input);
    const rows = await this.databaseService.query<CatalogRow>(
      `
      UPDATE ${mapping.table}
      SET
        code = $2,
        description = $3,
        ${mapping.typeColumn ? `${mapping.typeColumn} = $4,` : ''}
        status = ${mapping.typeColumn ? '$5' : '$4'}::"RecordStatus",
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id::text AS id,
        code,
        description,
        status = 'ACTIVE'::"RecordStatus" AS active,
        ${mapping.metadataExpression ?? "'{}'::jsonb"} AS metadata,
        created_at,
        updated_at
      `,
      mapping.typeColumn
        ? [
            id,
            input.code.trim(),
            input.description.trim(),
            typeValue,
            this.toRecordStatus(input.active),
          ]
        : [
            id,
            input.code.trim(),
            input.description.trim(),
            this.toRecordStatus(input.active),
          ],
    );
    if (!rows[0]) {
      throw new NotFoundException('Payroll catalog record not found');
    }
    return this.toCatalogRecord(rows[0]);
  }

  async deactivateCatalogRecord(
    resource: string,
    id: string,
  ): Promise<PayrollCatalogRecord> {
    this.ensureDatabase();
    const mapping = this.getCatalogMapping(resource);
    const rows = await this.databaseService.query<CatalogRow>(
      `
      UPDATE ${mapping.table}
      SET status = 'INACTIVE'::"RecordStatus",
          updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id::text AS id,
        code,
        description,
        status = 'ACTIVE'::"RecordStatus" AS active,
        ${mapping.metadataExpression ?? "'{}'::jsonb"} AS metadata,
        created_at,
        updated_at
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Payroll catalog record not found');
    }
    return this.toCatalogRecord(rows[0]);
  }

  async listAccountingAccounts(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<PayrollCatalogRecord>> {
    this.ensureDatabase();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const searchTerm = `%${(query.search ?? '').toLowerCase()}%`;

    const count = await this.databaseService.query<CountRow>(
      `
      SELECT count(DISTINCT aa.id)::text AS total
      FROM payroll.accounting_account aa
      LEFT JOIN hr.branch b ON b.id = aa.branch_id
      LEFT JOIN hr.cost_center cc ON cc.id = aa.cost_center_id
      LEFT JOIN payroll.payroll_earning_deduction ed ON ed.id = aa.earning_deduction_id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              aa.account_type,
              aa.account_code,
              coalesce(b.name, ''),
              coalesce(cc.name, ''),
              coalesce(ed.code, ''),
              coalesce(ed.description, '')
            )) LIKE $1
      `,
      [searchTerm],
    );

    const rows = await this.databaseService.query<AccountingAccountRow>(
      `
      SELECT
        aa.id::text AS id,
        aa.account_code AS code,
        aa.account_type AS description,
        aa.status = 'ACTIVE'::"RecordStatus" AS active,
        jsonb_build_object(
          'accountType', aa.account_type,
          'accountCode', aa.account_code,
          'allocationPercent', aa.allocation_percent::text,
          'totalAllocationPercent', aa.total_allocation_percent::text,
          'branchId', aa.branch_id::text,
          'branchName', b.name,
          'costCenterId', aa.cost_center_id::text,
          'costCenterName', cc.name,
          'earningDeductionId', aa.earning_deduction_id::text,
          'earningCode', ed.code,
          'earningDescription', ed.description,
          'accountingHistoryId', aa.accounting_history_id::text,
          'accountingHistoryCode', ah.code,
          'simpleAccountingId', aa.simple_account_id::text,
          'simpleAccountingCode', sa.code,
          'workLocationIds',
            coalesce(
              jsonb_agg(aawl.work_location_id::text ORDER BY aawl.work_location_id)
              FILTER (WHERE aawl.work_location_id IS NOT NULL),
              '[]'::jsonb
            )
        ) AS metadata,
        aa.created_at,
        aa.updated_at
      FROM payroll.accounting_account aa
      LEFT JOIN hr.branch b ON b.id = aa.branch_id
      LEFT JOIN hr.cost_center cc ON cc.id = aa.cost_center_id
      LEFT JOIN payroll.payroll_earning_deduction ed ON ed.id = aa.earning_deduction_id
      LEFT JOIN payroll.accounting_history ah ON ah.id = aa.accounting_history_id
      LEFT JOIN payroll.simple_account sa ON sa.id = aa.simple_account_id
      LEFT JOIN payroll.accounting_account_work_location aawl
        ON aawl.accounting_account_id = aa.id
      WHERE ($1 = '%%')
         OR lower(concat_ws(' ',
              aa.account_type,
              aa.account_code,
              coalesce(b.name, ''),
              coalesce(cc.name, ''),
              coalesce(ed.code, ''),
              coalesce(ed.description, '')
            )) LIKE $1
      GROUP BY aa.id, b.name, cc.name, ed.code, ed.description, ah.code, sa.code
      ORDER BY aa.account_type, aa.account_code
      LIMIT $2 OFFSET $3
      `,
      [searchTerm, pageSize, offset],
    );

    const total = Number(count[0]?.total ?? 0);
    return {
      items: rows.map((row) => this.toCatalogRecord(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async createAccountingAccount(
    input: PayrollAccountingAccountMutationDto,
  ): Promise<PayrollCatalogRecord> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AccountingAccountRow>(
      `
      INSERT INTO payroll.accounting_account (
        tenant_id,
        branch_id,
        cost_center_id,
        earning_deduction_id,
        accounting_history_id,
        simple_account_id,
        account_type,
        account_code,
        allocation_percent,
        total_allocation_percent,
        status
      )
      VALUES (
        public.sgp_current_tenant_uuid(),
        NULLIF($1, '')::uuid,
        NULLIF($2, '')::uuid,
        NULLIF($3, '')::uuid,
        NULLIF($4, '')::uuid,
        NULLIF($5, '')::uuid,
        $6,
        $7,
        $8::decimal,
        $9::decimal,
        $10::"RecordStatus"
      )
      RETURNING
        id::text AS id,
        account_code AS code,
        account_type AS description,
        status = 'ACTIVE'::"RecordStatus" AS active,
        '{}'::jsonb AS metadata,
        created_at,
        updated_at
      `,
      [
        input.branchId ?? '',
        input.costCenterId ?? '',
        input.earningDeductionId ?? '',
        input.accountingHistoryId ?? '',
        input.simpleAccountingId ?? '',
        input.accountType.trim(),
        input.accountCode.trim(),
        input.allocationPercent,
        input.totalAllocationPercent ?? input.allocationPercent,
        this.toRecordStatus(input.active),
      ],
    );
    const created = rows[0];
    await this.syncAccountingWorkLocations(
      created.id,
      input.workLocationIds ?? [],
    );
    return this.getAccountingAccount(created.id);
  }

  async updateAccountingAccount(
    id: string,
    input: PayrollAccountingAccountMutationDto,
  ): Promise<PayrollCatalogRecord> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AccountingAccountRow>(
      `
      UPDATE payroll.accounting_account
      SET
        branch_id = NULLIF($2, '')::uuid,
        cost_center_id = NULLIF($3, '')::uuid,
        earning_deduction_id = NULLIF($4, '')::uuid,
        accounting_history_id = NULLIF($5, '')::uuid,
        simple_account_id = NULLIF($6, '')::uuid,
        account_type = $7,
        account_code = $8,
        allocation_percent = $9::decimal,
        total_allocation_percent = $10::decimal,
        status = $11::"RecordStatus",
        updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id::text AS id,
        account_code AS code,
        account_type AS description,
        status = 'ACTIVE'::"RecordStatus" AS active,
        '{}'::jsonb AS metadata,
        created_at,
        updated_at
      `,
      [
        id,
        input.branchId ?? '',
        input.costCenterId ?? '',
        input.earningDeductionId ?? '',
        input.accountingHistoryId ?? '',
        input.simpleAccountingId ?? '',
        input.accountType.trim(),
        input.accountCode.trim(),
        input.allocationPercent,
        input.totalAllocationPercent ?? input.allocationPercent,
        this.toRecordStatus(input.active),
      ],
    );
    if (!rows[0]) {
      throw new NotFoundException('Payroll accounting account not found');
    }
    await this.syncAccountingWorkLocations(id, input.workLocationIds ?? []);
    return this.getAccountingAccount(id);
  }

  async deactivateAccountingAccount(id: string): Promise<PayrollCatalogRecord> {
    this.ensureDatabase();
    const rows = await this.databaseService.query<AccountingAccountRow>(
      `
      UPDATE payroll.accounting_account
      SET status = 'INACTIVE'::"RecordStatus",
          updated_at = now()
      WHERE id = $1::uuid
      RETURNING
        id::text AS id,
        account_code AS code,
        account_type AS description,
        status = 'ACTIVE'::"RecordStatus" AS active,
        '{}'::jsonb AS metadata,
        created_at,
        updated_at
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Payroll accounting account not found');
    }
    return this.getAccountingAccount(id);
  }

  private async getAccountingAccount(
    id: string,
  ): Promise<PayrollCatalogRecord> {
    const rows = await this.databaseService.query<AccountingAccountRow>(
      `
      SELECT
        aa.id::text AS id,
        aa.account_code AS code,
        aa.account_type AS description,
        aa.status = 'ACTIVE'::"RecordStatus" AS active,
        jsonb_build_object(
          'accountType', aa.account_type,
          'accountCode', aa.account_code,
          'allocationPercent', aa.allocation_percent::text,
          'totalAllocationPercent', aa.total_allocation_percent::text,
          'branchId', aa.branch_id::text,
          'branchName', b.name,
          'costCenterId', aa.cost_center_id::text,
          'costCenterName', cc.name,
          'earningDeductionId', aa.earning_deduction_id::text,
          'earningCode', ed.code,
          'earningDescription', ed.description,
          'accountingHistoryId', aa.accounting_history_id::text,
          'accountingHistoryCode', ah.code,
          'simpleAccountingId', aa.simple_account_id::text,
          'simpleAccountingCode', sa.code,
          'workLocationIds',
            coalesce(
              jsonb_agg(aawl.work_location_id::text ORDER BY aawl.work_location_id)
              FILTER (WHERE aawl.work_location_id IS NOT NULL),
              '[]'::jsonb
            )
        ) AS metadata,
        aa.created_at,
        aa.updated_at
      FROM payroll.accounting_account aa
      LEFT JOIN hr.branch b ON b.id = aa.branch_id
      LEFT JOIN hr.cost_center cc ON cc.id = aa.cost_center_id
      LEFT JOIN payroll.payroll_earning_deduction ed ON ed.id = aa.earning_deduction_id
      LEFT JOIN payroll.accounting_history ah ON ah.id = aa.accounting_history_id
      LEFT JOIN payroll.simple_account sa ON sa.id = aa.simple_account_id
      LEFT JOIN payroll.accounting_account_work_location aawl
        ON aawl.accounting_account_id = aa.id
      WHERE aa.id = $1::uuid
      GROUP BY aa.id, b.name, cc.name, ed.code, ed.description, ah.code, sa.code
      `,
      [id],
    );
    if (!rows[0]) {
      throw new NotFoundException('Payroll accounting account not found');
    }
    return this.toCatalogRecord(rows[0]);
  }

  private async syncAccountingWorkLocations(
    accountingAccountId: string,
    workLocationIds: string[],
  ): Promise<void> {
    await this.databaseService.query(
      `
      DELETE FROM payroll.accounting_account_work_location
      WHERE accounting_account_id = $1::uuid
      `,
      [accountingAccountId],
    );
    if (workLocationIds.length === 0) {
      return;
    }
    await this.databaseService.query(
      `
      INSERT INTO payroll.accounting_account_work_location (
        tenant_id,
        accounting_account_id,
        work_location_id
      )
      SELECT
        public.sgp_current_tenant_uuid(),
        $1::uuid,
        unnest($2::uuid[])
      `,
      [accountingAccountId, workLocationIds],
    );
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for payroll accounting operations',
      );
    }
  }

  private getCatalogMapping(resource: string): CatalogMapping {
    const mapping = CATALOGS[resource];
    if (!mapping) {
      throw new NotImplementedException('Payroll catalog resource not mapped');
    }
    return mapping;
  }

  private getCatalogTypeValue(
    mapping: CatalogMapping,
    input: PayrollCatalogMutationDto,
  ): string {
    if (!mapping.typeColumn) {
      return '';
    }
    const value = input.type?.trim();
    if (!value) {
      throw new NotFoundException('Catalog type is required for this resource');
    }
    return value;
  }

  private toRecordStatus(active?: boolean): 'ACTIVE' | 'INACTIVE' {
    return active === false ? 'INACTIVE' : 'ACTIVE';
  }

  private toCatalogRecord(
    row: CatalogRow | AccountingAccountRow,
  ): PayrollCatalogRecord {
    return {
      id: row.id,
      code: row.code,
      description: row.description,
      active: row.active,
      metadata: row.metadata ?? {},
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
