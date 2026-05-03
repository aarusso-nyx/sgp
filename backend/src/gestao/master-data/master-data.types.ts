import { QueryResultRow } from 'pg';

import { MasterDataMutationDto } from './master-data.dto';

export type EvidenceStatus = 'observed' | 'inferred' | 'unverified';
export type StatusMode =
  | 'record'
  | 'agreement'
  | 'user'
  | 'boolean'
  | 'always-active';

export interface MasterDataField {
  key: string;
  label: string;
  type: 'text' | 'boolean' | 'number';
  required: boolean;
  maxLength?: number;
}

export interface MasterDataColumn {
  key: string;
  label: string;
}

export interface MasterDataResource {
  key: string;
  label: string;
  module: string;
  route: string;
  status: EvidenceStatus;
  observedActions: string[];
  fields: MasterDataField[];
  columns: MasterDataColumn[];
}

export interface MasterDataRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  status: EvidenceStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SqlRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CountRow extends QueryResultRow {
  total: string;
}

export interface ResourceSqlMapping {
  table: string;
  codeExpression: string;
  nameExpression: string;
  descriptionExpression: string;
  activeExpression: string;
  searchExpression: string;
  baseWhere?: string;
  metadataExpression?: string;
  writable: boolean;
  write?: WriteMapping;
}

export interface WriteMapping {
  codeColumn: string;
  nameColumn?: string;
  descriptionColumn?: string;
  statusColumn?: string;
  statusMode: StatusMode;
  extraInsertColumns?: string[];
  extraInsertValues?: (input: MasterDataMutationDto) => unknown[];
  extraUpdateAssignments?: string[];
  extraUpdateValues?: (input: MasterDataMutationDto) => unknown[];
}
