import { QueryResultRow } from 'pg';

export type TceStateSphere = 'STATE' | 'FEDERAL_DISTRICT' | 'MUNICIPAL';
export type TceLayoutStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'RETIRED';
export type TceLayoutFieldDataType =
  | 'STRING'
  | 'INT'
  | 'DECIMAL'
  | 'DATE'
  | 'DATETIME'
  | 'BOOLEAN'
  | 'ENUM'
  | 'XML_NODE';

export interface TceStateDto {
  id: string;
  code: string;
  name: string;
  sphere: TceStateSphere;
  parentStateCode: string | null;
  organKind: 'TCE' | 'TCM' | 'TCU';
  organName: string;
  organOfficialUrl: string;
}

export interface TceLayoutVersionDto {
  id: string;
  stateId: string;
  stateCode: string;
  systemName: string;
  version: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: TceLayoutStatus;
  publicationUrl: string;
  notes: string | null;
}

export interface TceLayoutFieldDto {
  id: string;
  layoutVersionId: string;
  fieldPath: string;
  dataType: TceLayoutFieldDataType;
  required: boolean;
  maxLength: number | null;
  decimalPrecision: number | null;
  decimalScale: number | null;
  transformRule: string | null;
  sourceHint: string | null;
  ordering: number;
}

export interface StateRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  sphere: TceStateSphere;
  parent_state_code: string | null;
  organ_kind: 'TCE' | 'TCM' | 'TCU';
  organ_name: string;
  organ_official_url: string;
}

export interface LayoutVersionRow extends QueryResultRow {
  id: string;
  state_id: string;
  state_code: string;
  system_name: string;
  version: string;
  effective_from: Date | string;
  effective_to: Date | string | null;
  status: TceLayoutStatus;
  publication_url: string;
  notes: string | null;
}

export interface LayoutFieldRow extends QueryResultRow {
  id: string;
  layout_version_id: string;
  field_path: string;
  data_type: TceLayoutFieldDataType;
  required: boolean;
  max_length: number | null;
  decimal_precision: number | null;
  decimal_scale: number | null;
  transform_rule: string | null;
  source_hint: string | null;
  ordering: number;
}

export interface LayoutVersionMutationDto {
  stateId: string;
  systemName: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status?: TceLayoutStatus;
  publicationUrl: string;
  notes?: string | null;
}

export interface LayoutFieldMutationDto {
  layoutVersionId: string;
  fieldPath: string;
  dataType: TceLayoutFieldDataType;
  required?: boolean;
  maxLength?: number | null;
  decimalPrecision?: number | null;
  decimalScale?: number | null;
  transformRule?: string | null;
  sourceHint?: string | null;
  ordering: number;
}

export function toStateDto(row: StateRow): TceStateDto {
  return {
    id: row.id,
    code: row.code.trim(),
    name: row.name,
    sphere: row.sphere,
    parentStateCode: row.parent_state_code?.trim() ?? null,
    organKind: row.organ_kind,
    organName: row.organ_name,
    organOfficialUrl: row.organ_official_url,
  };
}

export function toLayoutVersionDto(row: LayoutVersionRow): TceLayoutVersionDto {
  return {
    id: row.id,
    stateId: row.state_id,
    stateCode: row.state_code.trim(),
    systemName: row.system_name,
    version: row.version,
    effectiveFrom: dateOnly(row.effective_from),
    effectiveTo: row.effective_to ? dateOnly(row.effective_to) : null,
    status: row.status,
    publicationUrl: row.publication_url,
    notes: row.notes,
  };
}

export function toLayoutFieldDto(row: LayoutFieldRow): TceLayoutFieldDto {
  return {
    id: row.id,
    layoutVersionId: row.layout_version_id,
    fieldPath: row.field_path,
    dataType: row.data_type,
    required: row.required,
    maxLength: row.max_length,
    decimalPrecision: row.decimal_precision,
    decimalScale: row.decimal_scale,
    transformRule: row.transform_rule,
    sourceHint: row.source_hint,
    ordering: row.ordering,
  };
}

function dateOnly(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}
