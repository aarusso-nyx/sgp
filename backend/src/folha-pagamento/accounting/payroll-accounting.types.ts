import { QueryResultRow } from 'pg';

export interface CountRow extends QueryResultRow {
  total: string;
}

export interface CatalogRow extends QueryResultRow {
  id: string;
  code: string;
  description: string;
  active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AccountingAccountRow extends QueryResultRow {
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

export interface CatalogMapping {
  table: string;
  label: string;
  route: string;
  searchExpression: string;
  metadataExpression?: string | undefined;
  typeColumn?: string | undefined;
}

export const PAYROLL_ACCOUNTING_CATALOGS: Record<string, CatalogMapping> = {
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
