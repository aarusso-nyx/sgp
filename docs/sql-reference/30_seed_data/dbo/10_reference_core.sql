-- Generated from sql/00_inventory/seed_rows on 2026-04-21.
-- Source database inventoried: rhlinkcon (requested name was rhlinkcom).

-- Reference/core seed data

-- dbo.atividade (1 row)
INSERT INTO dbo.atividade (id, codigo, descricao, observacao, created_at, updated_at, created_by, updated_by)
VALUES
  (1, '001', 'Combate ao Crime', NULL, '2019-06-07T10:33:24.899Z', '2019-06-07T10:33:24.899Z', 1, 1);

-- dbo.banco (1 row)
INSERT INTO dbo.banco (id, created_at, updated_at, created_by, updated_by, bloqueado, codigo, nome, principal)
VALUES
  (1, '1900-01-01T00:00:00.000Z', '1900-01-01T00:00:00.000Z', 1, 1, FALSE, '1', 'teste', TRUE);

-- dbo.categoria_profissional (1 row)
INSERT INTO dbo.categoria_profissional (id, created_at, updated_at, created_by, updated_by, codigo, descricao)
VALUES
  (1, '2019-05-08T14:42:30.416Z', '2019-05-08T14:42:30.416Z', 1, NULL, '1', 'Profissionais do Crime');

-- dbo.cbo (1 row)
INSERT INTO dbo.cbo (id, created_at, updated_at, created_by, updated_by, codigo, nome)
VALUES
  (1, '2019-05-08T14:39:17.645Z', '2019-05-08T14:39:17.645Z', 1, 1, '517', 'Assistente Administrativo');

-- dbo.centro_custo (2 rows)
INSERT INTO dbo.centro_custo (id, codigo, descricao, efetivo, nivel, tipo_debito, tipo_credito, conta_credito, conta_debito, created_at, updated_at, created_by, updated_by, tipo_centro_custo, cnpj)
VALUES
  (1, '0001', 'Centro de Custo Padrão', NULL, NULL, '', NULL, NULL, NULL, '2019-05-27T14:59:29.307Z', '2019-05-27T14:59:29.307Z', 1, 1, 'ANALITICO', NULL),
  (2, '00001', 'Centro de Custo Geral', NULL, NULL, NULL, NULL, NULL, NULL, '2019-05-08T14:09:35.310Z', '2019-05-08T14:09:35.310Z', 1, 1, 'ANALITICO', NULL);

-- dbo.cnae (1 row)
INSERT INTO dbo.cnae (id, created_at, updated_at, created_by, updated_by, codigo_secao, nome_secao, codigo_classe, nome_classe)
VALUES
  (1, '2019-06-07T10:29:00.039Z', '2019-06-07T10:29:00.039Z', 1, 1, 'J', 'INFORMAÇÃO E COMUNICAÇÃO', 62015, 'Desenvolvimento de programas de computador sob encomenda');

-- dbo.codigo_pagamento_gps (2 rows)
INSERT INTO dbo.codigo_pagamento_gps (id, codigo, descricao, created_at, updated_at, created_by, updated_by)
VALUES
  (1, '2100', 'Empresas em Geral - CNPJ', '2019-06-07T10:30:25.585Z', '2019-06-07T10:30:25.585Z', 1, 1),
  (2, '2119', 'Empresas em Geral - CNPJ - Pagamento exclusivo para Outras Entidades (SESC, SESI, SENAI, etc.)', '2019-06-07T10:31:36.664Z', '2019-06-07T10:31:36.664Z', 1, 1);

-- dbo.grupo_salarial (1 row)
INSERT INTO dbo.grupo_salarial (id, nome, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 'Técnico', '2019-05-08T12:59:01.199Z', '2019-05-08T12:59:01.199Z', 1, 1);

-- dbo.menu (99 rows)
INSERT INTO dbo.menu (id, created_at, updated_at, created_by, updated_by, ativo, categoria, nome, url)
VALUES
  (2, '2019-05-24T11:55:00.840Z', '2019-05-24T11:55:00.840Z', 1, 1, TRUE, 'GESTAO', 'Usuários', '/usuario/gestao'),
  (3, '2019-05-24T11:55:00.918Z', '2019-05-24T11:55:00.918Z', 1, 1, TRUE, 'GESTAO', 'Área de Formação', '/areaFormacao/gestao'),
  (4, '2019-05-24T11:55:00.949Z', '2019-05-24T11:55:00.949Z', 1, 1, TRUE, 'GESTAO', 'Bancos', '/banco/gestao'),
  (5, '2019-05-24T11:55:01.012Z', '2019-05-24T11:55:01.012Z', 1, 1, TRUE, 'GESTAO', 'Atividade', '/atividade/gestao'),
  (6, '2019-05-24T11:55:01.043Z', '2019-05-24T11:55:01.043Z', 1, 1, TRUE, 'GESTAO', 'Categorias Profissionais', '/categoriaProfissional/gestao'),
  (7, '2019-05-24T11:55:01.090Z', '2019-05-24T11:55:01.090Z', 1, 1, TRUE, 'GESTAO', 'Categorias de Doenças', '/categoriaDoenca/gestao'),
  (8, '2019-05-24T11:55:01.168Z', '2019-05-24T11:55:01.168Z', 1, 1, TRUE, 'GESTAO', 'Categoria Econômica', '/categoriaEconomica/gestao'),
  (9, '2019-05-24T11:55:01.183Z', '2019-05-24T11:55:01.183Z', 1, 1, TRUE, 'GESTAO', 'CBOs', '/cbo/gestao'),
  (10, '2019-05-24T11:55:01.293Z', '2019-05-24T11:55:01.293Z', 1, 1, TRUE, 'GESTAO', 'Class. de Agentes Nocivos', '/classificacaoAgenteNocivo/gestao'),
  (11, '2019-05-24T11:55:01.308Z', '2019-05-24T11:55:01.308Z', 1, 1, TRUE, 'GESTAO', 'Subcategorias de Doenças', '/subCategoriaDoenca/gestao'),
  (12, '2019-05-24T11:55:01.387Z', '2019-05-24T11:55:01.387Z', 1, 1, TRUE, 'GESTAO', 'Centro de Custo', '/centroCusto/gestao'),
  (13, '2019-05-24T11:55:01.418Z', '2019-05-24T11:55:01.418Z', 1, 1, TRUE, 'GESTAO', 'Classificação de Doenças', '/classificacaoInternacionalDoenca/gestao'),
  (14, '2019-05-24T11:55:01.527Z', '2019-05-24T11:55:01.527Z', 1, 1, TRUE, 'GESTAO', 'CNAE', '/cnae/gestao'),
  (15, '2019-05-24T11:55:01.590Z', '2019-05-24T11:55:01.590Z', 1, 1, TRUE, 'GESTAO', 'Contas Contábeis Simples', '/contaContabilSimples/gestao'),
  (16, '2019-05-24T11:55:01.637Z', '2019-05-24T11:55:01.637Z', 1, 1, TRUE, 'GESTAO', 'Convênios', '/convenio/gestao'),
  (17, '2019-05-24T11:55:01.652Z', '2019-05-24T11:55:01.652Z', 1, 1, TRUE, 'GESTAO', 'Regras de Aposentadoria', '/regraAposentadoria/gestao'),
  (18, '2019-05-24T11:55:01.730Z', '2019-05-24T11:55:01.730Z', 1, 1, TRUE, 'GESTAO', 'Consignado', '/consignado/gestao'),
  (19, '2019-05-24T11:55:01.777Z', '2019-05-24T11:55:01.777Z', 1, 1, TRUE, 'GESTAO', 'EPI', '/equipamentoProtecaoIndividual/gestao'),
  (20, '2019-05-24T11:55:01.855Z', '2019-05-24T11:55:01.855Z', 1, 1, TRUE, 'GESTAO', 'EPC', '/equipamentoProtecaoColetiva/gestao'),
  (21, '2019-05-24T11:55:01.965Z', '2019-05-24T11:55:01.965Z', 1, 1, TRUE, 'GESTAO', 'Evento', '/evento/gestao'),
  (22, '2019-05-24T11:55:02.090Z', '2019-05-24T11:55:02.090Z', 1, 1, FALSE, 'GESTAO', 'Etapas', '/etapa/gestao'),
  (23, '2019-05-24T11:55:02.137Z', '2019-05-24T11:55:02.137Z', 1, 1, TRUE, 'GESTAO', 'Exames', '/exame/gestao'),
  (24, '2019-05-24T11:55:02.183Z', '2019-05-24T11:55:02.183Z', 1, 1, TRUE, 'GESTAO', 'Graus Acadêmicos', '/grauAcademico/gestao'),
  (25, '2019-05-24T11:55:02.230Z', '2019-05-24T11:55:02.230Z', 1, 1, TRUE, 'GESTAO', 'Faixas Salariais', '/faixaSalarial/gestao'),
  (26, '2019-05-24T11:55:02.308Z', '2019-05-24T11:55:02.308Z', 1, 1, TRUE, 'GESTAO', 'Cursos', '/curso/gestao'),
  (27, '2019-05-24T11:55:02.386Z', '2019-05-24T11:55:02.386Z', 1, 1, TRUE, 'GESTAO', 'Afastamento', '/afastamento/gestao'),
  (28, '2019-05-24T11:55:02.402Z', '2019-05-24T11:55:02.402Z', 1, 1, TRUE, 'GESTAO', 'CRM / CREA', '/crmCrea/gestao'),
  (29, '2019-05-24T11:55:02.449Z', '2019-05-24T11:55:02.449Z', 1, 1, TRUE, 'GESTAO', 'Causas de Afastamento', '/causaAfastamento/gestao'),
  (30, '2019-05-24T11:55:02.496Z', '2019-05-24T11:55:02.496Z', 1, 1, TRUE, 'GESTAO', 'Motivo Afastamento', '/motivoAfastamento/gestao'),
  (31, '2019-05-24T11:55:02.543Z', '2019-05-24T11:55:02.543Z', 1, 1, TRUE, 'GESTAO', 'Motivos do Desligamento', '/motivoDesligamento/gestao'),
  (32, '2019-05-24T11:55:02.683Z', '2019-05-24T11:55:02.683Z', 1, 1, TRUE, 'GESTAO', 'Códigos do Recolhimento', '/codigoRecolhimento/gestao'),
  (33, '2019-05-24T11:55:02.730Z', '2019-05-24T11:55:02.730Z', 1, 1, TRUE, 'GESTAO', 'Códigos do Pagamento GPS', '/codigoPagamentoGps/gestao'),
  (34, '2019-05-24T11:55:02.808Z', '2019-05-24T11:55:02.808Z', 1, 1, TRUE, 'GESTAO', 'Motivos', '/motivo/gestao'),
  (35, '2019-05-24T11:55:02.824Z', '2019-05-24T11:55:02.824Z', 1, 1, TRUE, 'GESTAO', 'Lotação', '/lotacao/gestao'),
  (36, '2019-05-24T11:55:02.871Z', '2019-05-24T11:55:02.871Z', 1, 1, TRUE, 'GESTAO', 'Habilidades', '/habilidade/gestao'),
  (37, '2019-05-24T11:55:02.918Z', '2019-05-24T11:55:02.918Z', 1, 1, TRUE, 'GESTAO', 'País', '/nacionalidade/gestao'),
  (38, '2019-05-24T11:55:02.965Z', '2019-05-24T11:55:02.965Z', 1, 1, TRUE, 'GESTAO', 'Município', '/municipio/gestao'),
  (39, '2019-05-24T11:55:03.074Z', '2019-05-24T11:55:03.074Z', 1, 1, TRUE, 'GESTAO', 'Tomador de Serviço', '/tomadorServico/gestao'),
  (40, '2019-05-24T11:55:03.121Z', '2019-05-24T11:55:03.121Z', 1, 1, TRUE, 'GESTAO', 'Unidades Federativas', '/unidadeFederativa/gestao'),
  (41, '2019-05-24T11:55:03.199Z', '2019-05-24T11:55:03.199Z', 1, 1, TRUE, 'GESTAO', 'SEFIP', '/sefip/gestao'),
  (42, '2019-05-24T11:55:03.293Z', '2019-05-24T11:55:03.293Z', 1, 1, TRUE, 'GESTAO', 'eSocial', '/esocial/gestao'),
  (43, '2019-05-24T11:55:03.340Z', '2019-05-24T11:55:03.340Z', 1, 1, TRUE, 'GESTAO', 'Tipos de Férias', '/tipoFerias/gestao'),
  (44, '2019-05-24T11:55:03.386Z', '2019-05-24T11:55:03.386Z', 1, 1, TRUE, 'GESTAO', 'Tipos de Folhas', '/tipoFolha/gestao'),
  (45, '2019-05-24T11:55:03.777Z', '2019-05-24T11:55:03.777Z', 1, 1, TRUE, 'GESTAO', 'Classificações dos Atos', '/classificacaoAto/gestao'),
  (46, '2019-05-24T11:55:03.824Z', '2019-05-24T11:55:03.824Z', 1, 1, TRUE, 'GESTAO', 'Naturezas Jurídicas', '/naturezaJuridica/gestao'),
  (47, '2019-05-24T11:55:03.855Z', '2019-05-24T11:55:03.855Z', 1, 1, TRUE, 'GESTAO', 'Tipos de Contrato', '/tipoContrato/gestao'),
  (48, '2019-05-24T11:55:03.933Z', '2019-05-24T11:55:03.933Z', 1, 1, TRUE, 'GESTAO', 'Tipos de Averbações', '/tipoAverbacao/gestao'),
  (49, '2019-05-24T11:55:03.965Z', '2019-05-24T11:55:03.965Z', 1, 1, TRUE, 'GESTAO', 'Modelo de Documento', '/modeloDocumento/gestao'),
  (50, '2019-05-24T11:55:04.012Z', '2019-05-24T11:55:04.012Z', 1, 1, TRUE, 'GESTAO', 'Empresa Filial', '/empresaFilial/gestao'),
  (51, '2019-05-24T11:55:04.027Z', '2019-05-24T11:55:04.027Z', 1, 1, TRUE, 'GESTAO', 'Sindicatos', '/sindicato/gestao'),
  (52, '2019-05-24T11:55:04.043Z', '2019-05-24T11:55:04.043Z', 1, 1, TRUE, 'GESTAO', 'Verbas', '/verba/gestao'),
  (53, '2019-05-24T11:55:04.121Z', '2019-05-24T11:55:04.121Z', 1, 1, TRUE, 'GESTAO', 'Tipo de Processamento', '/tipoProcessamento/gestao'),
  (54, '2019-05-24T11:55:04.152Z', '2019-05-24T11:55:04.152Z', 1, 1, TRUE, 'GESTAO', 'Vales Transporte', '/valeTransporte/gestao'),
  (55, '2019-05-24T11:55:04.215Z', '2019-05-24T11:55:04.215Z', 1, 1, TRUE, 'GESTAO', 'Histórico Contábil', '/historicoContabil/gestao'),
  (56, '2019-05-24T11:55:04.230Z', '2019-05-24T11:55:04.230Z', 1, 1, TRUE, 'GESTAO', 'Entidades de Exames', '/entidadeExame/gestao'),
  (57, '2019-05-24T11:55:04.277Z', '2019-05-24T11:55:04.277Z', 1, 1, TRUE, 'GESTAO', 'Turno', '/turno/gestao'),
  (58, '2019-05-24T11:55:04.324Z', '2019-05-24T11:55:04.324Z', 1, 1, TRUE, 'GESTAO', 'Responsável Legal', '/responsavelLegal/gestao'),
  (59, '2019-05-24T11:55:04.371Z', '2019-05-24T11:55:04.371Z', 1, 1, TRUE, 'GESTAO', 'Requisito', '/requisito/gestao'),
  (60, '2019-05-24T11:55:04.387Z', '2019-05-24T11:55:04.387Z', 1, 1, TRUE, 'GESTAO', 'Natureza da Função', '/naturezaFuncao/gestao'),
  (61, '2019-05-24T11:55:04.465Z', '2019-05-24T11:55:04.465Z', 1, 1, TRUE, 'GESTAO', 'Vínculos', '/vinculo/gestao'),
  (62, '2019-05-24T11:55:04.512Z', '2019-05-24T11:55:04.512Z', 1, 1, TRUE, 'GESTAO', 'Referência Salarial', '/referenciaSalarial/gestao'),
  (63, '2019-05-24T11:55:04.574Z', '2019-05-24T11:55:04.574Z', 1, 1, TRUE, 'GESTAO', 'Processo de Função', '/processoFuncao/gestao'),
  (64, '2019-05-24T11:55:04.621Z', '2019-05-24T11:55:04.621Z', 1, 1, TRUE, 'GESTAO', 'Dia Util', '/diaUtil/gestao'),
  (65, '2019-05-24T11:55:04.840Z', '2019-05-24T11:55:04.840Z', 1, 1, TRUE, 'GESTAO', 'Função', '/funcao/gestao'),
  (66, '2019-05-24T11:55:04.855Z', '2019-05-24T11:55:04.855Z', 1, 1, TRUE, 'GESTAO', 'Prestadores de Serviço', '/prestadorServico/gestao'),
  (67, '2019-05-24T11:55:04.949Z', '2019-05-24T11:55:04.949Z', 1, 1, TRUE, 'GESTAO', 'Correção Salarial', '/correcaoSalarial/gestao'),
  (68, '2019-05-24T11:55:04.980Z', '2019-05-24T11:55:04.980Z', 1, 1, TRUE, 'GESTAO', 'Cargos', '/cargo/gestao'),
  (69, '2019-05-24T11:55:05.027Z', '2019-05-24T11:55:05.027Z', 1, 1, TRUE, 'GESTAO', 'Conta Contábil', '/contaContabil/gestao'),
  (70, '2019-05-24T11:55:05.230Z', '2019-05-24T11:55:05.230Z', 1, 1, TRUE, 'MODULO_RH', 'Funcionário', '/funcionario/gestao'),
  (71, '2019-05-24T11:55:05.512Z', '2019-05-24T11:55:05.512Z', 1, 1, TRUE, 'MODULO_RH', 'Dependentes', '/dependente/gestao'),
  (72, '2019-05-24T11:55:05.605Z', '2019-05-24T11:55:05.605Z', 1, 1, TRUE, 'MODULO_RH', 'Simu. Nível Salarial', '/simuladorNivelSalarial/gestao'),
  (73, '2019-05-24T11:55:05.918Z', '2019-05-24T11:55:05.918Z', 1, 1, TRUE, 'MODULO_RH', 'Definição de Orgânico', '/definicaoOrganico/gestao'),
  (74, '2019-05-24T11:55:06.090Z', '2019-05-24T11:55:06.090Z', 1, 1, TRUE, 'MODULO_RH', 'Contribuição Sindical', '/contribuicaoSindical/gestao'),
  (75, '2019-05-24T11:55:06.152Z', '2019-05-24T11:55:06.152Z', 1, 1, TRUE, 'MODULO_RH', 'Dados Cadastrais', '/dadoCadastralComplementar/gestao'),
  (76, '2019-05-24T11:55:06.355Z', '2019-05-24T11:55:06.355Z', 1, 1, TRUE, 'MODULO_RH', 'Hist. Nível Salarial', '/nivelSalarialHistorico/gestao'),
  (77, '2019-05-24T11:55:06.371Z', '2019-05-24T11:55:06.371Z', 1, 1, TRUE, 'MODULO_RH', 'Licenca Médica', '/licencaMedica/gestao'),
  (78, '2019-05-24T11:55:06.605Z', '2019-05-24T11:55:06.605Z', 1, 1, TRUE, 'MODULO_RH', 'Dossiê do Servidor', '/observacaoDoc/gestao'),
  (79, '2019-05-24T11:55:06.621Z', '2019-05-24T11:55:06.621Z', 1, 1, TRUE, 'MODULO_RH', 'Transferência Funcionário', '/transferenciaFuncionario/gestao'),
  (80, '2019-05-24T11:55:06.808Z', '2019-05-24T11:55:06.808Z', 1, 1, TRUE, 'MODULO_RH', 'Processo', '/processo/gestao'),
  (81, '2019-05-24T11:55:06.855Z', '2019-05-24T11:55:06.855Z', 1, 1, TRUE, 'MODULO_RH', 'Experiência Profissional', '/experienciaProfissional/gestao'),
  (82, '2019-05-24T11:55:06.902Z', '2019-05-24T11:55:06.902Z', 1, 1, TRUE, 'MODULO_RH', 'Acidente de Trabalho', '/acidenteTrabalho/gestao'),
  (83, '2019-05-24T11:55:06.918Z', '2019-05-24T11:55:06.918Z', 1, 1, TRUE, 'MODULO_RH', 'Tempo de Serviço', '/tempoServico/gestao'),
  (84, '2019-05-24T11:55:07.027Z', '2019-05-24T11:55:07.027Z', 1, 1, TRUE, 'MODULO_RH', 'Licença Prêmio', '/licencaPremio/gestao'),
  (85, '2019-05-24T11:55:07.058Z', '2019-05-24T11:55:07.058Z', 1, 1, TRUE, 'MODULO_RH', 'Pensão Alimentícia', '/pensaoAlimenticia/gestao'),
  (86, '2019-05-24T11:55:07.121Z', '2019-05-24T11:55:07.121Z', 1, 1, TRUE, 'FOLHA_PAGAMENTO', 'Alíquotas', '/aliquota/gestao'),
  (87, '2019-05-24T11:55:07.262Z', '2019-05-24T11:55:07.262Z', 1, 1, TRUE, 'MODULO_RH', 'Situação Funcional', '/situacaoFuncional/gestao'),
  (88, '2019-05-24T11:55:07.308Z', '2019-05-24T11:55:07.308Z', 1, 1, TRUE, 'MODULO_RH', 'Program. de Férias', '/feriasProgramacao/gestao'),
  (89, '2019-05-24T11:55:07.496Z', '2019-05-24T11:55:07.496Z', 1, 1, TRUE, 'MODULO_RH', 'Reg. de Frequêcia', '/frequencia/gestao'),
  (90, '2019-05-24T11:55:07.621Z', '2019-05-24T11:55:07.621Z', 1, 1, TRUE, 'FOLHA_PAGAMENTO', 'Verbas do Funcionário', '/verbasFuncionario/gestao'),
  (91, '2019-05-24T11:55:09.887Z', '2019-05-24T11:55:09.887Z', 1, 1, TRUE, 'FOLHA_PAGAMENTO', 'Rescisão contrato', '/recisaoContrato/gestao'),
  (92, '2019-05-24T11:55:09.918Z', '2019-05-24T11:55:09.918Z', 1, 1, TRUE, 'FOLHA_PAGAMENTO', 'Folha de Pgt', '/folhaPagamento/gestao'),
  (93, '2019-05-24T11:55:09.965Z', '2019-05-24T11:55:09.965Z', 1, 1, TRUE, 'FOLHA_PAGAMENTO', 'Ficha Financeira', '/fichaFinanceira/gestao'),
  (94, '2019-05-24T11:55:10.199Z', '2019-05-24T11:55:10.199Z', 1, 1, TRUE, 'FOLHA_PAGAMENTO', 'Adiantamento Salarial', '/adiantamentoPagamento/gestao'),
  (95, '2019-05-24T11:55:10.293Z', '2019-05-24T11:55:10.293Z', 1, 1, TRUE, 'RECRUTAMENTO_SELECAO', 'Requisição de Pessoal', '/requisicaoPessoal/gestao'),
  (96, '2019-05-24T11:55:10.308Z', '2019-05-24T11:55:10.308Z', 1, 1, TRUE, 'MODULO_AVALIACAO', 'Avaliação de Desempenho', '/avaliacaoDesempenho/gestao'),
  (97, '2019-05-24T11:55:10.465Z', '2019-05-24T11:55:10.465Z', 1, 1, TRUE, 'FOLHA_PAGAMENTO', 'Programação de Adiantamento de 13º Salário', '/solAdiantamento/gestao'),
  (98, '2019-05-24T11:55:10.558Z', '2019-05-24T11:55:10.558Z', 1, 1, TRUE, 'MODULO_RH', 'Treinamento Sugerido', '/treinamentoSugerido/gestao'),
  (99, '2019-06-07T10:20:49.894Z', '2019-06-07T10:20:49.894Z', 1, 1, TRUE, 'RECRUTAMENTO_SELECAO', 'Gestão de Requisições', '/requisicaoPessoalGestao/gestao'),
  (100, '2019-07-01T12:01:48.460Z', '2019-07-01T12:01:48.460Z', 1, 1, TRUE, 'RELATORIO', 'Relatórios Gerenciais do Recrutamento e Seleção', '/relatorios/recrutamentoESelecao/relatorioRecrutamentoESelecao');

-- dbo.natureza_funcao (1 row)
INSERT INTO dbo.natureza_funcao (id, descricao, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 'Vigilante Noturno (  Combatente do Crime )', '2019-05-08T14:39:38.536Z', '2019-05-08T14:39:38.536Z', 1, 1);

-- dbo.processo_funcao (1 row)
INSERT INTO dbo.processo_funcao (id, descricao, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 'Processo 1', '2019-05-08T14:40:22.611Z', '2019-05-08T14:40:22.611Z', 1, 1);

-- dbo.referencia_salarial (3 rows)
INSERT INTO dbo.referencia_salarial (id, codigo, descricao, valor, nivel_referencia, created_at, updated_at, created_by, updated_by, mes_ano_competencia)
VALUES
  (1, '23', 'Técnico I', 2500, FALSE, '2019-06-07T16:07:52.282Z', '2019-06-07T16:07:52.282Z', 1, 1, '2019/06'),
  (2, '24', 'Técnico II', 2800, FALSE, '2019-06-10T16:10:40.900Z', '2019-06-10T16:10:40.900Z', 1, 1, '336'),
  (3, '25', 'Técnico III', 3200, FALSE, '2019-06-10T16:10:53.866Z', '2019-06-10T16:10:53.866Z', 1, 1, '336');

-- dbo.tipo_folha (1 row)
INSERT INTO dbo.tipo_folha (id, codigo, descricao, created_at, updated_at, created_by, updated_by)
VALUES
  (1, '001', 'Folha mensal', '2019-06-07T10:34:28.371Z', '2019-06-07T10:34:28.371Z', 1, 1);

-- dbo.tipo_processamento (1 row)
INSERT INTO dbo.tipo_processamento (id, codigo, descricao, created_at, updated_at, created_by, updated_by)
VALUES
  (1, '001', 'Processamento Padrão', '2019-06-07T10:34:53.327Z', '2019-06-07T10:34:53.327Z', 1, 1);

-- dbo.turno (1 row)
INSERT INTO dbo.turno (id, codigo, data_inicio, data_fim, horario_flexivel, horario_flexivel_inicio, horario_flexivel_fim, intervalo_flexivel, intervalo_flexivel_inicio, intervalo_flexivel_fim, created_at, updated_at, created_by, updated_by, intervalo, jornada)
VALUES
  (1, '001', '2019-05-01T10:12:57.295Z', '2020-05-02T10:12:57.323Z', TRUE, NULL, NULL, TRUE, NULL, NULL, '2019-05-09T10:13:57.691Z', '2019-05-09T10:13:57.691Z', 1, 1, '1970-01-01T12:00:00.000Z', '1970-01-01T08:08:00.000Z');

-- dbo.unidade_federativa (1 row)
INSERT INTO dbo.unidade_federativa (id, sigla, estado, created_at, updated_at, created_by, updated_by)
VALUES
  (1, 'RN', 'Rio grande do norte', '2019-05-24T10:16:22.972Z', '2019-05-24T10:16:22.972Z', 1, 1);

-- dbo.vinculo (1 row)
INSERT INTO dbo.vinculo (id, created_at, updated_at, created_by, updated_by, data_final, data_inicial, descricao, grupo, categoria_esocial_id, categoria_sefip_id, ocorrencia_sefip_id, situacao_inicial_afastamento_id, tipo_contrato_id, vinculo_apos_id)
VALUES
  (1, '2019-05-08T14:45:30.820Z', '2019-05-08T14:45:30.820Z', 1, 1, NULL, NULL, 'Vínculo Criminal de Gothan', 'EFETIVO', NULL, NULL, NULL, NULL, NULL, NULL);
