-- Generated from sql/00_inventory/seed_rows on 2026-04-21.
-- Source database inventoried: rhlinkcon (requested name was rhlinkcom).

-- Dependent reference seed data

-- dbo.papel (1 row)
INSERT INTO dbo.papel (id, nome, id_menu)
VALUES
  (1, 'ROLE_ADMIN', NULL);

-- dbo.cargo (1 row)
INSERT INTO dbo.cargo (id, created_at, updated_at, created_by, updated_by, descricao, extinto_em, nome, cbo_id, natureza_funcao_id, processo_funcao_id, categoria_profissional_id, sindicato_id, contagem_tempo_especial, motivo_lei, dedicacao_exclusiva, lei_respaldo, grupo_salarial_id)
VALUES
  (1, '2019-06-07T16:10:15.017Z', '2019-06-07T16:10:15.017Z', 1, 1, 'Assistente Técnico Administrativo', NULL, 'Técnico Administrativo', NULL, NULL, NULL, NULL, NULL, 'PROFESSOR', 'CRIACAO', FALSE, '12312312', 1);

-- dbo.funcao (1 row)
INSERT INTO dbo.funcao (id, nome, descricao, cbo_id, data_criacao, data_extincao, funcao_extinta, natureza_funcao_id, processo_funcao_id, categoria_profissional_id, dedicacao_exclusiva, funcao_acumulavel, contagem_tempo_especial, motivo_lei, numero_lei, data_lei, created_at, updated_at, created_by, updated_by, grupo_salarial_id, centro_custo_id)
VALUES
  (1, 'Combatente do Crime', 'Ajuda a polícia.', 1, '2019-05-09T10:12:15.808Z', NULL, NULL, 1, 1, 1, TRUE, 'PROFISSIONAL_SAUDE', 'ATIVIDADE_RISCO', NULL, NULL, NULL, '2019-05-09T10:12:15.857Z', '2019-05-09T10:12:15.857Z', 1, 1, 1, 1);

-- dbo.municipio (1 row)
INSERT INTO dbo.municipio (id, descricao, cep, naturalidade, regiao_fiscal, created_at, updated_at, created_by, updated_by, id_unidade_federativa)
VALUES
  (1, 'Natal', '59000000', 'Natalense', 'teste', '2019-05-24T10:17:02.839Z', '2019-05-24T10:17:02.839Z', 1, 1, NULL);

-- dbo.agencia (1 row)
INSERT INTO dbo.agencia (id, created_at, updated_at, created_by, updated_by, bloqueado, digito, nome, numero, referencia, banco_id, unidade_federativa_id, municipio_id)
VALUES
  (2, '1900-01-01T00:00:00.000Z', '1900-01-01T00:00:00.000Z', 1, 1, FALSE, 1, 'teste', 0, '', 1, 1, 1);

-- dbo.empresa_filial (3 rows)
INSERT INTO dbo.empresa_filial (id, sigla, nome_filial, empresa_matriz, tipo_filial, cnae_id, codigo_pagamento_gps_id, situacao, esfera_orgao, qtd_proprietario, tipo_estabelecimento, capital_social_anual, dt_inicial_atividade, referencia_contribuicao, atividade_primaria, natureza_estabelecimento, banco_id, agencia, fpas, cd_gpras_acidente_trabalho, cnpj, codigo_empregador, rais_negativa, percentual_empregador, sat, salario_educacao, senai, sesi, senac, sesc, sebrae, senar, senat, set_col, secoop, dpc, forca_aerea, fap, logradouro, numero, complemento, cep, uf_id, bairro, municipio_id, telefone, anexo_id, tipo_inscricao, created_at, updated_at, created_by, updated_by, pais_id, cei)
VALUES
  (1, 'LKC', 'Linkcon', TRUE, 'ATIVA', 1, 1, 'LIBERADO', 'EMPRESA_PRIVADA', 2, 'PRINCIPAL', 5000, '2019-06-01T10:31:45.910Z', 'EMPREGADOR', 'combate ao crime', 'Fisico', 1, 11111, 1111, NULL, '65519389000121', 11111, 11111, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 11111, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CNPJ', '2019-06-07T10:34:12.447Z', '2019-06-07T10:34:12.447Z', 1, 1, NULL, NULL),
  (2, 'LKC', 'Linkcon', TRUE, 'ATIVA', 1, 1, 'LIBERADO', 'EMPRESA_PRIVADA', 1, 'PRINCIPAL', 250000, '2019-05-01T13:38:00.835Z', 'EMPREGADOR', 'Comércio de Software', 'Jurídica', 1, 11224, 1, 1, '75268882000170', 12, 11, 100, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0, 0, 0, 0, 0, 0.1, 1212, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CNPJ', '2019-05-08T13:41:55.033Z', '2019-05-08T13:41:55.033Z', 1, 1, NULL, NULL),
  (3, 'F112', 'FILIAL1', FALSE, 'ATIVA', 1, 1, 'LIBERADO', 'EMPRESA_PRIVADA', NULL, 'PRINCIPAL', 1222.22, '2019-06-13T13:44:53.946Z', 'AUTONOMO_LIBERAL', 'aaa', 'a', 1, 122, 0, NULL, '28184827000111', 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CNPJ_CEI', '2019-06-10T13:48:23.346Z', '2019-06-10T13:48:23.346Z', 1, 1, NULL, '28184827000111');

-- dbo.verba (11 rows)
INSERT INTO dbo.verba (id, codigo, descricao_verba, descricao_resumida, tipo_verba, destinacao_externa, valor_maximo, tipo_valor, incidencia_valor, comentario, conta_debito, conta_credito, conta_auxiliar_primaria, conta_auxiliar_secundaria, vigencia_inicial, vigencia_final, recorrencia, created_at, updated_at, created_by, updated_by, centro_custo_id, referencia)
VALUES
  (1, '1101', 'Vencimento', 'vencimento', 'VANTAGEM', NULL, NULL, 'MOEDA', 'HORA_TRABALHADA', '<p>teste</p>', 122, 222, NULL, NULL, '2019-06-01T14:23:57.121Z', NULL, 'FIXA', '2019-06-07T14:35:23.011Z', '2019-06-07T14:35:23.011Z', 1, 1, 2, NULL),
  (8, '1107', 'Adicional de Titulação e Aperfeiçoamento', 'titulacao_aperfeicoamento', 'VANTAGEM', NULL, NULL, 'MOEDA', 'HORA_TRABALHADA', '<p>teste</p>', 122, 222, NULL, NULL, '2019-06-01T14:39:08.416Z', NULL, 'FIXA', '2019-06-07T14:42:51.917Z', '2019-06-07T14:42:51.917Z', 1, 1, 2, NULL),
  (9, '1000', 'Salário', 'Salário', 'VANTAGEM', 'SEM_DESTINACAO_EXTERNA', NULL, 'MOEDA', 'HORA_TRABALHADA', '<p> teste</p>', 122, 222, NULL, NULL, '2019-06-01T14:23:57.121Z', NULL, 'FIXA', '2019-06-07T17:53:23.011Z', '2019-06-10T16:21:16.554Z', 1, 1, 2, NULL),
  (10, '4963', 'Vale Transporte', 'vale_transporte', 'DESCONTO', 'SEM_DESTINACAO_EXTERNA', NULL, 'MOEDA', 'HORA_TRABALHADA', '<p>Vale transporte será 6% do valor total do vencimento<br/></p>', 122, 222, NULL, NULL, '2019-06-06T16:07:19.668Z', '2019-06-19T16:07:19.707Z', 'FIXA', '2019-06-10T16:10:35.563Z', '2019-06-10T16:12:04.285Z', 1, 1, 2, NULL),
  (11, '124', 'INSS', 'INSS', 'DESCONTO', 'SEM_DESTINACAO_EXTERNA', NULL, 'MOEDA', 'HORA_TRABALHADA', '<p> inss </p>', 122, 222, NULL, NULL, '2019-01-01T00:00:00.100Z', '2019-12-01T00:00:00.100Z', 'FIXA', '2019-06-12T15:30:00.100Z', '2019-06-12T15:30:00.100Z', 1, 1, 2, NULL),
  (12, '1112', 'Gratificação por Regência de Classe', 'gratificacao_regencia_classe', 'VANTAGEM', NULL, NULL, 'MOEDA', 'HORA_TRABALHADA', '<p><span style="font-size: 9pt;color: #244061;">Lei Ordinária nº 7761 de 19/12/1997 - </span><span style="font-size: 11pt;color: #244061;">Para o cargo de professor</span><br/></p>', 122, 222, NULL, NULL, '2019-06-01T09:49:24.702Z', NULL, 'FIXA', '2019-06-13T09:50:43.211Z', '2019-06-13T09:50:43.211Z', 1, 1, 2, NULL),
  (14, '1229', 'Adicional de Incentivo Funcional ( Motorista)', 'adicional_incentivo_funcional_motorista', 'VANTAGEM', NULL, NULL, 'PERCENTUAL', 'HORA_TRABALHADA', '<p><span style="font-size: 9pt;color: #244061;">Art. 1º art.<br/>2º, da Lei Complementar n.º 202/2009,  V, do art. 6º aprovado pelo Decreto nº 3.277, de<br/>17 agosto de 2009. </span><br/></p>', 122, 222, NULL, NULL, '2019-06-01T10:10:06.959Z', NULL, 'FIXA', '2019-06-13T10:13:11.509Z', '2019-06-13T10:13:11.509Z', 1, 1, 2, NULL),
  (15, '1236', 'Adicional por Regime Especial de Trabalho Policial – RETP', 'adicional_rept', 'VANTAGEM', NULL, NULL, 'MOEDA', 'REMUNERACAO_DO_CARGO', '<p><span style="font-size: 9pt;color: #244061;"> Lei nº 8.623/2008. - </span><span style="font-size: 11pt;color: #244061;">Essa verba é para o guarda municipal. Relacionar os códigos dos guardas munícipais.</span><br/></p>', 122, 222, NULL, NULL, '2019-06-01T11:02:38.334Z', NULL, 'FIXA', '2019-06-13T11:04:38.481Z', '2019-06-13T11:04:38.481Z', 1, 1, 2, NULL),
  (16, '1158', 'Gratificação por Maturação Profissional', 'gratificacao_maturacao_profissional', 'VANTAGEM', NULL, NULL, 'MOEDA', 'HORA_TRABALHADA', '<p><span style="font-size: 9pt;color: #244061;"> Artigo 56 da Lei 7.048, de 30 de setembro de 1991,  - </span><span style="font-size: 11pt;color: #244061;">Procurar saber quais as funções da area da saúde. Verificar quem tem direito. Se so inativo tem direito</span><br/></p>', 122, 222, NULL, NULL, '2019-06-01T11:06:28.975Z', NULL, 'FIXA', '2019-06-13T11:09:58.100Z', '2019-06-13T11:09:58.100Z', 1, 1, 2, NULL),
  (17, '1237', 'Adicional Desempenho Profissional', 'adicional_desempenho_profissional', 'VANTAGEM', NULL, NULL, 'MOEDA', 'HORA_TRABALHADA', '<p><span style="font-size: 9pt;color: #000000;">LEI Nº 9.483, DE 20 DE OUTUBRO DE 2014 - </span><span style="font-size: 11pt;color: #244061;">Só vai receber esse adicional, quem estiver o cargo de nível superior. Pegar relação.</span><br/></p>', 122, 222, NULL, NULL, '2019-06-01T11:10:33.969Z', NULL, 'FIXA', '2019-06-13T11:12:28.693Z', '2019-06-13T11:12:28.693Z', 1, 1, 2, NULL),
  (18, '1238', 'Adicional de Responsabilidade Técnica ( Engenheiro )', 'adicional_resp_tecnica_engenheiro', 'VANTAGEM', NULL, NULL, 'MOEDA', 'HORA_TRABALHADA', '<p><span style="font-size: 9pt;color: #244061;"> Lei nº 8.623/2008.“Art. 7º  - </span><span style="font-size: 11pt;color: #244061;">Só tem direito a quem ocupa o cargo em analista em obras e urbanismo. Verificar se só engenheiro pode ocupar o cargo de analista em obras e urbanismo.</span><br/></p>', 122, 222, NULL, NULL, '2019-06-01T11:12:35.069Z', NULL, 'FIXA', '2019-06-13T11:14:47.580Z', '2019-06-13T11:14:47.580Z', 1, 1, 1, NULL);

-- dbo.conta_contabil (2 rows)
INSERT INTO dbo.conta_contabil (id, empresa_id, filial_id, centro_custo_id, tipo_conta, conta, rateio, rateio_total, created_at, updated_at, created_by, updated_by, id_verba)
VALUES
  (1, 2, NULL, 1, 'DEBITO', 122, 0, 0, '2019-06-07T14:23:33.464Z', '2019-06-07T14:23:33.464Z', 1, 1, NULL),
  (2, 1, NULL, 1, 'CREDITO', 222, 0, 0, '2019-06-07T14:23:49.777Z', '2019-06-07T14:23:49.777Z', 1, 1, NULL);

-- dbo.verba_formula (11 rows)
INSERT INTO dbo.verba_formula (id, formula, descricao, verba_id, created_at, updated_at, created_by, updated_by)
VALUES
  (1, '<p>o{referenciaSalarialCargo.valor} /n </p>', 'vencimento', 1, '2019-06-07T14:35:23.114Z', '2019-06-07T14:35:23.114Z', 1, 1),
  (8, '<p>percent = 0 /n</p><p><br/></p><p>SE ( "o{grauInstrucao}" == "SUPERIOR_COMPLETO") </p><p><br/></p><p><br/></p><p>ENTAO percent = 0.07/n</p><p><br/></p><p><br/></p><p>SENAO_SE ( "o{grauInstrucao}" == "ESPECIALIZACAO_POS_GRADUACAO" ) </p><p><br/></p><p><br/></p><p>ENTAO percent = 0.1/n</p><p><br/></p><p><br/></p><p>SENAO_SE ( "o{grauInstrucao}" == "MESTRADO") /n</p><p><br/></p><p><br/></p><p>ENTAO percent = 0.12 /n</p><p><br/></p><p><br/></p><p>FIM_SE /n</p><p><br/></p><p><br/></p><p>r{vencimento} * percent </p>', 'titulacao_aperfeicoamento', 8, '2019-06-07T14:42:51.929Z', '2019-06-07T14:42:51.929Z', 1, 1),
  (9, '<p></p><p>salario = r{vencimento} + r{titulacao_aperfeicoamento} /n</p><p>salario = salario - r{vale_transporte}   /n<br/></p><p>salario*1 /n </p><p></p><p> </p>', 'salario', 9, '2019-06-07T17:57:23.011Z', '2019-06-11T10:02:38.072Z', 1, 1),
  (14, '<p>r{vencimento} * 0.06 /n </p>', 'vale_transporte', 10, '2019-06-10T16:10:35.697Z', '2019-06-13T14:04:00.337Z', 1, 1),
  (15, '<p>a{inss} /n </p>', 'inss', 11, '2019-06-12T15:30:00.100Z', '2019-06-12T15:30:00.100Z', 1, 1),
  (16, '<p>214.00 * 1<br/></p>', 'gratificacao_regencia_classe', 12, '2019-06-13T09:50:43.501Z', '2019-06-13T09:50:43.501Z', 1, 1),
  (17, '<p>o{referenciaSalarialCargo.valor} /n * /n 0.3<br/></p>', 'adicional_incentivo_funcional_motorista', 14, '2019-06-13T10:13:11.655Z', '2019-06-13T10:13:11.655Z', 1, 1),
  (18, '<p>o{referenciaSalarialCargo.valor} /n * /n 1.0<br/></p>', 'adicional_rept', 15, '2019-06-13T11:04:38.589Z', '2019-06-13T11:04:38.589Z', 1, 1),
  (19, '<p>o{referenciaSalarialCargo.valor} /n * /n 0.2<br/></p>', 'gratificacao_maturacao_profissional', 16, '2019-06-13T11:09:58.252Z', '2019-06-13T11:09:58.252Z', 1, 1),
  (20, '<p>o{referenciaSalarialCargo.valor} /n * /n  0.2<br/></p>', 'adicional_desempenho_profissional', 17, '2019-06-13T11:12:29.031Z', '2019-06-13T11:12:29.031Z', 1, 1),
  (21, '<p>o{referenciaSalarialCargo.valor} /n * /n 1.0 <br/></p>', 'adicional_resp_tecnica_engenheiro', 18, '2019-06-13T11:14:47.889Z', '2019-06-13T11:14:47.889Z', 1, 1);
