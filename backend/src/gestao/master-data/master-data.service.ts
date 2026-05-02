import {
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import { MasterDataMutationDto } from './master-data.dto';

type EvidenceStatus = 'observed' | 'inferred' | 'unverified';
type StatusMode = 'record' | 'agreement' | 'user' | 'boolean' | 'always-active';

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

interface SqlRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CountRow extends QueryResultRow {
  total: string;
}

interface ResourceSqlMapping {
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

interface WriteMapping {
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

const DEFAULT_FIELDS: MasterDataField[] = [
  { key: 'code', label: 'Codigo', type: 'text', required: true, maxLength: 40 },
  { key: 'name', label: 'Nome', type: 'text', required: true, maxLength: 160 },
  {
    key: 'description',
    label: 'Descricao',
    type: 'text',
    required: false,
    maxLength: 500,
  },
  { key: 'active', label: 'Ativo', type: 'boolean', required: false },
];

const DEFAULT_COLUMNS: MasterDataColumn[] = [
  { key: 'code', label: 'Codigo' },
  { key: 'name', label: 'Nome' },
  { key: 'description', label: 'Descricao' },
  { key: 'active', label: 'Ativo' },
];

const RESOURCE_DEFINITIONS: Omit<MasterDataResource, 'module' | 'status'>[] = [
  resource('banco', 'Bancos', '#!/banco/gestao', [
    { key: 'name', label: 'Nome da Agencia' },
    { key: 'code', label: 'Numero' },
    { key: 'agencyDigit', label: 'Digito' },
    { key: 'blocked', label: 'Bloqueado' },
  ]),
  resource('areaFormacao', 'Area de Formacao', '#!/areaFormacao/gestao'),
  resource('atividade', 'Atividade', '#!/atividade/gestao'),
  resource(
    'categoriaProfissional',
    'Categoria Profissional',
    '#!/categoriaProfissional/gestao',
  ),
  resource(
    'categoriaEconomica',
    'Categoria Economica',
    '#!/categoriaEconomica/gestao',
  ),
  resource('cbo', 'CBO', '#!/cbo/gestao'),
  resource('cargo', 'Cargos', '#!/cargo/gestao', [
    { key: 'code', label: 'Codigo' },
    { key: 'name', label: 'Nome' },
    { key: 'description', label: 'Descricao' },
  ]),
  resource('cargoAtividade', 'Cargo x Atividade', '#!/cargoAtividade/gestao'),
  resource('cargoCurso', 'Cargo x Curso', '#!/cargoCurso/gestao'),
  resource(
    'cargoHabilidade',
    'Cargo x Habilidade',
    '#!/cargoHabilidade/gestao',
  ),
  resource('cargoVinculo', 'Cargo x Vinculo', '#!/cargoVinculo/gestao'),
  resource(
    'causaAfastamento',
    'Causas de Afastamento',
    '#!/causaAfastamento/gestao',
  ),
  resource('centroCusto', 'Centro de Custo', '#!/centroCusto/gestao'),
  resource('classeSalarial', 'Classe Salarial', '#!/classeSalarial/gestao'),
  resource(
    'classificacaoAto',
    'Classificacoes dos Atos',
    '#!/classificacaoAto/gestao',
  ),
  resource(
    'classificacaoAgenteNocivo',
    'Classificacao Agente Nocivo',
    '#!/classificacaoAgenteNocivo/gestao',
  ),
  resource(
    'classificacaoInternacionalDoenca',
    'Classificacao Internacional Doenca',
    '#!/classificacaoInternacionalDoenca/gestao',
  ),
  resource('cnae', 'CNAE', '#!/cnae/gestao'),
  resource(
    'codigoRecolhimento',
    'Codigo de Recolhimento',
    '#!/codigoRecolhimento/gestao',
  ),
  resource('convenio', 'Convenios', '#!/convenio/gestao'),
  resource('crmCrea', 'CRM CREA', '#!/crmCrea/gestao'),
  resource(
    'crmCreaConvenio',
    'CRM CREA x Convenio',
    '#!/crmCreaConvenio/gestao',
  ),
  resource('curso', 'Curso', '#!/curso/gestao'),
  resource('diaUtil', 'Dias Uteis', '#!/diaUtil/gestao'),
  resource('empresaFilial', 'Orgaos Publicos', '#!/empresaFilial/gestao', [
    { key: 'code', label: 'Sigla' },
    { key: 'name', label: 'Empresa/Filial' },
    { key: 'branchType', label: 'Tipo de Filial' },
  ]),
  resource('evento', 'Evento', '#!/evento/gestao'),
  resource(
    'exportacaoArquivo',
    'Exportacao de Arquivo',
    '#!/exportacaoArquivo/gestao',
  ),
  resource('faixaSalarial', 'Faixas Salariais', '#!/faixaSalarial/gestao'),
  resource(
    'faixaSalarialNivel',
    'Faixa Salarial x Nivel',
    '#!/faixaSalarialNivel/gestao',
  ),
  resource('funcao', 'Funcao', '#!/funcao/gestao'),
  resource(
    'funcaoAtividade',
    'Funcao x Atividade',
    '#!/funcaoAtividade/gestao',
  ),
  resource('funcaoCurso', 'Funcao x Curso', '#!/funcaoCurso/gestao'),
  resource(
    'funcaoHabilidade',
    'Funcao x Habilidade',
    '#!/funcaoHabilidade/gestao',
  ),
  resource(
    'funcaoRequisito',
    'Funcao x Requisito',
    '#!/funcaoRequisito/gestao',
  ),
  resource('funcaoVerba', 'Funcao x Verba', '#!/funcaoVerba/gestao'),
  resource('funcaoVinculo', 'Funcao x Vinculo', '#!/funcaoVinculo/gestao'),
  resource('grauAcademico', 'Grau Academico', '#!/grauAcademico/gestao'),
  resource('grupoSalarial', 'Grupo Salarial', '#!/grupoSalarial/gestao'),
  resource('habilidade', 'Habilidade', '#!/habilidade/gestao'),
  resource(
    'importacaoConsignado',
    'Importacao Consignado',
    '#!/importacaoConsignado',
  ),
  resource('legislacao', 'Legislacao', '#!/legislacao/gestao'),
  resource('lotacao', 'Lotacao', '#!/lotacao/gestao'),
  resource('lotacaoCargo', 'Lotacao x Cargo', '#!/lotacaoCargo/gestao'),
  resource('lotacaoFuncao', 'Lotacao x Funcao', '#!/lotacaoFuncao/gestao'),
  resource(
    'motivoAfastamento',
    'Motivo Afastamento',
    '#!/motivoAfastamento/gestao',
  ),
  resource('motivo', 'Motivos', '#!/motivo/gestao'),
  resource(
    'motivoDesligamento',
    'Motivos do Desligamento',
    '#!/motivoDesligamento/gestao',
  ),
  resource(
    'modeloDocumento',
    'Modelo de Documento',
    '#!/modeloDocumento/gestao',
  ),
  resource('municipio', 'Municipio', '#!/municipio/gestao'),
  resource('naturezaFuncao', 'Natureza da Funcao', '#!/naturezaFuncao/gestao'),
  resource(
    'naturezaJuridica',
    'Naturezas Juridicas',
    '#!/naturezaJuridica/gestao',
  ),
  resource('nacionalidade', 'Nacionalidade', '#!/nacionalidade/gestao'),
  resource(
    'parametroSistema',
    'Parametro do Sistema',
    '#!/parametroSistema/gestao',
  ),
  resource('perfilAcesso', 'Perfis de Acesso', '#!/perfilAcesso/gestao'),
  resource(
    'referenciaSalarial',
    'Referencia Salarial',
    '#!/referenciaSalarial/gestao',
  ),
  resource(
    'responsavelLegal',
    'Responsavel Legal',
    '#!/responsavelLegal/gestao',
  ),
  resource('requisito', 'Requisito', '#!/requisito/gestao'),
  resource('categoriaDoenca', 'Categoria Doenca', '#!/categoriaDoenca/gestao'),
  resource(
    'subCategoriaDoenca',
    'Subcategoria Doenca',
    '#!/subCategoriaDoenca/gestao',
  ),
  resource('entidadeExame', 'Entidade Exame', '#!/entidadeExame/gestao'),
  resource(
    'entidadeExameExame',
    'Entidade Exame x Exame',
    '#!/entidadeExameExame/gestao',
  ),
  resource(
    'equipamentoProtecaoColetiva',
    'Equipamento Protecao Coletiva',
    '#!/equipamentoProtecaoColetiva/gestao',
  ),
  resource(
    'equipamentoProtecaoIndividual',
    'Equipamento Protecao Individual',
    '#!/equipamentoProtecaoIndividual/gestao',
  ),
  resource('exame', 'Exame', '#!/exame/gestao'),
  resource('sindicato', 'Sindicatos', '#!/sindicato/gestao'),
  resource(
    'situacaoFuncional',
    'Situacao Funcional',
    '#!/situacaoFuncional/gestao',
  ),
  resource(
    'tipoProcessamento',
    'Tipo de Processamento',
    '#!/tipoProcessamento/gestao',
  ),
  resource('tipoContrato', 'Tipos de Contrato', '#!/tipoContrato/gestao'),
  resource('tipoDocumento', 'Tipos de Documento', '#!/tipoDocumento/gestao'),
  resource('tipoFerias', 'Tipos de Ferias', '#!/tipoFerias/gestao'),
  resource('tipoFolha', 'Tipos de Folhas', '#!/tipoFolha/gestao'),
  resource('turno', 'Turno', '#!/turno/gestao'),
  resource(
    'unidadeFederativa',
    'Unidade Federativa',
    '#!/unidadeFederativa/gestao',
  ),
  resource('usuario', 'Usuarios', '#!/usuario/gestao'),
  resource('valeTransporte', 'Vales Transporte', '#!/valeTransporte/gestao'),
  resource('verba', 'Verbas', '#!/verba/gestao'),
  resource('vinculo', 'Vinculos', '#!/vinculo/gestao'),
  resource('consignado', 'Consignado', '#!/consignado/gestao'),
  resource('aliquota', 'Aliquota', '#!/aliquota/gestao'),
];

const RESOURCES: MasterDataResource[] = RESOURCE_DEFINITIONS.map(
  (definition) => ({
    ...definition,
    module: 'Gestao',
    status: 'observed',
  }),
);

const RESOURCE_SQL: Record<string, ResourceSqlMapping> = {
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

@Injectable()
export class MasterDataService {
  constructor(private readonly database: DatabaseService) {}

  listResources(query: DomainListQueryDto): PagedResponse<MasterDataResource> {
    const filtered = this.filter(RESOURCES, query.search);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const total = filtered.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  async listRecords(
    resource: string,
    query: DomainListQueryDto,
  ): Promise<PagedResponse<MasterDataRecord>> {
    this.requireResource(resource);
    this.requireDatabase();
    const mapping = this.requireMapping(resource);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const values: unknown[] = [];
    const where = this.searchWhere(
      mapping.searchExpression,
      query.search,
      values,
      mapping.baseWhere,
    );
    const select = this.selectSql(mapping);

    try {
      const countRows = await this.database.query<CountRow>(
        `SELECT count(*)::text AS total FROM ${mapping.table} ${where}`,
        values,
      );
      const rows = await this.database.query<SqlRow>(
        `${select} ${where} ORDER BY code ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, offset],
      );
      const total = Number(countRows[0]?.total ?? '0');

      return {
        items: rows.map((row) => this.rowToRecord(row)),
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      };
    } catch (error) {
      this.rethrowPostgresAvailability(error, resource);
    }
  }

  async createRecord(
    resource: string,
    input: MasterDataMutationDto,
  ): Promise<MasterDataRecord> {
    this.requireResource(resource);
    this.requireDatabase();
    const mapping = this.requireWritableMapping(resource);
    const write = mapping.write;
    if (!write) throw new NotImplementedException(resource);

    try {
      const row = await this.insertRecord(mapping, write, input);
      return this.rowToRecord(row);
    } catch (error) {
      this.rethrowWriteError(error, resource, input.code);
    }
  }

  async updateRecord(
    resource: string,
    id: string,
    input: MasterDataMutationDto,
  ): Promise<MasterDataRecord> {
    this.requireResource(resource);
    this.requireDatabase();
    const mapping = this.requireWritableMapping(resource);
    const write = mapping.write;
    if (!write) throw new NotImplementedException(resource);

    try {
      const row = await this.updateRecordRow(mapping, write, id, input);
      if (!row) {
        throw new NotFoundException(`Master data record not found: ${id}`);
      }
      return this.rowToRecord(row);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.rethrowWriteError(error, resource, input.code);
    }
  }

  async deactivateRecord(
    resource: string,
    id: string,
  ): Promise<MasterDataRecord> {
    this.requireResource(resource);
    this.requireDatabase();
    const mapping = this.requireWritableMapping(resource);
    const write = mapping.write;
    if (!write) throw new NotImplementedException(resource);
    if (write.statusMode === 'always-active') {
      throw new NotImplementedException(
        `Master-data resource cannot be deactivated because it has no inactive status: ${resource}`,
      );
    }

    try {
      const row = await this.deactivateRecordRow(mapping, write, id);
      if (!row) {
        throw new NotFoundException(`Master data record not found: ${id}`);
      }
      return this.rowToRecord(row);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.rethrowPostgresAvailability(error, resource);
    }
  }

  private requireResource(resource: string): MasterDataResource {
    const found = RESOURCES.find((item) => item.key === resource);
    if (!found) {
      throw new NotFoundException(
        `Master data resource not found: ${resource}`,
      );
    }
    return found;
  }

  private requireMapping(resource: string): ResourceSqlMapping {
    const mapping = RESOURCE_SQL[resource];
    if (!mapping) {
      throw new NotImplementedException(
        `PostgreSQL mapping not implemented for master-data resource: ${resource}`,
      );
    }
    return mapping;
  }

  private requireWritableMapping(resource: string): ResourceSqlMapping {
    const mapping = this.requireMapping(resource);
    if (!mapping.writable) {
      throw new NotImplementedException(
        `Master-data resource requires a dedicated PostgreSQL workflow endpoint: ${resource}`,
      );
    }
    return mapping;
  }

  private requireDatabase(): void {
    if (!this.database.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required; runtime master-data persistence is PostgreSQL-only.',
      );
    }
  }

  private filter<T>(items: T[], search?: string): T[] {
    if (!search) return items;
    const needle = search.toLowerCase();
    return items.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(needle),
    );
  }

  private selectSql(mapping: ResourceSqlMapping): string {
    return `SELECT id::text AS id,
                   ${mapping.codeExpression}::text AS code,
                   ${mapping.nameExpression}::text AS name,
                   ${mapping.descriptionExpression}::text AS description,
                   ${mapping.activeExpression} AS active,
                   ${mapping.metadataExpression ?? `'{}'::jsonb`} AS metadata,
                   created_at,
                   updated_at
            FROM ${mapping.table}`;
  }

  private searchWhere(
    expression: string,
    search: string | undefined,
    values: unknown[],
    baseWhere?: string,
  ): string {
    const clauses: string[] = [];
    if (baseWhere) {
      clauses.push(baseWhere);
    }
    if (!search) {
      return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    }
    values.push(`%${search.toLowerCase()}%`);
    clauses.push(`${expression} LIKE $${values.length}`);
    return `WHERE ${clauses.join(' AND ')}`;
  }

  private async insertRecord(
    mapping: ResourceSqlMapping,
    write: WriteMapping,
    input: MasterDataMutationDto,
  ): Promise<SqlRow> {
    const columns = [write.codeColumn];
    const values: unknown[] = [input.code.trim()];

    if (write.nameColumn) {
      columns.push(write.nameColumn);
      values.push(input.name.trim());
    }
    if (write.descriptionColumn) {
      columns.push(write.descriptionColumn);
      values.push(input.description?.trim() ?? input.name.trim());
    }
    this.addStatusInsert(columns, values, write, input.active ?? true);

    if (write.extraInsertColumns?.length) {
      columns.push(...write.extraInsertColumns);
      values.push(...(write.extraInsertValues?.(input) ?? []));
    }

    const placeholders = columns.map((column, index) => {
      if (column === write.statusColumn)
        return this.statusCast(index + 1, write);
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

    const rows = await this.database.query<SqlRow>(
      `INSERT INTO ${mapping.table} (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING ${this.returningSql(mapping)}`,
      values,
    );
    return rows[0];
  }

  private async updateRecordRow(
    mapping: ResourceSqlMapping,
    write: WriteMapping,
    id: string,
    input: MasterDataMutationDto,
  ): Promise<SqlRow | undefined> {
    const values: unknown[] = [id];
    const assignments: string[] = [];

    this.pushAssignment(
      assignments,
      values,
      write.codeColumn,
      input.code.trim(),
    );
    if (write.nameColumn) {
      this.pushAssignment(
        assignments,
        values,
        write.nameColumn,
        input.name.trim(),
      );
    }
    if (write.descriptionColumn) {
      this.pushAssignment(
        assignments,
        values,
        write.descriptionColumn,
        input.description?.trim() ?? input.name.trim(),
      );
    }
    this.addStatusUpdate(assignments, values, write, input.active ?? true);

    if (write.extraUpdateAssignments?.length) {
      const extraValues = write.extraUpdateValues?.(input) ?? [];
      write.extraUpdateAssignments.forEach((column, index) => {
        this.pushAssignment(
          assignments,
          values,
          column,
          extraValues[index],
          mapping.table,
        );
      });
    }

    const rows = await this.database.query<SqlRow>(
      `UPDATE ${mapping.table}
          SET ${assignments.join(', ')}, updated_at = now()
        WHERE id = $1::uuid${mapping.baseWhere ? ` AND ${mapping.baseWhere}` : ''}
        RETURNING ${this.returningSql(mapping)}`,
      values,
    );
    return rows[0];
  }

  private async deactivateRecordRow(
    mapping: ResourceSqlMapping,
    write: WriteMapping,
    id: string,
  ): Promise<SqlRow | undefined> {
    const statusSet = this.deactivateAssignment(write);
    const rows = await this.database.query<SqlRow>(
      `UPDATE ${mapping.table}
          SET ${statusSet}, updated_at = now()
        WHERE id = $1::uuid${mapping.baseWhere ? ` AND ${mapping.baseWhere}` : ''}
        RETURNING ${this.returningSql(mapping)}`,
      [id],
    );
    return rows[0];
  }

  private returningSql(mapping: ResourceSqlMapping): string {
    return `id::text AS id,
            ${mapping.codeExpression}::text AS code,
            ${mapping.nameExpression}::text AS name,
            ${mapping.descriptionExpression}::text AS description,
            ${mapping.activeExpression} AS active,
            ${mapping.metadataExpression ?? `'{}'::jsonb`} AS metadata,
            created_at,
            updated_at`;
  }

  private addStatusInsert(
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
    values.push(this.statusValue(write.statusMode, active));
  }

  private addStatusUpdate(
    assignments: string[],
    values: unknown[],
    write: WriteMapping,
    active: boolean,
  ): void {
    if (write.statusMode === 'always-active') return;
    if (write.statusMode === 'boolean') {
      this.pushAssignment(assignments, values, 'active', active);
      return;
    }
    if (!write.statusColumn) return;
    values.push(this.statusValue(write.statusMode, active));
    assignments.push(
      `${write.statusColumn} = ${this.statusCast(values.length, write)}`,
    );
  }

  private pushAssignment(
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

  private deactivateAssignment(write: WriteMapping): string {
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

  private statusCast(index: number, write: WriteMapping): string {
    if (write.statusMode === 'agreement') return `$${index}::"AgreementStatus"`;
    if (write.statusMode === 'user') return `$${index}::"UserStatus"`;
    return `$${index}::"RecordStatus"`;
  }

  private statusValue(mode: StatusMode, active: boolean): string {
    if (mode === 'agreement') return active ? 'ACTIVE' : 'TERMINATED';
    if (mode === 'user') return active ? 'ACTIVE' : 'INACTIVE';
    return active ? 'ACTIVE' : 'INACTIVE';
  }

  private rowToRecord(row: SqlRow): MasterDataRecord {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      active: row.active,
      status: 'observed',
      metadata: row.metadata ?? {},
      createdAt: this.iso(row.created_at),
      updatedAt: this.iso(row.updated_at),
    };
  }

  private iso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }

  private rethrowWriteError(
    error: unknown,
    resource: string,
    code: string,
  ): never {
    if (this.isUniqueViolation(error)) {
      throw new ConflictException(`Master data code already exists: ${code}`);
    }
    this.rethrowPostgresAvailability(error, resource);
  }

  private rethrowPostgresAvailability(error: unknown, resource: string): never {
    const code = this.pgErrorCode(error);
    if (['42P01', '42703', '42704'].includes(code ?? '')) {
      throw new ServiceUnavailableException(
        `PostgreSQL schema is not migrated for master-data resource: ${resource}`,
      );
    }
    throw error;
  }

  private isUniqueViolation(error: unknown): boolean {
    return this.pgErrorCode(error) === '23505';
  }

  private pgErrorCode(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    const maybeError = error as { code?: unknown; cause?: unknown };
    if (typeof maybeError.code === 'string') return maybeError.code;
    if (typeof maybeError.cause === 'object' && maybeError.cause !== null) {
      const cause = maybeError.cause as { code?: unknown };
      if (typeof cause.code === 'string') return cause.code;
    }
    return undefined;
  }
}

function resource(
  key: string,
  label: string,
  route: string,
  columns: MasterDataColumn[] = DEFAULT_COLUMNS,
): Omit<MasterDataResource, 'module' | 'status'> {
  return {
    key,
    label,
    route,
    observedActions: ['search', 'clear-filter', 'create', 'edit', 'deactivate'],
    fields: DEFAULT_FIELDS,
    columns,
  };
}

function mapping(input: {
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

function nameOnly(
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

function nameDescription(
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

function descriptionOnly(
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

function referenceCatalog(catalogKey: string): ResourceSqlMapping {
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

function structureReferenceLink(options: {
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

function structureEmploymentLink(options: {
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

function workLocationStructureAssignment(options: {
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

function healthProviderAgreementLink(): ResourceSqlMapping {
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

function healthExamProviderExamLink(): ResourceSqlMapping {
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

function jobFunctionEarningMapping(): ResourceSqlMapping {
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

function salaryRangeLevelMapping(): ResourceSqlMapping {
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

function consignmentEntityMapping(): ResourceSqlMapping {
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

function taxRateMapping(): ResourceSqlMapping {
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

function stringMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function booleanMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string,
): boolean | null {
  const value = metadata?.[key];
  return typeof value === 'boolean' ? value : null;
}

function numberMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string,
): number | null {
  const value = metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function objectMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | null {
  const value = metadata?.[key];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function uuidMetadata(
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
