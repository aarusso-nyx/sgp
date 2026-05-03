import {
  MasterDataColumn,
  MasterDataField,
  MasterDataResource,
} from './master-data.types';

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

export const RESOURCES: MasterDataResource[] = RESOURCE_DEFINITIONS.map(
  (definition) => ({
    ...definition,
    module: 'Gestao',
    status: 'observed',
  }),
);

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
