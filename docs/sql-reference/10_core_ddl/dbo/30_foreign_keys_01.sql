-- ============================================================
-- Worker A Core DDL: foreign keys chunk 1
-- Schema: dbo
-- Foreign keys: 85
-- Applied after all tables are created.
-- ============================================================

ALTER TABLE dbo.acidente_trabalho
    ADD CONSTRAINT fk_acidente_trabalho__anexo__01
    FOREIGN KEY (id_anexo)
    REFERENCES dbo.anexo (id);

ALTER TABLE dbo.acidente_trabalho
    ADD CONSTRAINT fk_acidente_trabalho__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.acidente_trabalho
    ADD CONSTRAINT fk_acidente_trabalho__tomador_servico__01
    FOREIGN KEY (entidade_id)
    REFERENCES dbo.tomador_servico (id);

ALTER TABLE dbo.acidente_trabalho
    ADD CONSTRAINT fk_acidente_trabalho__tomador_servico__02
    FOREIGN KEY (tomador_servido_id)
    REFERENCES dbo.tomador_servico (id);

ALTER TABLE dbo.adiantamento_pagamento
    ADD CONSTRAINT fk_adiantamento_pagamento__empresa_filial__01
    FOREIGN KEY (empresa_filial_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.adiantamento_pagamento
    ADD CONSTRAINT fk_adiantamento_pagamento__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.adiantamento_pagamento
    ADD CONSTRAINT fk_adiantamento_pagamento__lotacao__01
    FOREIGN KEY (lotacao_id)
    REFERENCES dbo.lotacao (id);

ALTER TABLE dbo.agencia
    ADD CONSTRAINT fk_agencia__banco__01
    FOREIGN KEY (banco_id)
    REFERENCES dbo.banco (id);

ALTER TABLE dbo.agencia
    ADD CONSTRAINT fk_agencia__municipio__01
    FOREIGN KEY (municipio_id)
    REFERENCES dbo.municipio (id);

ALTER TABLE dbo.agencia
    ADD CONSTRAINT fk_agencia__unidade_federativa__01
    FOREIGN KEY (unidade_federativa_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.anexo_processo
    ADD CONSTRAINT fk_anexo_processo__anexo__01
    FOREIGN KEY (anexo_id)
    REFERENCES dbo.anexo (id);

ALTER TABLE dbo.anexo_processo
    ADD CONSTRAINT fk_anexo_processo__processo__01
    FOREIGN KEY (processo_id)
    REFERENCES dbo.processo (id);

ALTER TABLE dbo.avaliacao_cargo
    ADD CONSTRAINT fk_avaliacao_cargo__avaliacao_desempenho__01
    FOREIGN KEY (avaliacao_id)
    REFERENCES dbo.avaliacao_desempenho (id);

ALTER TABLE dbo.avaliacao_cargo
    ADD CONSTRAINT fk_avaliacao_cargo__cargo__01
    FOREIGN KEY (cargo_id)
    REFERENCES dbo.cargo (id);

ALTER TABLE dbo.avaliacao_desempenho
    ADD CONSTRAINT fk_avaliacao_desempenho__empresa_filial__01
    FOREIGN KEY (empresa_filial_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.avaliacao_funcao
    ADD CONSTRAINT fk_avaliacao_funcao__avaliacao_desempenho__01
    FOREIGN KEY (avaliacao_id)
    REFERENCES dbo.avaliacao_desempenho (id);

ALTER TABLE dbo.avaliacao_funcao
    ADD CONSTRAINT fk_avaliacao_funcao__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.avaliacao_lotacao
    ADD CONSTRAINT fk_avaliacao_lotacao__avaliacao_desempenho__01
    FOREIGN KEY (avaliacao_id)
    REFERENCES dbo.avaliacao_desempenho (id);

ALTER TABLE dbo.avaliacao_lotacao
    ADD CONSTRAINT fk_avaliacao_lotacao__lotacao__01
    FOREIGN KEY (lotacao_id)
    REFERENCES dbo.lotacao (id);

ALTER TABLE dbo.cargo
    ADD CONSTRAINT fk_cargo__categoria_profissional__01
    FOREIGN KEY (categoria_profissional_id)
    REFERENCES dbo.categoria_profissional (id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE dbo.cargo
    ADD CONSTRAINT fk_cargo__cbo__01
    FOREIGN KEY (cbo_id)
    REFERENCES dbo.cbo (id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE dbo.cargo
    ADD CONSTRAINT fk_cargo__grupo_salarial__01
    FOREIGN KEY (grupo_salarial_id)
    REFERENCES dbo.grupo_salarial (id);

ALTER TABLE dbo.cargo
    ADD CONSTRAINT fk_cargo__natureza_funcao__01
    FOREIGN KEY (natureza_funcao_id)
    REFERENCES dbo.natureza_funcao (id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE dbo.cargo
    ADD CONSTRAINT fk_cargo__processo_funcao__01
    FOREIGN KEY (processo_funcao_id)
    REFERENCES dbo.processo_funcao (id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE dbo.cargo
    ADD CONSTRAINT fk_cargo__sindicato__01
    FOREIGN KEY (sindicato_id)
    REFERENCES dbo.sindicato (id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE dbo.cargo_atividade
    ADD CONSTRAINT fk_cargo_atividade__atividade__01
    FOREIGN KEY (atividade_id)
    REFERENCES dbo.atividade (id);

ALTER TABLE dbo.cargo_atividade
    ADD CONSTRAINT fk_cargo_atividade__cargo__01
    FOREIGN KEY (cargo_id)
    REFERENCES dbo.cargo (id);

ALTER TABLE dbo.cargo_curso
    ADD CONSTRAINT fk_cargo_curso__atividade__01
    FOREIGN KEY (curso_id)
    REFERENCES dbo.atividade (id);

ALTER TABLE dbo.cargo_curso
    ADD CONSTRAINT fk_cargo_curso__cargo__01
    FOREIGN KEY (cargo_id)
    REFERENCES dbo.cargo (id);

ALTER TABLE dbo.cargo_habilidade
    ADD CONSTRAINT fk_cargo_habilidade__atividade__01
    FOREIGN KEY (habilidade_id)
    REFERENCES dbo.atividade (id);

ALTER TABLE dbo.cargo_habilidade
    ADD CONSTRAINT fk_cargo_habilidade__cargo__01
    FOREIGN KEY (cargo_id)
    REFERENCES dbo.cargo (id);

ALTER TABLE dbo.cargo_verba
    ADD CONSTRAINT fk_cargo_verba__cargo__01
    FOREIGN KEY (cargo_id)
    REFERENCES dbo.cargo (id);

ALTER TABLE dbo.cargo_verba
    ADD CONSTRAINT fk_cargo_verba__verba__01
    FOREIGN KEY (verba_id)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.cargo_vinculo
    ADD CONSTRAINT fk_cargo_vinculo__cargo__01
    FOREIGN KEY (cargo_id)
    REFERENCES dbo.cargo (id);

ALTER TABLE dbo.cargo_vinculo
    ADD CONSTRAINT fk_cargo_vinculo__vinculo__01
    FOREIGN KEY (vinculo_id)
    REFERENCES dbo.vinculo (id);

ALTER TABLE dbo.categoria_profissional_verba
    ADD CONSTRAINT fk_categoria_profissional_verba__categoria_profissional__01
    FOREIGN KEY (categoria_profissional_id)
    REFERENCES dbo.categoria_profissional (id);

ALTER TABLE dbo.categoria_profissional_verba
    ADD CONSTRAINT fk_categoria_profissional_verba__verba__01
    FOREIGN KEY (verba_id)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.classe_salarial
    ADD CONSTRAINT fk_classe_salarial__grupo_salarial__01
    FOREIGN KEY (id_grupo_salarial)
    REFERENCES dbo.grupo_salarial (id);

ALTER TABLE dbo.classificacao_internacional_doenca
    ADD CONSTRAINT fk_classificacao_internacional_doenca__categoria_doenca__01
    FOREIGN KEY (categoria_doenca_id)
    REFERENCES dbo.categoria_doenca (id);

ALTER TABLE dbo.classificacao_internacional_doenca
    ADD CONSTRAINT fk_classificacao_internacional_doenca__sub_categoria_doenca__01
    FOREIGN KEY (sub_categoria_doenca_id)
    REFERENCES dbo.sub_categoria_doenca (id);

ALTER TABLE dbo.compensacao
    ADD CONSTRAINT fk_compensacao__tomador_servico__01
    FOREIGN KEY (tomador_servico_id)
    REFERENCES dbo.tomador_servico (id);

ALTER TABLE dbo.consignado
    ADD CONSTRAINT fk_consignado__banco__01
    FOREIGN KEY (id_banco)
    REFERENCES dbo.banco (id);

ALTER TABLE dbo.consignado
    ADD CONSTRAINT fk_consignado__centro_custo__01
    FOREIGN KEY (id_centro_custo)
    REFERENCES dbo.centro_custo (id);

ALTER TABLE dbo.consignado
    ADD CONSTRAINT fk_consignado__unidade_federativa__01
    FOREIGN KEY (id_unidade_federativa_consignatario)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.conta_contabil
    ADD CONSTRAINT fk_conta_contabil__centro_custo__01
    FOREIGN KEY (centro_custo_id)
    REFERENCES dbo.centro_custo (id);

ALTER TABLE dbo.conta_contabil
    ADD CONSTRAINT fk_conta_contabil__empresa_filial__01
    FOREIGN KEY (empresa_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.conta_contabil
    ADD CONSTRAINT fk_conta_contabil__empresa_filial__02
    FOREIGN KEY (filial_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.conta_contabil
    ADD CONSTRAINT fk_conta_contabil__verba__01
    FOREIGN KEY (id_verba)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.conta_contabil_lotacao
    ADD CONSTRAINT fk_conta_contabil_lotacao__conta_contabil__01
    FOREIGN KEY (conta_contabil_id)
    REFERENCES dbo.conta_contabil (id);

ALTER TABLE dbo.conta_contabil_lotacao
    ADD CONSTRAINT fk_conta_contabil_lotacao__lotacao__01
    FOREIGN KEY (lotacao_id)
    REFERENCES dbo.lotacao (id);

ALTER TABLE dbo.contribuicao_sindical
    ADD CONSTRAINT fk_contribuicao_sindical__anexo__01
    FOREIGN KEY (anexo_id)
    REFERENCES dbo.anexo (id);

ALTER TABLE dbo.contribuicao_sindical
    ADD CONSTRAINT fk_contribuicao_sindical__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.contribuicao_sindical
    ADD CONSTRAINT fk_contribuicao_sindical__sindicato__01
    FOREIGN KEY (sindicato_id)
    REFERENCES dbo.sindicato (id);

ALTER TABLE dbo.correcao
    ADD CONSTRAINT fk_correcao__afastamento__01
    FOREIGN KEY (situacao_afastamento_id)
    REFERENCES dbo.afastamento (id);

ALTER TABLE dbo.correcao
    ADD CONSTRAINT fk_correcao__centro_custo__01
    FOREIGN KEY (centro_custo_id)
    REFERENCES dbo.centro_custo (id);

ALTER TABLE dbo.correcao
    ADD CONSTRAINT fk_correcao__empresa_filial__01
    FOREIGN KEY (empresa_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.correcao
    ADD CONSTRAINT fk_correcao__empresa_filial__02
    FOREIGN KEY (filial_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.correcao
    ADD CONSTRAINT fk_correcao__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.correcao
    ADD CONSTRAINT fk_correcao__referencia_salarial__01
    FOREIGN KEY (nivel_salarial_id)
    REFERENCES dbo.referencia_salarial (id);

ALTER TABLE dbo.correcao
    ADD CONSTRAINT fk_correcao__sindicato__01
    FOREIGN KEY (sindicato_id)
    REFERENCES dbo.sindicato (id);

ALTER TABLE dbo.correcao
    ADD CONSTRAINT fk_correcao__tipo_folha__01
    FOREIGN KEY (tipo_folha_id)
    REFERENCES dbo.tipo_folha (id);

ALTER TABLE dbo.correcao
    ADD CONSTRAINT fk_correcao__tipo_processamento__01
    FOREIGN KEY (tipo_processamento_id)
    REFERENCES dbo.tipo_processamento (id);

ALTER TABLE dbo.correcao
    ADD CONSTRAINT fk_correcao__verba__01
    FOREIGN KEY (verba_id)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.crm_crea_convenio
    ADD CONSTRAINT fk_crm_crea_convenio__convenio__01
    FOREIGN KEY (convenio_id)
    REFERENCES dbo.convenio (id);

ALTER TABLE dbo.crm_crea_convenio
    ADD CONSTRAINT fk_crm_crea_convenio__crm_crea__01
    FOREIGN KEY (crm_crea_id)
    REFERENCES dbo.crm_crea (id);

ALTER TABLE dbo.curso
    ADD CONSTRAINT fk_curso__area_formacao__01
    FOREIGN KEY (id_area_formacao)
    REFERENCES dbo.area_formacao (id);

ALTER TABLE dbo.curso
    ADD CONSTRAINT fk_curso__grau_academico__01
    FOREIGN KEY (id_grau_academico)
    REFERENCES dbo.grau_academico (id);

ALTER TABLE dbo.dado_cadastral_complementar
    ADD CONSTRAINT fk_dado_cadastral_complementar__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.definicao_de_organico
    ADD CONSTRAINT fk_definicao_de_organico__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.dependente
    ADD CONSTRAINT fk_dependente__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.dependente
    ADD CONSTRAINT fk_dependente__municipio__01
    FOREIGN KEY (municipio_id)
    REFERENCES dbo.municipio (id);

ALTER TABLE dbo.dependente
    ADD CONSTRAINT fk_dependente__unidade_federativa__01
    FOREIGN KEY (unidade_federativa_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.dependente_beneficio
    ADD CONSTRAINT fk_dependente_beneficio__consignado__01
    FOREIGN KEY (consignado_id)
    REFERENCES dbo.consignado (id);

ALTER TABLE dbo.dependente_beneficio
    ADD CONSTRAINT fk_dependente_beneficio__dependente__01
    FOREIGN KEY (dependente_id)
    REFERENCES dbo.dependente (id);

ALTER TABLE dbo.empresa_filial
    ADD CONSTRAINT fk_empresa_filial__anexo__01
    FOREIGN KEY (anexo_id)
    REFERENCES dbo.anexo (id);

ALTER TABLE dbo.empresa_filial
    ADD CONSTRAINT fk_empresa_filial__banco__01
    FOREIGN KEY (banco_id)
    REFERENCES dbo.banco (id);

ALTER TABLE dbo.empresa_filial
    ADD CONSTRAINT fk_empresa_filial__cnae__01
    FOREIGN KEY (cnae_id)
    REFERENCES dbo.cnae (id);

ALTER TABLE dbo.empresa_filial
    ADD CONSTRAINT fk_empresa_filial__codigo_pagamento_gps__01
    FOREIGN KEY (codigo_pagamento_gps_id)
    REFERENCES dbo.codigo_pagamento_gps (id);

ALTER TABLE dbo.empresa_filial
    ADD CONSTRAINT fk_empresa_filial__municipio__01
    FOREIGN KEY (municipio_id)
    REFERENCES dbo.municipio (id);

ALTER TABLE dbo.empresa_filial
    ADD CONSTRAINT fk_empresa_filial__nacionalidade__01
    FOREIGN KEY (pais_id)
    REFERENCES dbo.nacionalidade (id);

ALTER TABLE dbo.empresa_filial
    ADD CONSTRAINT fk_empresa_filial__unidade_federativa__01
    FOREIGN KEY (uf_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.empresa_filial_lotacao
    ADD CONSTRAINT fk_empresa_filial_lotacao__empresa_filial__01
    FOREIGN KEY (empresa_filial_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.empresa_filial_lotacao
    ADD CONSTRAINT fk_empresa_filial_lotacao__lotacao__01
    FOREIGN KEY (lotacao_id)
    REFERENCES dbo.lotacao (id);

ALTER TABLE dbo.entidade_exame
    ADD CONSTRAINT fk_entidade_exame__municipio__01
    FOREIGN KEY (municipio_id)
    REFERENCES dbo.municipio (id);

ALTER TABLE dbo.entidade_exame
    ADD CONSTRAINT fk_entidade_exame__tomador_servico__01
    FOREIGN KEY (tomador_servico_id)
    REFERENCES dbo.tomador_servico (id);
