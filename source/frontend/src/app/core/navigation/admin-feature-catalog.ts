import { permissionsForRoutePath } from './route-permission-map.generated';

export type AdminModuleKey =
  | 'gestao'
  | 'rh'
  | 'folha'
  | 'avaliacao'
  | 'recrutamento'
  | 'consultas'
  | 'relatorios'
  | 'previdenciario'
  | 'auditoria'
  | 'saude'
  | 'convenio';

export type AdminFeatureMode = 'management' | 'form' | 'details' | 'dashboard';

export interface AdminFeature {
  id: string;
  label: string;
  moduleLabel: string;
  moduleKey: AdminModuleKey;
  sectionLabel: string;
  routePath: string;
  childPath: string;
  requiredRole: string;
  requiredPermissions: string[];
  featureFlag: string;
  backendModule: string;
  comment: string;
  mode: AdminFeatureMode;
}

export interface AdminNavigationSection {
  moduleLabel: string;
  moduleKey: AdminModuleKey;
  routePath: string;
  items: AdminFeature[];
}

const RAW_ADMIN_FEATURES = `
Gestão|Parametrizações|Área de Formação|/gestao/area-formacao/gestao|AREA_FORMACAO.GESTAO||gestao|Cadastro mestre
Gestão|Parametrizações|Atividade|/gestao/atividade/gestao|ATIVIDADE.GESTAO||gestao|Cadastro mestre
Gestão|Parametrizações|Banco|/gestao/banco/gestao|BANCO.GESTAO||gestao|Banco e agência
Gestão|Parametrizações|Categoria Profissional|/gestao/categoria-profissional/gestao|CATEGORIA_PROFISSIONAL.GESTAO||gestao|
Gestão|Parametrizações|CBO|/gestao/cbo/gestao|CBO.GESTAO||gestao|Classificação Brasileira de Ocupações
Gestão|Parametrizações|CNAE|/gestao/cnae/gestao|CNAE.GESTAO||gestao|Atividade econômica
Gestão|Parametrizações|Centro de Custo|/gestao/centro-custo/gestao|CENTRO_CUSTO.GESTAO||gestao|
Gestão|Parametrizações|Consignado|/gestao/consignado/gestao|CONSIGNADO.GESTAO||gestao|Entidade de desconto consignado
Gestão|Parametrizações|Conta Contábil|/gestao/conta-contabil/gestao|CONTA_CONTABIL.GESTAO||gestao|Plano de contas simplificado e completo
Gestão|Parametrizações|Convênio (mestre)|/gestao/convenio/gestao|CONVENIO.GESTAO||gestao|Somente cadastro mestre; gestão operacional em 3.11
Gestão|Parametrizações|Curso|/gestao/curso/gestao|CURSO.GESTAO||gestao|Cursos de formação
Gestão|Parametrizações|Grau Acadêmico|/gestao/grau-academico/gestao|GRAU_ACADEMICO.GESTAO||gestao|
Gestão|Parametrizações|Município|/gestao/municipio/gestao|MUNICIPIO.GESTAO||gestao|Tabela IBGE
Gestão|Parametrizações|Nacionalidade / País|/gestao/nacionalidade/gestao|NACIONALIDADE.GESTAO||gestao|
Gestão|Parametrizações|Sindicato|/gestao/sindicato/gestao|SINDICATO.GESTAO||gestao|
Gestão|Parametrizações|Turno|/gestao/turno/gestao|TURNO.GESTAO||gestao|
Gestão|Parametrizações|UF|/gestao/uf/gestao|UF.GESTAO||gestao|Unidades Federativas
Gestão|Parametrizações|Tipo de Documento|/gestao/tipo-documento/gestao|TIPO_DOCUMENTO.GESTAO||gestao|Tipos de documentos pessoais
Gestão|Parametrizações|Modelo de Documento|/gestao/modelo-documento/gestao|MODELO_DOCUMENTO.GESTAO||gestao|Templates para geração de PDF
Gestão|Parametrizações|Parâmetro Sistema|/gestao/parametro-sistema/formulario|PARAMETRO_SISTEMA.GESTAO||parametros|Identidade do tenant; formulário único
Gestão|Parametrizações|Parâmetro Global|/gestao/parametro-global/gestao|PARAMETRO_GLOBAL.GESTAO||parametros|Chaves operacionais (teto, salário mínimo…)
Gestão|Parametrizações|Teto Remuneratório|/gestao/parametros/teto-remuneratorio|TETO_REMUNERATORIO.GESTAO||parametros|Subtetos por cargo/poder e parcelas imunes
Gestão|Parametrizações|ATS e Sexta-Parte|/gestao/parametros/ats|ATS_PARAMETROS.GESTAO||parametros|Percentuais de ATS, triênio, quinquênio e sexta-parte
Gestão|Parametrizações|Feature Flag|/gestao/feature-flag/gestao|FEATURE_FLAG.GESTAO||parametros|Ativação/desativação de funcionalidades
Gestão|Estrutura de Pessoal|Cargo|/gestao/cargo/gestao|CARGO.GESTAO||gestao|
Gestão|Estrutura de Pessoal|Função|/gestao/funcao/gestao|FUNCAO.GESTAO||gestao|Função comissionada ou de confiança
Gestão|Estrutura de Pessoal|Faixa Salarial|/gestao/faixa-salarial/gestao|FAIXA_SALARIAL.GESTAO||gestao|
Gestão|Estrutura de Pessoal|Referência Salarial|/gestao/referencia-salarial/gestao|REFERENCIA_SALARIAL.GESTAO||gestao|
Gestão|Estrutura de Pessoal|Lotação|/gestao/lotacao/gestao|LOTACAO.GESTAO||gestao|Unidade administrativa
Gestão|Estrutura de Pessoal|Empresa Filial|/gestao/empresa-filial/gestao|EMPRESA_FILIAL.GESTAO||gestao|Filial do tenant
Gestão|Estrutura de Pessoal|Nível Salarial|/gestao/nivel-salarial/gestao|NIVEL_SALARIAL.GESTAO||gestao|
Gestão|Estrutura de Pessoal|Grupo Salarial|/gestao/grupo-salarial/gestao|GRUPO_SALARIAL.GESTAO||gestao|
Gestão|Estrutura de Pessoal|Vínculo|/gestao/vinculo/gestao|VINCULO.GESTAO||gestao|Tipos de vínculo (efetivo, comissionado…)
Gestão|Estrutura de Pessoal|Tipo de Contrato|/gestao/tipo-contrato/gestao|TIPO_CONTRATO.GESTAO||gestao|
Gestão|Estrutura de Pessoal|Tipo de Folha|/gestao/tipo-folha/gestao|TIPO_FOLHA.GESTAO||gestao|
Gestão|Estrutura de Pessoal|Tipo de Processamento|/gestao/tipo-processamento/gestao|TIPO_PROCESSAMENTO.GESTAO||gestao|MENSAL, 13º, FÉRIAS…
Gestão|Estrutura de Pessoal|Verba / Rubrica|/gestao/verba/gestao|VERBA.GESTAO||folha|Cadastro de verbas e fórmulas DSL
Gestão|Estrutura de Pessoal|Evento|/gestao/evento/gestao|EVENTO.GESTAO||gestao|Eventos de eSocial
Gestão|Estrutura de Pessoal|Requisito|/gestao/requisito/gestao|REQUISITO.GESTAO||gestao|Requisitos de cargos/funções
Gestão|Legais|Classificação de Atos|/gestao/classificacao-ato/gestao|CLASSIFICACAO_ATO.GESTAO||gestao|
Gestão|Legais|Legislação / Motivo|/gestao/motivo/gestao|MOTIVO.GESTAO||gestao|Motivos gerais
Gestão|Legais|Tipo de Desligamento|/gestao/tipo-desligamento/gestao|TIPO_DESLIGAMENTO.GESTAO||gestao|
Gestão|Legais|Causa de Afastamento|/gestao/causa-afastamento/gestao|CAUSA_AFASTAMENTO.GESTAO||gestao|
Gestão|Legais|Motivo de Afastamento|/gestao/motivo-afastamento/gestao|MOTIVO_AFASTAMENTO.GESTAO||gestao|
Gestão|Legais|Tipo de Averbação|/gestao/tipo-averbacao/gestao|TIPO_AVERBACAO.GESTAO||gestao|
Gestão|Legais|Tipo de Aposentadoria|/gestao/tipo-aposentadoria/gestao|TIPO_APOSENTADORIA.GESTAO||gestao|
Módulo RH|Cadastro Funcional|Servidor (Funcionário) — lista|/rh/servidor/gestao|FUNCIONARIO.VISUALIZAR||rh|Usa termo_funcionario como label
Módulo RH|Cadastro Funcional|Servidor — novo|/rh/servidor/formulario|FUNCIONARIO.CADASTRAR||rh|CPF obrigatório; validação de unicidade
Módulo RH|Cadastro Funcional|Servidor — editar|/rh/servidor/formulario/:id|FUNCIONARIO.ATUALIZAR||rh|
Módulo RH|Cadastro Funcional|Servidor — detalhes|/rh/servidor/detalhes/:id|FUNCIONARIO.VISUALIZAR||rh|
Módulo RH|Cadastro Funcional|Dado Complementar|/rh/dado-complementar/gestao|DADO_COMPLEMENTAR.GESTAO||rh|Campos adicionais por tenant
Módulo RH|Cadastro Funcional|Dependente|/rh/dependente/gestao|DEPENDENTE.GESTAO||rh|IR, Salário-Família, Pensão, Saúde
Módulo RH|Cadastro Funcional|Dependente Benefício|/rh/dependente-beneficio/gestao|DEPENDENTE_BENEFICIO.GESTAO||rh|Dependentes de plano de saúde/convênio
Módulo RH|Cadastro Funcional|Tempo de Serviço|/rh/tempo-servico/gestao|TEMPO_SERVICO.GESTAO||rh|Averbação de tempo anterior
Módulo RH|Cadastro Funcional|Experiência Profissional|/rh/experiencia-profissional/gestao|EXPERIENCIA_PROFISSIONAL.GESTAO||rh|
Módulo RH|Cadastro Funcional|Dossiê / Observação Documental|/rh/dossie/gestao|DOSSIE.GESTAO||rh|Documentos e observações por servidor
Módulo RH|Cadastro Funcional|Documento de Amparo|/rh/documento-amparo/gestao|DOCUMENTO_AMPARO.GESTAO||rh|Obrigatório em cedência
Módulo RH|Vida Funcional|Posse — Efetivo|/rh/posse-efetivo/gestao|POSSE_EFETIVO.GESTAO||rh|Ingresso efetivo; gera termo de posse PDF
Módulo RH|Vida Funcional|Posse — Efetivo (formulário)|/rh/posse-efetivo/formulario/:id|POSSE_EFETIVO.GESTAO||rh|
Módulo RH|Vida Funcional|Posse — Comissionado|/rh/posse-comissionado/gestao|POSSE_COMISSIONADO.GESTAO||rh|
Módulo RH|Vida Funcional|Posse — Comissionado (formulário)|/rh/posse-comissionado/formulario/:id|POSSE_COMISSIONADO.GESTAO||rh|
Módulo RH|Vida Funcional|Posse — Contratado|/rh/posse-contratado/gestao|POSSE_CONTRATADO.GESTAO||rh|
Módulo RH|Vida Funcional|Posse — Contratado (formulário)|/rh/posse-contratado/formulario/:id|POSSE_CONTRATADO.GESTAO||rh|
Módulo RH|Vida Funcional|Histórico de Situação|/rh/historico-situacao/gestao|HISTORICO_SITUACAO_FUNCIONAL.GESTAO||rh|
Módulo RH|Vida Funcional|Afastamento|/rh/afastamento/gestao|AFASTAMENTO.GESTAO||rh|Valida limite anual por motivo
Módulo RH|Vida Funcional|Transferência|/rh/transferencia/gestao|TRANSFERENCIA.GESTAO||rh|Com ou sem ônus; designada
Módulo RH|Vida Funcional|Exoneração / Desligamento|/rh/desligamento/gestao|DESLIGAMENTO.GESTAO||rh|
Módulo RH|Vida Funcional|Rescisão de Contrato|/rh/rescisao/gestao|RESCISAO.GESTAO||rh|Contratados CLT/temporários
Módulo RH|Vida Funcional|Falta|/rh/falta/gestao|FALTA.GESTAO||rh|
Módulo RH|Vida Funcional|Frequência|/rh/frequencia/gestao|FREQUENCIA.GESTAO||rh|Registro de frequência
Módulo RH|Vida Funcional|Programação de Férias|/rh/ferias-programacao/gestao|FERIAS.GESTAO||rh|Agendamento de férias
Módulo RH|Vida Funcional|Licença-Prêmio|/rh/licenca-premio/gestao|LICENCA_PREMIO.GESTAO||rh|
Módulo RH|Vida Funcional|Progressão Salarial|/rh/nivel-salarial-historico/gestao|PROGRESSAO_SALARIAL.GESTAO||rh|Histórico de nível/referência
Módulo RH|Correlatos|Pensão Alimentícia|/rh/pensao-alimenticia/gestao|PENSAO_ALIMENTICIA.GESTAO||rh|
Módulo RH|Correlatos|Contribuição Sindical|/rh/contribuicao-sindical/gestao|CONTRIBUICAO_SINDICAL.GESTAO||rh|
Módulo RH|Correlatos|Decisão Judicial|/rh/decisao-judicial/gestao|DECISAO_JUDICIAL.GESTAO||rh|
Módulo RH|Correlatos|Categoria Profissional (vínculo)|/rh/categoria-profissional-vinculo/gestao|CATEGORIA_PROFISSIONAL.GESTAO||rh|Associação servidor × categoria
Módulo RH|Correlatos|Processo|/rh/processo/gestao|PROCESSO.GESTAO||rh|Processos administrativos
Módulo RH|Correlatos|Processo-Função|/rh/processo-funcao/gestao|PROCESSO_FUNCAO.GESTAO||rh|Relação processo × função
Folha de Pgt|Centrais|Competência|/folha/competencia/gestao|FOLHA_DE_PGT.GESTAO||folha|Abertura, programação e fechamento
Folha de Pgt|Centrais|Folha de Pagamento|/folha/folha-pagamento/gestao|FOLHA_DE_PGT.GESTAO||folha|Por filial × tipo_processamento
Folha de Pgt|Centrais|Contracheque — lista|/folha/contracheque/gestao|FOLHA_DE_PGT.GESTAO||folha|Listagem por competência
Folha de Pgt|Centrais|Contracheque — detalhes|/folha/contracheque/detalhes/:id|FOLHA_DE_PGT.GESTAO||folha|Download PDF; marca d'água configurável
Folha de Pgt|Verbas e Lançamentos|Verbas (cadastro)|/folha/verba/gestao|VERBA.GESTAO||folha|Fórmulas DSL; compilação SQL
Folha de Pgt|Verbas e Lançamentos|Verbas por Servidor|/folha/verbas-servidor/gestao|VERBA_FUNCIONARIO.GESTAO||folha|funcionario_verba
Folha de Pgt|Verbas e Lançamentos|Verbas por Pensionista|/folha/verbas-pensionista/gestao|VERBA_PENSIONISTA.GESTAO||folha|
Folha de Pgt|Verbas e Lançamentos|Lançamento Manual|/folha/lancamento-manual/gestao|LANCAMENTO_MANUAL.GESTAO||folha|
Folha de Pgt|Verbas e Lançamentos|Importador Verbas Servidor|/folha/importacao-verbas-servidor/gestao|IMPORTACAO_VERBAS.GESTAO||folha|Arquivo CSV/XLSX; substitutivo
Folha de Pgt|Verbas e Lançamentos|Importador Verbas Pensionista|/folha/importacao-verbas-pensionista/gestao|IMPORTACAO_VERBAS.GESTAO||folha|
Folha de Pgt|Verbas e Lançamentos|Importação Consignado|/folha/importacao-consignado/gestao|IMPORTACAO_CONSIGNADO.GESTAO||folha|Leiaute Neoconsig
Folha de Pgt|Fechamentos e Obrigações|DIRF|/folha/dirf/gestao|DIRF.GESTAO||folha|Geração arquivo TXT RFB
Folha de Pgt|Fechamentos e Obrigações|SEFIP|/folha/sefip/gestao|SEFIP.GESTAO||folha|
Folha de Pgt|Fechamentos e Obrigações|Remessa Bancária|/folha/remessa-bancaria/gestao|ARQUIVO_REMESSA.GESTAO||folha|CNAB 240/400 por banco
Folha de Pgt|Fechamentos e Obrigações|Retorno Bancário|/folha/retorno-bancario/gestao|ARQUIVO_REMESSA.GESTAO||folha|
Folha de Pgt|Fechamentos e Obrigações|Batimento de Folha|/folha/batimento/gestao|RELATORIO_BATIMENTO_FOLHA.GESTAO||folha|Conferência de totais
Folha de Pgt|Fechamentos e Obrigações|eSocial|/folha/esocial/gestao|ESOCIAL.GESTAO|esocial.enabled|folha|Leiaute S-1.2; oculto se flag false
Folha de Pgt|Relatórios de Folha|Relatório de Folha|/folha/relatorio-folha/gestao|RELATORIO_FOLHA_PAGAMENTO.GESTAO||folha|PDF/XLSX
Folha de Pgt|Relatórios de Folha|Relatório Financeiro|/folha/relatorio-financeiro/gestao|RELATORIO_FOLHA_PAGAMENTO.GESTAO||folha|Persiste relatorio_financeiro
Folha de Pgt|Relatórios de Folha|Proventos e Descontos|/folha/relatorio-proventos-descontos/gestao|RELATORIO_PROVENTOS_DESCONTOS.GESTAO||folha|
Folha de Pgt|Relatórios de Folha|Repasse Fundo RH|/folha/relatorio-repasse-fundo/gestao|RELATORIO_REPASSE_FUNDO_RH.GESTAO||folha|
Folha de Pgt|Relatórios de Folha|Relatório de Verbas|/folha/relatorio-verbas/gestao|RELATORIO_VERBAS.GESTAO||folha|
Folha de Pgt|Relatórios de Folha|Resumo de Folha|/folha/resumo/gestao|RELATORIO_FOLHA_PAGAMENTO.GESTAO||folha|XLSX consolidado
Módulo Avaliação||Avaliação de Desempenho|/avaliacao/avaliacao-desempenho/gestao|AVALIACAO_DESEMPENHO.GESTAO||avaliacao|Ciclos, critérios, notas
Módulo Avaliação||Progressão por Mérito|/avaliacao/progressao-merito/gestao|PROGRESSAO_MERITO.GESTAO||avaliacao|
Módulo Avaliação||Progressão por Titularidade|/avaliacao/progressao-titularidade/gestao|PROGRESSAO_TITULARIDADE.GESTAO||avaliacao|
Módulo Avaliação||Progressão Judicial|/avaliacao/progressao-judicial/gestao|PROGRESSAO_JUDICIAL.GESTAO||avaliacao|Decisão judicial forçando progressão
Módulo Avaliação||Correção Salarial|/avaliacao/correcao-salarial/gestao|CORRECAO_SALARIAL.GESTAO||avaliacao|Reajustes coletivos
Módulo Avaliação||Plano de Cargos e Carreira|/avaliacao/plano-cargos-carreira/gestao|PLANO_CARGOS_CARREIRA.GESTAO||avaliacao|Versões e vigência
Módulo Avaliação||Simulador de Nível Salarial|/avaliacao/simulador-nivel/gestao|SIMULADOR_NIVEL_SALARIAL.GESTAO||avaliacao|Cenário hipotético; não persiste alteração
Recrutamento e Seleção|Demanda|Requisição de Pessoal|/recrutamento/requisicao-pessoal/gestao|REQUISICAO_DE_PESSOAL.GESTAO||recrutamento|Abertura e tramitação (RASCUNHO → EM_PROCESSO)
Recrutamento e Seleção|Demanda|Requisição — nova|/recrutamento/requisicao-pessoal/formulario|REQUISICAO_DE_PESSOAL.CADASTRAR||recrutamento|Substitui colaborador ou aumento de quadro
Recrutamento e Seleção|Demanda|Requisição — editar|/recrutamento/requisicao-pessoal/formulario/:id|REQUISICAO_DE_PESSOAL.ATUALIZAR||recrutamento|Só enquanto RASCUNHO
Recrutamento e Seleção|Demanda|Gestão de Requisições|/recrutamento/gestao-requisicoes/gestao|REQUISICAO_DE_PESSOAL.GESTAO||recrutamento|Painel RH: APROVADO, REJEITADO, CONCLUIDO
Recrutamento e Seleção|Captação|Banco de Talentos|/recrutamento/banco-talentos/gestao|BANCO_TALENTOS.GESTAO||recrutamento|Cadastros externos e internos
Recrutamento e Seleção|Captação|Cadastro de Currículo|/recrutamento/curriculo/formulario|BANCO_TALENTOS.CADASTRAR||recrutamento|Upload S3
Recrutamento e Seleção|Captação|Currículo — editar|/recrutamento/curriculo/formulario/:id|BANCO_TALENTOS.ATUALIZAR||recrutamento|
Recrutamento e Seleção|Captação|Análise Curricular|/recrutamento/analise-curricular/gestao|REQUISICAO_DE_PESSOAL.GESTAO||recrutamento|Candidatos por requisição
Recrutamento e Seleção|Estágio|Estagiário|/recrutamento/estagiario/gestao|ESTAGIARIO.GESTAO||recrutamento|Lifecycle: ativo / encerrado
Recrutamento e Seleção|Estágio|Estagiário — novo|/recrutamento/estagiario/formulario|ESTAGIARIO.CADASTRAR||recrutamento|Vincula programa e instituição
Recrutamento e Seleção|Estágio|Estagiário — editar|/recrutamento/estagiario/formulario/:id|ESTAGIARIO.ATUALIZAR||recrutamento|
Recrutamento e Seleção|Estágio|Programa de Estágio|/recrutamento/programa-estagio/gestao|PROGRAMA_ESTAGIO.GESTAO||recrutamento|Vigência, bolsa, carga horária
Recrutamento e Seleção|Estágio|Prorrogação de Estágio|/recrutamento/prorrogacao-estagio/gestao|PRORROGACAO_ESTAGIO.GESTAO||recrutamento|
Recrutamento e Seleção|Estágio|Recesso de Estágio|/recrutamento/recesso-estagio/gestao|RECESSO_ESTAGIO.GESTAO||recrutamento|Gera relatório próprio
Consultas Gerenciais||Ficha Financeira|/consultas/ficha-financeira/gestao|FOLHA_DE_PGT.GESTAO||consultas|Histórico mensal por servidor
Consultas Gerenciais||Ficha Funcional|/consultas/ficha-funcional/detalhes/:id|FUNCIONARIO.VISUALIZAR||consultas|View materializada ficha_funcional
Consultas Gerenciais||Relatórios por Situação|/consultas/relatorio-situacao/gestao|RELATORIO_GERENCIAL.GESTAO||consultas|Filtragem por situação funcional
Consultas Gerenciais||Servidor com Pagamento Bloqueado|/consultas/pagamento-bloqueado/gestao|RELATORIO_SERV_PAG_BLOQUEADO.GESTAO||consultas|Folha BLOQUEADO ou situação SUSTADO
Consultas Gerenciais||Histórico Operacional|/consultas/historico-operacional/gestao|FUNCIONARIO.VISUALIZAR||consultas|Timeline de eventos do servidor
Consultas Gerenciais||Dashboard Geral|/consultas/dashboard|RELATORIO_GERENCIAL.GESTAO||consultas|KPIs: efetivos, afastados, folha, etc.
Relatório||Relatório Gerencial|/relatorios/gerencial/gestao|RELATORIO_GERENCIAL.GESTAO||relatorios|PDF/XLSX por período
Relatório||Relatório de Folha|/relatorios/folha/gestao|RELATORIO_FOLHA_PAGAMENTO.GESTAO||relatorios|
Relatório||Relatório Financeiro|/relatorios/financeiro/gestao|RELATORIO_FOLHA_PAGAMENTO.GESTAO||relatorios|
Relatório||Aposentados e Pensionistas|/relatorios/aposentados-pensionistas/gestao|RELATORIO_APOSENTADO_PENSAO.GESTAO||relatorios|
Relatório||Repasse Fundo RH|/relatorios/repasse-fundo/gestao|RELATORIO_REPASSE_FUNDO_RH.GESTAO||relatorios|
Relatório||Proventos e Descontos|/relatorios/proventos-descontos/gestao|RELATORIO_PROVENTOS_DESCONTOS.GESTAO||relatorios|
Relatório||Relatório de Verbas|/relatorios/verbas/gestao|RELATORIO_VERBAS.GESTAO||relatorios|
Relatório||Relatório de Estágio|/relatorios/estagio/gestao|RELATORIO_ESTAGIO.GESTAO||relatorios|PDF/XLSX com limite de registros
Relatório||Recrutamento e Seleção|/relatorios/recrutamento/gestao|RELATORIO_GERENCIAL.GESTAO||relatorios|Relatório gerencial R&S
Módulo Previdenciário|Concessão|Regra de Aposentadoria|/previdenciario/regra-aposentadoria/gestao|REGRA_APOSENTADORIA.GESTAO||previdenciario|Critérios legais por regime
Módulo Previdenciário|Concessão|Regra — nova|/previdenciario/regra-aposentadoria/formulario|REGRA_APOSENTADORIA.CADASTRAR||previdenciario|
Módulo Previdenciário|Concessão|Regra — editar|/previdenciario/regra-aposentadoria/formulario/:id|REGRA_APOSENTADORIA.ATUALIZAR||previdenciario|
Módulo Previdenciário|Concessão|Simulador de Aposentadoria|/previdenciario/simulador-aposentadoria/gestao|REGRA_APOSENTADORIA.VISUALIZAR||previdenciario|Não persiste resultado como ato
Módulo Previdenciário|Concessão|Pensão|/previdenciario/pensao/gestao|PENSAO.GESTAO||previdenciario|Beneficiários, rateio, reajuste
Módulo Previdenciário|Concessão|Compensação Previdenciária|/previdenciario/compensacao/gestao|COMPENSACAO_PREVIDENCIARIA.GESTAO||previdenciario|Certidão + regime origem
Módulo Previdenciário|Concessão|Certidão de Tempo de Contribuição|/previdenciario/certidao-tempo/gestao|CERTIDAO_TEMPO_CONTRIBUICAO.GESTAO||previdenciario|PDF gerado via S3
Módulo Previdenciário|Documentais|Declaração de Aposentado|/previdenciario/declaracao-aposentado/gestao|RECADASTRAMENTO.GESTAO||previdenciario|PDF emitido por campanha ou avulso
Módulo Previdenciário|Documentais|Declaração de Ex-Servidor|/previdenciario/declaracao-ex-servidor/gestao|RECADASTRAMENTO.GESTAO||previdenciario|
Módulo Previdenciário|Documentais|Certidão de Compensação|/previdenciario/certidao-compensacao/gestao|COMPENSACAO_PREVIDENCIARIA.GESTAO||previdenciario|
Módulo Previdenciário|Operacionais|Prova de Vida / Recadastramento|/previdenciario/recadastramento/gestao|RECADASTRAMENTO.GESTAO|PROVA_VIDA_PUBLIC_API_ENABLED|previdenciario|Carteira; campanha; histórico ligação
Módulo Previdenciário|Operacionais|Recadastramento — atendimento|/previdenciario/recadastramento/formulario/:id|RECADASTRAMENTO.GESTAO||previdenciario|Emite comprovante se RECADASTRADO
Módulo Previdenciário|Operacionais|Transferência Previdenciária|/previdenciario/transferencia-previdenciaria/gestao|ARQUIVO_EXPORTACAO_SIPREV.GESTAO||previdenciario|Exportação SIPREV XML
Módulo Previdenciário|Operacionais|Relatórios Previdenciários|/previdenciario/relatorios/gestao|RELATORIO_APOSENTADO_PENSAO.GESTAO||previdenciario|Carteira, concessões, pensões
Auditoria||Consulta de Trilha|/auditoria/trilha/gestao|AUDITORIA.GESTAO|AUDIT_FULL_TRACE_ENABLED|auditoria|Tabela audit_log; filtros combinados
Auditoria||Detalhe de Evento|/auditoria/trilha/detalhes/:id|AUDITORIA.GESTAO||auditoria|Diff JSONB renderizado
Auditoria||Relatório de Auditoria|/auditoria/relatorio/gestao|AUDITORIA.GESTAO||auditoria|PDF/XLSX por período
Auditoria||Filtros por Entidade|/auditoria/entidade/gestao|AUDITORIA.GESTAO||auditoria|Pesquisa por domínio e entidade_id
Auditoria||Filtros por Usuário|/auditoria/usuario/gestao|AUDITORIA.GESTAO||auditoria|
Auditoria||Filtros por Período|/auditoria/periodo/gestao|AUDITORIA.GESTAO||auditoria|Particionamento por ano/mês
Área de Saúde / Junta Médica|Agenda|Configurar Agenda Médica|/saude/agenda-medica/formulario|AGENDA_MEDICA.GESTAO||saude|Médico × especialidade × janelas
Área de Saúde / Junta Médica|Agenda|Configurar — editar|/saude/agenda-medica/formulario/:id|AGENDA_MEDICA.GESTAO||saude|
Área de Saúde / Junta Médica|Agenda|Painel de Agenda|/saude/agenda-medica/gestao|AGENDA_MEDICA.GESTAO||saude|Calendário semanal/mensal; status janelas
Área de Saúde / Junta Médica|Perícia|Atendimento Agendado|/saude/pericia/agendados/gestao|PERICIA_MEDICA.GESTAO||saude|Servidor deve estar ATIVO/EM_EXERCICIO
Área de Saúde / Junta Médica|Perícia|Atendimento Pendente|/saude/pericia/pendentes/gestao|PERICIA_MEDICA.GESTAO||saude|Status PENDENTE ou NAO_COMPARECEU
Área de Saúde / Junta Médica|Perícia|Prontuário|/saude/pericia/prontuario/formulario/:id|PERICIA_MEDICA.GESTAO||saude|CID, ação pericial, tipo laudo
Área de Saúde / Junta Médica|Perícia|Validação de Laudo|/saude/pericia/validacao-laudo/gestao|PERICIA_MEDICA.GESTAO||saude|PENDENTE_VALIDACAO → APROVADO/REPROVADO
Área de Saúde / Junta Médica|Perícia|Licença Médica|/saude/licenca-medica/gestao|LICENCA_MEDICA.GESTAO||saude|Máx. 720 dias acumulados
Área de Saúde / Junta Médica|Perícia|Licença — formulário|/saude/licenca-medica/formulario/:id|LICENCA_MEDICA.GESTAO||saude|Equipe, CID, restrições, readaptação
Área de Saúde / Junta Médica|Suporte Clínico|Médico|/saude/medico/gestao|MEDICO.GESTAO||saude|CRM, UF, especialidades, vínculos
Área de Saúde / Junta Médica|Suporte Clínico|Especialidade Médica|/saude/especialidade-medica/gestao|ESPECIALIDADE_MEDICA.GESTAO||saude|
Área de Saúde / Junta Médica|Suporte Clínico|Exame Ocupacional|/saude/exame/gestao|EXAME.GESTAO||saude|
Área de Saúde / Junta Médica|Suporte Clínico|Entidade de Exames|/saude/entidade-exame/gestao|ENTIDADE_EXAME.GESTAO||saude|Laboratórios / clínicas credenciadas
Área de Saúde / Junta Médica|Suporte Clínico|Profissional de Saúde|/saude/profissional-saude/gestao|PROFISSIONAL_SAUDE.GESTAO||saude|Outros profissionais da equipe pericial
Área de Saúde / Junta Médica|SST|Acidente de Trabalho|/saude/acidente-trabalho/gestao|ACIDENTE_TRABALHO.GESTAO||saude|CAT; CID; dias afastamento
Área de Saúde / Junta Médica|SST|CID|/saude/cid/gestao|CID.GESTAO||saude|Tabela CID-10
Área de Saúde / Junta Médica|SST|Categoria de Doenças|/saude/categoria-doenca/gestao|CATEGORIA_DOENCA.GESTAO||saude|
Área de Saúde / Junta Médica|SST|Subcategoria de Doenças|/saude/subcategoria-doenca/gestao|SUBCATEGORIA_DOENCA.GESTAO||saude|
Área de Saúde / Junta Médica|SST|Agente Nocivo|/saude/agente-nocivo/gestao|AGENTE_NOCIVO.GESTAO||saude|Classificação legal
Área de Saúde / Junta Médica|SST|EPI|/saude/epi/gestao|EPI.GESTAO||saude|Equipamento de Proteção Individual
Área de Saúde / Junta Médica|SST|EPC|/saude/epc/gestao|EPC.GESTAO||saude|Equipamento de Proteção Coletiva
Convênio||Convênios|/convenio/convenio/gestao|CONVENIO.GESTAO||convenio|Vigência, banco de cobrança
Convênio||Convênio — novo|/convenio/convenio/formulario|CONVENIO.CADASTRAR||convenio|
Convênio||Convênio — editar|/convenio/convenio/formulario/:id|CONVENIO.ATUALIZAR||convenio|
Convênio||Beneficiários|/convenio/beneficiario/gestao|CONVENIO_BENEFICIARIO.GESTAO||convenio|Valor mensal, início, fim
Convênio||Descontos em Folha|/convenio/desconto-folha/gestao|CONVENIO_DESCONTO_FOLHA.GESTAO||convenio|Por competência; lançado na folha
`;

export const ADMIN_MODULES: ReadonlyArray<{
  key: AdminModuleKey;
  label: string;
  routePath: string;
}> = [
  { key: 'gestao', label: 'Gestão', routePath: '/gestao' },
  { key: 'rh', label: 'Módulo RH', routePath: '/rh' },
  { key: 'folha', label: 'Folha de Pgt', routePath: '/folha' },
  { key: 'avaliacao', label: 'Módulo Avaliação', routePath: '/avaliacao' },
  { key: 'recrutamento', label: 'Recrutamento e Seleção', routePath: '/recrutamento' },
  { key: 'consultas', label: 'Consultas Gerenciais', routePath: '/consultas' },
  { key: 'relatorios', label: 'Relatório', routePath: '/relatorios' },
  { key: 'previdenciario', label: 'Módulo Previdenciário', routePath: '/previdenciario' },
  { key: 'auditoria', label: 'Auditoria', routePath: '/auditoria' },
  { key: 'saude', label: 'Área de Saúde', routePath: '/saude' },
  { key: 'convenio', label: 'Convênio', routePath: '/convenio' },
];

export const ADMIN_FEATURES: AdminFeature[] = RAW_ADMIN_FEATURES.trim()
  .split('\n')
  .map((line, index) => {
    const [
      moduleLabel,
      sectionLabel,
      label,
      routePath,
      requiredRole,
      featureFlag,
      backendModule,
      comment,
    ] = line.split('|');
    const moduleKey = moduleKeyFromRoute(routePath);

    return {
      id: `admin-feature-${String(index + 1).padStart(3, '0')}`,
      label,
      moduleLabel,
      moduleKey,
      sectionLabel,
      routePath,
      childPath: childPathFromRoute(routePath),
      requiredRole,
      requiredPermissions: permissionsForRoutePath(routePath),
      featureFlag,
      backendModule,
      comment,
      mode: featureModeFromRoute(routePath),
    };
  });

export const ADMIN_NAVIGATION_SECTIONS: AdminNavigationSection[] = ADMIN_MODULES.map((module) => ({
  moduleLabel: module.label,
  moduleKey: module.key,
  routePath: module.routePath,
  items: ADMIN_FEATURES.filter((feature) => feature.moduleKey === module.key),
}));

export const ADMIN_FEATURES_BY_MODULE: Record<AdminModuleKey, AdminFeature[]> =
  ADMIN_MODULES.reduce(
    (accumulator, module) => ({
      ...accumulator,
      [module.key]: ADMIN_FEATURES.filter((feature) => feature.moduleKey === module.key),
    }),
    {} as Record<AdminModuleKey, AdminFeature[]>,
  );

export function findAdminFeatureByRoutePath(routePath: string): AdminFeature | undefined {
  const normalizedPath = routePath.split('?')[0].split('#')[0].replace(/\/$/, '');
  return ADMIN_FEATURES.find((feature) => feature.routePath === normalizedPath);
}

function moduleKeyFromRoute(routePath: string): AdminModuleKey {
  const segment = routePath.split('/').filter(Boolean)[0] as AdminModuleKey | undefined;
  if (!segment || !ADMIN_MODULES.some((module) => module.key === segment)) {
    throw new Error(`Unknown admin feature module for route ${routePath}`);
  }

  return segment;
}

function childPathFromRoute(routePath: string): string {
  const [, ...parts] = routePath.split('/').filter(Boolean);
  return parts.join('/');
}

function featureModeFromRoute(routePath: string): AdminFeatureMode {
  if (routePath.includes('/formulario')) return 'form';
  if (routePath.includes('/detalhes')) return 'details';
  if (routePath.endsWith('/dashboard')) return 'dashboard';
  return 'management';
}
