import {
  booleanMetadata,
  consignmentEntityMapping,
  descriptionOnly,
  healthExamProviderExamLink,
  healthProviderAgreementLink,
  jobFunctionEarningMapping,
  mapping,
  nameDescription,
  nameOnly,
  numberMetadata,
  referenceCatalog,
  salaryRangeLevelMapping,
  stringMetadata,
  structureEmploymentLink,
  structureReferenceLink,
  taxRateMapping,
  workLocationStructureAssignment,
} from './master-data.sql-mapping';
import { ResourceSqlMapping } from './master-data.types';

export const RESOURCE_SQL: Record<string, ResourceSqlMapping> = {
  areaFormacao: referenceCatalog('AREA_FORMACAO'),
  atividade: referenceCatalog('ATIVIDADE'),
  banco: mapping({
    table: 'hr.bank',
    code: 'code',
    name: 'name',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search: "lower(concat_ws(' ', code, name, agency_digit, blocked::text))",
    metadata:
      "jsonb_build_object('agencyDigit', agency_digit, 'blocked', blocked)",
    write: {
      codeColumn: 'code',
      nameColumn: 'name',
      statusColumn: 'status',
      statusMode: 'record',
      extraInsertColumns: ['agency_digit', 'blocked'],
      extraInsertValues: (input) => [
        stringMetadata(input.metadata, 'agencyDigit'),
        booleanMetadata(input.metadata, 'blocked') ?? false,
      ],
      extraUpdateAssignments: ['agency_digit', 'blocked'],
      extraUpdateValues: (input) => [
        stringMetadata(input.metadata, 'agencyDigit'),
        booleanMetadata(input.metadata, 'blocked') ?? false,
      ],
    },
  }),
  categoriaProfissional: referenceCatalog('CATEGORIA_PROFISSIONAL'),
  categoriaEconomica: referenceCatalog('CATEGORIA_ECONOMICA'),
  cbo: referenceCatalog('CBO'),
  cargo: nameDescription('hr.job_position', {
    metadata:
      "jsonb_build_object('vacanciesTotal', vacancies_total, 'vacanciesFilled', vacancies_filled, 'vacanciesOpen', vacancies_open)",
    extraInsertColumns: [
      'vacancies_total',
      'vacancies_filled',
      'vacancies_open',
    ],
    extraInsertValues: (input) => {
      const filled = numberMetadata(input.metadata, 'vacanciesFilled') ?? 0;
      const open = numberMetadata(input.metadata, 'vacanciesOpen') ?? 0;
      return [
        numberMetadata(input.metadata, 'vacanciesTotal') ?? filled + open,
        filled,
        open,
      ];
    },
    extraUpdateAssignments: [
      'vacancies_total',
      'vacancies_filled',
      'vacancies_open',
    ],
    extraUpdateValues: (input) => {
      const filled = numberMetadata(input.metadata, 'vacanciesFilled') ?? 0;
      const open = numberMetadata(input.metadata, 'vacanciesOpen') ?? 0;
      return [
        numberMetadata(input.metadata, 'vacanciesTotal') ?? filled + open,
        filled,
        open,
      ];
    },
  }),
  cargoAtividade: structureReferenceLink({
    ownerColumn: 'job_position_id',
    catalogKey: 'ATIVIDADE',
  }),
  cargoCurso: structureReferenceLink({
    ownerColumn: 'job_position_id',
    catalogKey: 'CURSO',
  }),
  cargoHabilidade: structureReferenceLink({
    ownerColumn: 'job_position_id',
    catalogKey: 'HABILIDADE',
  }),
  cargoVinculo: structureEmploymentLink({
    ownerColumn: 'job_position_id',
  }),
  causaAfastamento: descriptionOnly('hr.absence_reason'),
  centroCusto: nameOnly('hr.cost_center'),
  classeSalarial: referenceCatalog('CLASSE_SALARIAL'),
  classificacaoAto: descriptionOnly('hr.act_classification'),
  classificacaoAgenteNocivo: referenceCatalog('CLASSIFICACAO_AGENTE_NOCIVO'),
  classificacaoInternacionalDoenca: referenceCatalog(
    'CLASSIFICACAO_INTERNACIONAL_DOENCA',
  ),
  cnae: referenceCatalog('CNAE'),
  codigoRecolhimento: referenceCatalog('CODIGO_RECOLHIMENTO'),
  convenio: descriptionOnly('hr.agreement', {
    statusMode: 'agreement',
    statusColumn: 'status',
  }),
  crmCrea: referenceCatalog('CRM_CREA'),
  crmCreaConvenio: healthProviderAgreementLink(),
  curso: referenceCatalog('CURSO'),
  diaUtil: nameDescription('hr.business_day', {
    metadata:
      "jsonb_build_object('businessDate', business_date, 'isBusinessDay', is_business_day)",
    extraInsertColumns: ['business_date', 'is_business_day'],
    extraInsertValues: (input) => [
      stringMetadata(input.metadata, 'businessDate'),
      booleanMetadata(input.metadata, 'isBusinessDay') ?? true,
    ],
    extraUpdateAssignments: ['business_date', 'is_business_day'],
    extraUpdateValues: (input) => [
      stringMetadata(input.metadata, 'businessDate'),
      booleanMetadata(input.metadata, 'isBusinessDay') ?? true,
    ],
  }),
  empresaFilial: mapping({
    table: 'hr.branch',
    code: 'coalesce(acronym, code)',
    name: 'name',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search: "lower(concat_ws(' ', code, acronym, name, branch_type::text))",
    metadata:
      "jsonb_build_object('branchType', branch_type, 'companyId', company_id)",
    writable: false,
  }),
  evento: referenceCatalog('EVENTO'),
  exportacaoArquivo: nameDescription('hr.file_export_job', {
    metadata:
      "jsonb_build_object('format', format, 'targetRoute', target_route)",
    extraInsertColumns: ['format', 'target_route'],
    extraInsertValues: (input) => [
      stringMetadata(input.metadata, 'format') ?? 'CSV',
      stringMetadata(input.metadata, 'targetRoute'),
    ],
    extraUpdateAssignments: ['format', 'target_route'],
    extraUpdateValues: (input) => [
      stringMetadata(input.metadata, 'format') ?? 'CSV',
      stringMetadata(input.metadata, 'targetRoute'),
    ],
  }),
  faixaSalarial: nameOnly('hr.salary_range', {
    metadata:
      "jsonb_build_object('groupCode', group_code, 'classCode', class_code)",
    extraInsertColumns: ['group_code', 'class_code'],
    extraInsertValues: (input) => [
      stringMetadata(input.metadata, 'groupCode'),
      stringMetadata(input.metadata, 'classCode'),
    ],
    extraUpdateAssignments: ['group_code', 'class_code'],
    extraUpdateValues: (input) => [
      stringMetadata(input.metadata, 'groupCode'),
      stringMetadata(input.metadata, 'classCode'),
    ],
  }),
  faixaSalarialNivel: salaryRangeLevelMapping(),
  funcao: nameDescription('hr.job_function'),
  funcaoAtividade: structureReferenceLink({
    ownerColumn: 'job_function_id',
    catalogKey: 'ATIVIDADE',
  }),
  funcaoCurso: structureReferenceLink({
    ownerColumn: 'job_function_id',
    catalogKey: 'CURSO',
  }),
  funcaoHabilidade: structureReferenceLink({
    ownerColumn: 'job_function_id',
    catalogKey: 'HABILIDADE',
  }),
  funcaoRequisito: structureReferenceLink({
    ownerColumn: 'job_function_id',
    catalogKey: 'REQUISITO',
  }),
  funcaoVerba: jobFunctionEarningMapping(),
  funcaoVinculo: structureEmploymentLink({
    ownerColumn: 'job_function_id',
  }),
  grauAcademico: referenceCatalog('GRAU_ACADEMICO'),
  grupoSalarial: referenceCatalog('GRUPO_SALARIAL'),
  habilidade: referenceCatalog('HABILIDADE'),
  importacaoConsignado: nameDescription('hr.consignment_import_job', {
    metadata: "jsonb_build_object('sourceFileName', source_file_name)",
    extraInsertColumns: ['source_file_name'],
    extraInsertValues: (input) => [
      stringMetadata(input.metadata, 'sourceFileName'),
    ],
    extraUpdateAssignments: ['source_file_name'],
    extraUpdateValues: (input) => [
      stringMetadata(input.metadata, 'sourceFileName'),
    ],
  }),
  legislacao: mapping({
    table: 'hr.legislation',
    code: 'code',
    name: "concat(norm_type, ' ', norm_number, '/', norm_year)",
    description: 'detail',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search:
      "lower(concat_ws(' ', code, norm_number, norm_year::text, norm_type, federated_entity, detail))",
    metadata:
      "jsonb_build_object('normNumber', norm_number, 'normYear', norm_year, 'normType', norm_type, 'federatedEntity', federated_entity)",
    write: {
      codeColumn: 'code',
      descriptionColumn: 'detail',
      statusColumn: 'status',
      statusMode: 'record',
      extraInsertColumns: [
        'norm_number',
        'norm_year',
        'norm_type',
        'federated_entity',
      ],
      extraInsertValues: (input) => [
        stringMetadata(input.metadata, 'normNumber') ?? input.code.trim(),
        numberMetadata(input.metadata, 'normYear') ?? new Date().getFullYear(),
        stringMetadata(input.metadata, 'normType') ?? 'NA',
        stringMetadata(input.metadata, 'federatedEntity'),
      ],
      extraUpdateAssignments: [
        'norm_number',
        'norm_year',
        'norm_type',
        'federated_entity',
      ],
      extraUpdateValues: (input) => [
        stringMetadata(input.metadata, 'normNumber') ?? input.code.trim(),
        numberMetadata(input.metadata, 'normYear') ?? new Date().getFullYear(),
        stringMetadata(input.metadata, 'normType') ?? 'NA',
        stringMetadata(input.metadata, 'federatedEntity'),
      ],
    },
  }),
  lotacao: nameDescription('hr.work_location', {
    metadata:
      "jsonb_build_object('parentId', parent_id, 'branchId', branch_id, 'fpasCode', fpas_code, 'fapRate', fap_rate)",
    extraInsertColumns: ['parent_id', 'branch_id', 'fpas_code', 'fap_rate'],
    extraInsertValues: (input) => [
      stringMetadata(input.metadata, 'parentId'),
      stringMetadata(input.metadata, 'branchId'),
      stringMetadata(input.metadata, 'fpasCode') ?? '000',
      numberMetadata(input.metadata, 'fapRate') ?? 0,
    ],
    extraUpdateAssignments: ['parent_id', 'branch_id', 'fpas_code', 'fap_rate'],
    extraUpdateValues: (input) => [
      stringMetadata(input.metadata, 'parentId'),
      stringMetadata(input.metadata, 'branchId'),
      stringMetadata(input.metadata, 'fpasCode') ?? '000',
      numberMetadata(input.metadata, 'fapRate') ?? 0,
    ],
  }),
  lotacaoCargo: workLocationStructureAssignment({
    structureColumn: 'job_position_id',
  }),
  lotacaoFuncao: workLocationStructureAssignment({
    structureColumn: 'job_function_id',
  }),
  modeloDocumento: referenceCatalog('MODELO_DOCUMENTO'),
  motivoAfastamento: descriptionOnly('hr.absence_reason'),
  motivo: descriptionOnly('hr.reason', {
    metadata: "jsonb_build_object('eventKey', event_key, 'kind', kind)",
    extraInsertColumns: ['event_key', 'kind'],
    extraInsertValues: (input) => [
      stringMetadata(input.metadata, 'eventKey'),
      stringMetadata(input.metadata, 'kind'),
    ],
    extraUpdateAssignments: ['event_key', 'kind'],
    extraUpdateValues: (input) => [
      stringMetadata(input.metadata, 'eventKey'),
      stringMetadata(input.metadata, 'kind'),
    ],
  }),
  motivoDesligamento: descriptionOnly('hr.termination_reason'),
  municipio: referenceCatalog('MUNICIPIO'),
  nacionalidade: referenceCatalog('NACIONALIDADE'),
  naturezaFuncao: nameOnly('hr.function_nature'),
  naturezaJuridica: nameOnly('hr.legal_nature', {
    metadata: "jsonb_build_object('groupName', group_name)",
    extraInsertColumns: ['group_name'],
    extraInsertValues: (input) => [stringMetadata(input.metadata, 'groupName')],
    extraUpdateAssignments: ['group_name'],
    extraUpdateValues: (input) => [stringMetadata(input.metadata, 'groupName')],
  }),
  parametroSistema: mapping({
    table: 'public.system_parameter',
    code: 'key',
    name: 'key',
    description: 'description',
    active: 'true',
    search: "lower(concat_ws(' ', key, description, module_key))",
    metadata: "jsonb_build_object('value', value, 'moduleKey', module_key)",
    write: {
      codeColumn: 'key',
      descriptionColumn: 'description',
      statusMode: 'always-active',
      extraInsertColumns: ['value', 'module_key'],
      extraInsertValues: (input) => [
        input.metadata?.value ?? {},
        stringMetadata(input.metadata, 'moduleKey'),
      ],
      extraUpdateAssignments: ['value', 'module_key'],
      extraUpdateValues: (input) => [
        input.metadata?.value ?? {},
        stringMetadata(input.metadata, 'moduleKey'),
      ],
    },
  }),
  perfilAcesso: nameDescription('public.access_profile'),
  referenciaSalarial: descriptionOnly('hr.salary_reference', {
    metadata: "jsonb_build_object('rangeId', range_id, 'amount', amount)",
    extraInsertColumns: ['amount'],
    extraInsertValues: (input) => [
      numberMetadata(input.metadata, 'amount') ?? 0,
    ],
    extraUpdateAssignments: ['amount'],
    extraUpdateValues: (input) => [
      numberMetadata(input.metadata, 'amount') ?? 0,
    ],
  }),
  responsavelLegal: mapping({
    table: 'hr.legal_responsible',
    code: 'coalesce(cpf, id::text)',
    name: 'name',
    description: 'role_title',
    active: `status = 'ACTIVE'::"RecordStatus"`,
    search: "lower(concat_ws(' ', name, cpf, role_title))",
    metadata:
      "jsonb_build_object('branchId', branch_id, 'startsOn', starts_on, 'endsOn', ends_on)",
    writable: false,
  }),
  requisito: referenceCatalog('REQUISITO'),
  categoriaDoenca: referenceCatalog('CATEGORIA_DOENCA'),
  subCategoriaDoenca: referenceCatalog('SUB_CATEGORIA_DOENCA'),
  entidadeExame: referenceCatalog('ENTIDADE_EXAME'),
  entidadeExameExame: healthExamProviderExamLink(),
  equipamentoProtecaoColetiva: referenceCatalog(
    'EQUIPAMENTO_PROTECAO_COLETIVA',
  ),
  equipamentoProtecaoIndividual: referenceCatalog(
    'EQUIPAMENTO_PROTECAO_INDIVIDUAL',
  ),
  exame: referenceCatalog('EXAME'),
  sindicato: descriptionOnly('hr.union_entity', {
    metadata: "jsonb_build_object('cnpj', cnpj)",
    extraInsertColumns: ['cnpj'],
    extraInsertValues: (input) => [stringMetadata(input.metadata, 'cnpj')],
    extraUpdateAssignments: ['cnpj'],
    extraUpdateValues: (input) => [stringMetadata(input.metadata, 'cnpj')],
  }),
  situacaoFuncional: descriptionOnly('hr.functional_status', {
    metadata:
      "jsonb_build_object('modality', modality, 'kind', kind, 'entersPayroll', enters_payroll, 'lifecycleStatus', lifecycle_status)",
    extraInsertColumns: [
      'modality',
      'kind',
      'enters_payroll',
      'lifecycle_status',
    ],
    extraInsertValues: (input) => [
      stringMetadata(input.metadata, 'modality'),
      stringMetadata(input.metadata, 'kind'),
      booleanMetadata(input.metadata, 'entersPayroll') ?? false,
      stringMetadata(input.metadata, 'lifecycleStatus') ?? 'ACTIVE',
    ],
    extraUpdateAssignments: [
      'modality',
      'kind',
      'enters_payroll',
      'lifecycle_status',
    ],
    extraUpdateValues: (input) => [
      stringMetadata(input.metadata, 'modality'),
      stringMetadata(input.metadata, 'kind'),
      booleanMetadata(input.metadata, 'entersPayroll') ?? false,
      stringMetadata(input.metadata, 'lifecycleStatus') ?? 'ACTIVE',
    ],
  }),
  tipoProcessamento: descriptionOnly('payroll.processing_type'),
  tipoContrato: nameOnly('hr.contract_type'),
  tipoDocumento: descriptionOnly('public.document_type'),
  tipoFerias: descriptionOnly('hr.vacation_type'),
  tipoFolha: descriptionOnly('payroll.payroll_type'),
  turno: descriptionOnly('hr.shift', {
    metadata:
      "jsonb_build_object('schedule', schedule, 'dailyHours', daily_hours)",
    extraInsertColumns: ['schedule', 'daily_hours'],
    extraInsertValues: (input) => [
      stringMetadata(input.metadata, 'schedule'),
      numberMetadata(input.metadata, 'dailyHours'),
    ],
    extraUpdateAssignments: ['schedule', 'daily_hours'],
    extraUpdateValues: (input) => [
      stringMetadata(input.metadata, 'schedule'),
      numberMetadata(input.metadata, 'dailyHours'),
    ],
  }),
  unidadeFederativa: referenceCatalog('UNIDADE_FEDERATIVA'),
  usuario: mapping({
    table: 'public.user_account',
    code: 'login',
    name: 'name',
    description: 'coalesce(email, cpf, ' + "'')",
    active: `status = 'ACTIVE'::"UserStatus"`,
    search: "lower(concat_ws(' ', login, name, email, cpf))",
    metadata:
      "jsonb_build_object('email', email, 'cpf', cpf, 'cognitoSub', cognito_sub)",
    writable: false,
  }),
  valeTransporte: descriptionOnly('hr.transit_benefit', {
    metadata: "jsonb_build_object('unitAmount', unit_amount)",
    extraInsertColumns: ['unit_amount'],
    extraInsertValues: (input) => [
      numberMetadata(input.metadata, 'unitAmount') ?? 0,
    ],
    extraUpdateAssignments: ['unit_amount'],
    extraUpdateValues: (input) => [
      numberMetadata(input.metadata, 'unitAmount') ?? 0,
    ],
  }),
  verba: mapping({
    table: 'payroll.payroll_earning_deduction',
    code: 'code',
    name: 'description',
    description: 'description',
    active: 'active',
    search:
      "lower(concat_ws(' ', code, description, kind::text, taxable::text))",
    metadata: "jsonb_build_object('kind', kind, 'taxable', taxable)",
    write: {
      codeColumn: 'code',
      descriptionColumn: 'description',
      statusMode: 'boolean',
      extraInsertColumns: ['kind', 'taxable'],
      extraInsertValues: (input) => [
        stringMetadata(input.metadata, 'kind') ?? 'EARNING',
        booleanMetadata(input.metadata, 'taxable') ?? false,
      ],
      extraUpdateAssignments: ['kind', 'taxable'],
      extraUpdateValues: (input) => [
        stringMetadata(input.metadata, 'kind') ?? 'EARNING',
        booleanMetadata(input.metadata, 'taxable') ?? false,
      ],
    },
  }),
  vinculo: nameOnly('hr.employment_link'),
  consignado: consignmentEntityMapping(),
  aliquota: taxRateMapping(),
};
