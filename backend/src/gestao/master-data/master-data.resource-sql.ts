import {
  MasterDataRecord,
  ResourceSqlMapping,
  SqlRow,
  StatusMode,
  WriteMapping,
} from './master-data.types';

export function selectSql(mapping: ResourceSqlMapping): string {
  return `SELECT ${returningSql(mapping)}
            FROM ${mapping.table}`;
}

export function searchWhere(
  expression: string,
  search: string | undefined,
  values: unknown[],
  baseWhere?: string,
): string {
  const clauses: string[] = [];
  if (baseWhere) clauses.push(baseWhere);
  if (!search) {
    return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  }
  values.push(`%${search.toLowerCase()}%`);
  clauses.push(`${expression} LIKE $${values.length}`);
  return `WHERE ${clauses.join(' AND ')}`;
}

export function returningSql(mapping: ResourceSqlMapping): string {
  return `id::text AS id,
            ${mapping.codeExpression}::text AS code,
            ${mapping.nameExpression}::text AS name,
            ${mapping.descriptionExpression}::text AS description,
            ${mapping.activeExpression} AS active,
            ${mapping.metadataExpression ?? `'{}'::jsonb`} AS metadata,
            created_at,
            updated_at`;
}

export function placeholders(
  columns: string[],
  write: WriteMapping,
  mapping: ResourceSqlMapping,
): string[] {
  return columns.map((column, index) => {
    if (column === write.statusColumn) return statusCast(index + 1, write);
    if (column === 'lifecycle_status') {
      return `$${index + 1}::"EmployeeLifecycleStatus"`;
    }
    if (
      column === 'kind' &&
      mapping.table === 'payroll.payroll_earning_deduction'
    ) {
      return `$${index + 1}::"PayrollEntryKind"`;
    }
    if (column === 'value' || column === 'metadata') {
      return `$${index + 1}::jsonb`;
    }
    return `$${index + 1}`;
  });
}

export function addStatusInsert(
  columns: string[],
  values: unknown[],
  write: WriteMapping,
  active: boolean,
): void {
  if (write.statusMode === 'always-active') return;
  if (write.statusMode === 'boolean') {
    columns.push('active');
    values.push(active);
    return;
  }
  if (!write.statusColumn) return;
  columns.push(write.statusColumn);
  values.push(statusValue(write.statusMode, active));
}

export function addStatusUpdate(
  assignments: string[],
  values: unknown[],
  write: WriteMapping,
  active: boolean,
): void {
  if (write.statusMode === 'always-active') return;
  if (write.statusMode === 'boolean') {
    pushAssignment(assignments, values, 'active', active);
    return;
  }
  if (!write.statusColumn) return;
  values.push(statusValue(write.statusMode, active));
  assignments.push(
    `${write.statusColumn} = ${statusCast(values.length, write)}`,
  );
}

export function pushAssignment(
  assignments: string[],
  values: unknown[],
  column: string,
  value: unknown,
  table?: string,
): void {
  values.push(value);
  if (column === 'lifecycle_status') {
    assignments.push(
      `${column} = $${values.length}::"EmployeeLifecycleStatus"`,
    );
    return;
  }
  if (column === 'kind' && table === 'payroll.payroll_earning_deduction') {
    assignments.push(`${column} = $${values.length}::"PayrollEntryKind"`);
    return;
  }
  if (column === 'value' || column === 'metadata') {
    assignments.push(`${column} = $${values.length}::jsonb`);
    return;
  }
  assignments.push(`${column} = $${values.length}`);
}

export function deactivateAssignment(write: WriteMapping): string {
  if (write.statusMode === 'boolean') return 'active = false';
  if (write.statusMode === 'agreement') {
    return `${write.statusColumn} = 'TERMINATED'::"AgreementStatus"`;
  }
  if (write.statusMode === 'user') {
    return `${write.statusColumn} = 'INACTIVE'::"UserStatus"`;
  }
  if (write.statusMode === 'always-active') return 'updated_at = now()';
  return `${write.statusColumn} = 'INACTIVE'::"RecordStatus"`;
}

export function rowToRecord(row: SqlRow): MasterDataRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? '',
    active: row.active,
    status: 'observed',
    metadata: row.metadata ?? {},
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export function pgErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const maybeError = error as { code?: unknown; cause?: unknown };
  if (typeof maybeError.code === 'string') return maybeError.code;
  if (typeof maybeError.cause === 'object' && maybeError.cause !== null) {
    const cause = maybeError.cause as { code?: unknown };
    if (typeof cause.code === 'string') return cause.code;
  }
  return undefined;
}

function statusCast(index: number, write: WriteMapping): string {
  if (write.statusMode === 'agreement') return `$${index}::"AgreementStatus"`;
  if (write.statusMode === 'user') return `$${index}::"UserStatus"`;
  return `$${index}::"RecordStatus"`;
}

function statusValue(mode: StatusMode, active: boolean): string {
  if (mode === 'agreement') return active ? 'ACTIVE' : 'TERMINATED';
  if (mode === 'user') return active ? 'ACTIVE' : 'INACTIVE';
  return active ? 'ACTIVE' : 'INACTIVE';
}

function iso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
