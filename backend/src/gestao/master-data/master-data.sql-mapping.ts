import { ResourceSqlMapping, WriteMapping } from './master-data.types';

export function mapping(input: {
  table: string;
  code: string;
  name: string;
  description?: string;
  active: string;
  search: string;
  baseWhere?: string;
  metadata?: string;
  writable?: boolean;
  write?: WriteMapping;
}): ResourceSqlMapping {
  return {
    table: input.table,
    codeExpression: input.code,
    nameExpression: input.name,
    descriptionExpression: input.description ?? `''`,
    activeExpression: input.active,
    searchExpression: input.search,
    baseWhere: input.baseWhere,
    metadataExpression: input.metadata,
    writable: input.writable ?? Boolean(input.write),
    write: input.write,
  };
}

export function nameOnly(
  table: string,
  options: Partial<WriteMapping> & { metadata?: string } = {},
): ResourceSqlMapping {
  return mapping({
    table,
    code: 'code',
    name: 'name',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search: "lower(concat_ws(' ', code, name))",
    metadata: options.metadata,
    write: {
      codeColumn: 'code',
      nameColumn: 'name',
      statusColumn: options.statusColumn ?? 'status',
      statusMode: options.statusMode ?? 'record',
      ...options,
    },
  });
}

export function nameDescription(
  table: string,
  options: Partial<WriteMapping> & { metadata?: string } = {},
): ResourceSqlMapping {
  return mapping({
    table,
    code: 'code',
    name: 'name',
    description: 'description',
    active:
      options.statusMode === 'agreement'
        ? `status = 'ACTIVE'::"AgreementStatus"`
        : `status = 'ACTIVE'::"RecordStatus"`,
    search: "lower(concat_ws(' ', code, name, description))",
    metadata: options.metadata,
    write: {
      codeColumn: 'code',
      nameColumn: 'name',
      descriptionColumn: 'description',
      statusColumn: options.statusColumn ?? 'status',
      statusMode: options.statusMode ?? 'record',
      ...options,
    },
  });
}

export function descriptionOnly(
  table: string,
  options: Partial<WriteMapping> & { metadata?: string } = {},
): ResourceSqlMapping {
  const active =
    options.statusMode === 'agreement'
      ? `status = 'ACTIVE'::"AgreementStatus"`
      : `status = 'ACTIVE'::"RecordStatus"`;
  return mapping({
    table,
    code: 'code',
    name: 'description',
    description: 'description',
    active,
    search: "lower(concat_ws(' ', code, description))",
    metadata: options.metadata,
    write: {
      codeColumn: 'code',
      descriptionColumn: 'description',
      statusColumn: options.statusColumn ?? 'status',
      statusMode: options.statusMode ?? 'record',
      ...options,
    },
  });
}

export function referenceCatalog(catalogKey: string): ResourceSqlMapping {
  return mapping({
    table: 'hr.reference_catalog_entry',
    code: 'code',
    name: 'name',
    description: 'description',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search: "lower(concat_ws(' ', code, name, description, metadata::text))",
    baseWhere: `catalog_key = '${catalogKey}'`,
    metadata: 'metadata',
    write: {
      codeColumn: 'code',
      nameColumn: 'name',
      descriptionColumn: 'description',
      statusColumn: 'status',
      statusMode: 'record',
      extraInsertColumns: ['catalog_key', 'metadata'],
      extraInsertValues: (input) => [catalogKey, input.metadata ?? {}],
      extraUpdateAssignments: ['metadata'],
      extraUpdateValues: (input) => [input.metadata ?? {}],
    },
  });
}

export function structureReferenceLink(options: {
  ownerColumn: 'job_position_id' | 'job_function_id';
  catalogKey: string;
}): ResourceSqlMapping {
  return mapping({
    table: 'hr.job_structure_reference_link',
    code: 'code',
    name: 'name',
    description: 'description',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search:
      "lower(concat_ws(' ', code, name, description, reference_catalog_key, coalesce(" +
      `${options.ownerColumn}::text, '')` +
      ', reference_entry_id::text))',
    baseWhere: `${options.ownerColumn} IS NOT NULL AND reference_catalog_key = '${options.catalogKey}'`,
    metadata: `jsonb_build_object('ownerId', ${options.ownerColumn}, 'referenceEntryId', reference_entry_id, 'referenceCatalogKey', reference_catalog_key)`,
    write: {
      codeColumn: 'code',
      nameColumn: 'name',
      descriptionColumn: 'description',
      statusColumn: 'status',
      statusMode: 'record',
      extraInsertColumns: [
        options.ownerColumn,
        'reference_catalog_key',
        'reference_entry_id',
      ],
      extraInsertValues: (input) => [
        uuidMetadata(input.metadata, 'ownerId'),
        options.catalogKey,
        uuidMetadata(input.metadata, 'referenceEntryId'),
      ],
      extraUpdateAssignments: [options.ownerColumn, 'reference_entry_id'],
      extraUpdateValues: (input) => [
        uuidMetadata(input.metadata, 'ownerId'),
        uuidMetadata(input.metadata, 'referenceEntryId'),
      ],
    },
  });
}

export function structureEmploymentLink(options: {
  ownerColumn: 'job_position_id' | 'job_function_id';
}): ResourceSqlMapping {
  return mapping({
    table: 'hr.job_structure_employment_link',
    code: 'code',
    name: 'name',
    description: 'description',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search:
      "lower(concat_ws(' ', code, name, description, coalesce(" +
      `${options.ownerColumn}::text, '')` +
      ', employment_link_id::text))',
    baseWhere: `${options.ownerColumn} IS NOT NULL`,
    metadata: `jsonb_build_object('ownerId', ${options.ownerColumn}, 'employmentLinkId', employment_link_id)`,
    write: {
      codeColumn: 'code',
      nameColumn: 'name',
      descriptionColumn: 'description',
      statusColumn: 'status',
      statusMode: 'record',
      extraInsertColumns: [options.ownerColumn, 'employment_link_id'],
      extraInsertValues: (input) => [
        uuidMetadata(input.metadata, 'ownerId'),
        uuidMetadata(input.metadata, 'employmentLinkId'),
      ],
      extraUpdateAssignments: [options.ownerColumn, 'employment_link_id'],
      extraUpdateValues: (input) => [
        uuidMetadata(input.metadata, 'ownerId'),
        uuidMetadata(input.metadata, 'employmentLinkId'),
      ],
    },
  });
}

export function workLocationStructureAssignment(options: {
  structureColumn: 'job_position_id' | 'job_function_id';
}): ResourceSqlMapping {
  return mapping({
    table: 'hr.work_location_structure_assignment',
    code: 'code',
    name: 'name',
    description: 'description',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search:
      "lower(concat_ws(' ', code, name, description, work_location_id::text, coalesce(" +
      `${options.structureColumn}::text, '')` +
      '))',
    baseWhere: `${options.structureColumn} IS NOT NULL`,
    metadata: `jsonb_build_object('workLocationId', work_location_id, 'structureId', ${options.structureColumn})`,
    write: {
      codeColumn: 'code',
      nameColumn: 'name',
      descriptionColumn: 'description',
      statusColumn: 'status',
      statusMode: 'record',
      extraInsertColumns: ['work_location_id', options.structureColumn],
      extraInsertValues: (input) => [
        uuidMetadata(input.metadata, 'workLocationId'),
        uuidMetadata(input.metadata, 'structureId'),
      ],
      extraUpdateAssignments: ['work_location_id', options.structureColumn],
      extraUpdateValues: (input) => [
        uuidMetadata(input.metadata, 'workLocationId'),
        uuidMetadata(input.metadata, 'structureId'),
      ],
    },
  });
}

export function healthProviderAgreementLink(): ResourceSqlMapping {
  return mapping({
    table: 'hr.health_provider_agreement_link',
    code: 'code',
    name: 'name',
    description: 'description',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search:
      "lower(concat_ws(' ', code, name, description, provider_entry_id::text, agreement_id::text))",
    metadata:
      "jsonb_build_object('providerEntryId', provider_entry_id, 'agreementId', agreement_id)",
    write: {
      codeColumn: 'code',
      nameColumn: 'name',
      descriptionColumn: 'description',
      statusColumn: 'status',
      statusMode: 'record',
      extraInsertColumns: ['provider_entry_id', 'agreement_id'],
      extraInsertValues: (input) => [
        uuidMetadata(input.metadata, 'providerEntryId'),
        uuidMetadata(input.metadata, 'agreementId'),
      ],
      extraUpdateAssignments: ['provider_entry_id', 'agreement_id'],
      extraUpdateValues: (input) => [
        uuidMetadata(input.metadata, 'providerEntryId'),
        uuidMetadata(input.metadata, 'agreementId'),
      ],
    },
  });
}

export function healthExamProviderExamLink(): ResourceSqlMapping {
  return mapping({
    table: 'hr.health_exam_provider_exam_link',
    code: 'code',
    name: 'name',
    description: 'description',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search:
      "lower(concat_ws(' ', code, name, description, exam_provider_entry_id::text, exam_entry_id::text))",
    metadata:
      "jsonb_build_object('examProviderEntryId', exam_provider_entry_id, 'examEntryId', exam_entry_id)",
    write: {
      codeColumn: 'code',
      nameColumn: 'name',
      descriptionColumn: 'description',
      statusColumn: 'status',
      statusMode: 'record',
      extraInsertColumns: ['exam_provider_entry_id', 'exam_entry_id'],
      extraInsertValues: (input) => [
        uuidMetadata(input.metadata, 'examProviderEntryId'),
        uuidMetadata(input.metadata, 'examEntryId'),
      ],
      extraUpdateAssignments: ['exam_provider_entry_id', 'exam_entry_id'],
      extraUpdateValues: (input) => [
        uuidMetadata(input.metadata, 'examProviderEntryId'),
        uuidMetadata(input.metadata, 'examEntryId'),
      ],
    },
  });
}

export function jobFunctionEarningMapping(): ResourceSqlMapping {
  return mapping({
    table: 'payroll.job_function_earning',
    code: 'code',
    name: 'name',
    description: 'description',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search:
      "lower(concat_ws(' ', code, name, description, job_function_id::text, earning_deduction_id::text))",
    metadata:
      "jsonb_build_object('jobFunctionId', job_function_id, 'earningDeductionId', earning_deduction_id, 'defaultAmount', default_amount, 'defaultQuantity', default_quantity, 'startsOn', starts_on, 'endsOn', ends_on)",
    write: {
      codeColumn: 'code',
      nameColumn: 'name',
      descriptionColumn: 'description',
      statusColumn: 'status',
      statusMode: 'record',
      extraInsertColumns: [
        'job_function_id',
        'earning_deduction_id',
        'default_amount',
        'default_quantity',
        'starts_on',
        'ends_on',
      ],
      extraInsertValues: (input) => [
        uuidMetadata(input.metadata, 'jobFunctionId'),
        uuidMetadata(input.metadata, 'earningDeductionId'),
        numberMetadata(input.metadata, 'defaultAmount'),
        numberMetadata(input.metadata, 'defaultQuantity'),
        stringMetadata(input.metadata, 'startsOn'),
        stringMetadata(input.metadata, 'endsOn'),
      ],
      extraUpdateAssignments: [
        'job_function_id',
        'earning_deduction_id',
        'default_amount',
        'default_quantity',
        'starts_on',
        'ends_on',
      ],
      extraUpdateValues: (input) => [
        uuidMetadata(input.metadata, 'jobFunctionId'),
        uuidMetadata(input.metadata, 'earningDeductionId'),
        numberMetadata(input.metadata, 'defaultAmount'),
        numberMetadata(input.metadata, 'defaultQuantity'),
        stringMetadata(input.metadata, 'startsOn'),
        stringMetadata(input.metadata, 'endsOn'),
      ],
    },
  });
}

export function salaryRangeLevelMapping(): ResourceSqlMapping {
  return mapping({
    table: 'hr.salary_range_level',
    code: 'code',
    name: 'name',
    description: 'description',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search:
      "lower(concat_ws(' ', code, name, description, salary_range_id::text, salary_reference_id::text, level_number::text))",
    metadata:
      "jsonb_build_object('salaryRangeId', salary_range_id, 'salaryReferenceId', salary_reference_id, 'levelNumber', level_number, 'amountOverride', amount_override)",
    write: {
      codeColumn: 'code',
      nameColumn: 'name',
      descriptionColumn: 'description',
      statusColumn: 'status',
      statusMode: 'record',
      extraInsertColumns: [
        'salary_range_id',
        'salary_reference_id',
        'level_number',
        'amount_override',
      ],
      extraInsertValues: (input) => [
        uuidMetadata(input.metadata, 'salaryRangeId'),
        uuidMetadata(input.metadata, 'salaryReferenceId'),
        numberMetadata(input.metadata, 'levelNumber') ?? 1,
        numberMetadata(input.metadata, 'amountOverride'),
      ],
      extraUpdateAssignments: [
        'salary_range_id',
        'salary_reference_id',
        'level_number',
        'amount_override',
      ],
      extraUpdateValues: (input) => [
        uuidMetadata(input.metadata, 'salaryRangeId'),
        uuidMetadata(input.metadata, 'salaryReferenceId'),
        numberMetadata(input.metadata, 'levelNumber') ?? 1,
        numberMetadata(input.metadata, 'amountOverride'),
      ],
    },
  });
}

export function consignmentEntityMapping(): ResourceSqlMapping {
  return nameDescription('hr.consignment_entity', {
    metadata:
      "jsonb_build_object('bankCode', bank_code, 'contractRef', contract_ref, 'discountKind', discount_kind)",
    extraInsertColumns: ['bank_code', 'contract_ref', 'discount_kind'],
    extraInsertValues: (input) => [
      stringMetadata(input.metadata, 'bankCode'),
      stringMetadata(input.metadata, 'contractRef'),
      stringMetadata(input.metadata, 'discountKind'),
    ],
    extraUpdateAssignments: ['bank_code', 'contract_ref', 'discount_kind'],
    extraUpdateValues: (input) => [
      stringMetadata(input.metadata, 'bankCode'),
      stringMetadata(input.metadata, 'contractRef'),
      stringMetadata(input.metadata, 'discountKind'),
    ],
  });
}

export function taxRateMapping(): ResourceSqlMapping {
  return mapping({
    table: 'public.tax_rate',
    code: 'code',
    name: 'name',
    description: 'description',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search:
      "lower(concat_ws(' ', code, name, description, scope, reference_year::text, rate_percent::text, metadata::text))",
    metadata:
      "jsonb_build_object('scope', scope, 'referenceYear', reference_year, 'ratePercent', rate_percent, 'metadata', metadata)",
    write: {
      codeColumn: 'code',
      nameColumn: 'name',
      descriptionColumn: 'description',
      statusColumn: 'status',
      statusMode: 'record',
      extraInsertColumns: [
        'scope',
        'reference_year',
        'rate_percent',
        'metadata',
      ],
      extraInsertValues: (input) => [
        stringMetadata(input.metadata, 'scope') ?? 'GENERAL',
        numberMetadata(input.metadata, 'referenceYear') ??
          new Date().getFullYear(),
        numberMetadata(input.metadata, 'ratePercent') ?? 0,
        objectMetadata(input.metadata, 'metadata') ?? {},
      ],
      extraUpdateAssignments: [
        'scope',
        'reference_year',
        'rate_percent',
        'metadata',
      ],
      extraUpdateValues: (input) => [
        stringMetadata(input.metadata, 'scope') ?? 'GENERAL',
        numberMetadata(input.metadata, 'referenceYear') ??
          new Date().getFullYear(),
        numberMetadata(input.metadata, 'ratePercent') ?? 0,
        objectMetadata(input.metadata, 'metadata') ?? {},
      ],
    },
  });
}

export function stringMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function booleanMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string,
): boolean | null {
  const value = metadata?.[key];
  return typeof value === 'boolean' ? value : null;
}

export function numberMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string,
): number | null {
  const value = metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function objectMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | null {
  const value = metadata?.[key];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function uuidMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = stringMetadata(metadata, key);
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}
