-- ============================================================
-- Worker A Core DDL: foreign keys chunk 2
-- Schema: dbo
-- Foreign keys: 85
-- Applied after all tables are created.
-- ============================================================

ALTER TABLE dbo.entidade_exame
    ADD CONSTRAINT fk_entidade_exame__unidade_federativa__01
    FOREIGN KEY (uf_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.entidade_exame_exame
    ADD CONSTRAINT fk_entidade_exame_exame__entidade_exame__01
    FOREIGN KEY (entidade_exame_id)
    REFERENCES dbo.entidade_exame (id);

ALTER TABLE dbo.entidade_exame_exame
    ADD CONSTRAINT fk_entidade_exame_exame__exame__01
    FOREIGN KEY (exame_id)
    REFERENCES dbo.exame (id);

ALTER TABLE dbo.experiencia_profissional
    ADD CONSTRAINT fk_experiencia_profissional__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.experiencia_profissional
    ADD CONSTRAINT fk_experiencia_profissional__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.faixa_salarial
    ADD CONSTRAINT fk_faixa_salarial__classe_salarial__01
    FOREIGN KEY (id_classe_salarial)
    REFERENCES dbo.classe_salarial (id);

ALTER TABLE dbo.faixa_salarial
    ADD CONSTRAINT fk_faixa_salarial__grupo_salarial__01
    FOREIGN KEY (id_grupo_salarial)
    REFERENCES dbo.grupo_salarial (id);

ALTER TABLE dbo.faixa_salarial_nivel
    ADD CONSTRAINT fk_faixa_salarial_nivel__faixa_salarial__01
    FOREIGN KEY (id_faixa_salarial)
    REFERENCES dbo.faixa_salarial (id);

ALTER TABLE dbo.faixa_salarial_nivel
    ADD CONSTRAINT fk_faixa_salarial_nivel__referencia_salarial__01
    FOREIGN KEY (id_nivel_salarial)
    REFERENCES dbo.referencia_salarial (id);

ALTER TABLE dbo.falta
    ADD CONSTRAINT fk_falta__afastamento__01
    FOREIGN KEY (afastamento_id)
    REFERENCES dbo.afastamento (id);

ALTER TABLE dbo.falta
    ADD CONSTRAINT fk_falta__anexo__01
    FOREIGN KEY (anexo_id)
    REFERENCES dbo.anexo (id);

ALTER TABLE dbo.falta
    ADD CONSTRAINT fk_falta__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.falta
    ADD CONSTRAINT fk_falta__motivo_afastamento__01
    FOREIGN KEY (motivo_afastamento_id)
    REFERENCES dbo.motivo_afastamento (id);

ALTER TABLE dbo.ferias_programacao
    ADD CONSTRAINT fk_ferias_programacao__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.folha_pagamento
    ADD CONSTRAINT fk_folha_pagamento__empresa_filial__01
    FOREIGN KEY (empresa_filial_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.folha_pagamento
    ADD CONSTRAINT fk_folha_pagamento__folha_competencia__01
    FOREIGN KEY (folha_competencia_id)
    REFERENCES dbo.folha_competencia (id);

ALTER TABLE dbo.folha_pagamento
    ADD CONSTRAINT fk_folha_pagamento__tipo_processamento__01
    FOREIGN KEY (tipo_processamento_id)
    REFERENCES dbo.tipo_processamento (id);

ALTER TABLE dbo.folha_pagamento_funcionario_verba
    ADD CONSTRAINT fk_folha_pagamento_funcionario_verba__folha_pagamento__01
    FOREIGN KEY (folha_pagamento_id)
    REFERENCES dbo.folha_pagamento (id);

ALTER TABLE dbo.folha_pagamento_funcionario_verba
    ADD CONSTRAINT fk_folha_pagamento_funcionario_verba__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.folha_pagamento_funcionario_verba
    ADD CONSTRAINT fk_folha_pagamento_funcionario_verba__verba__01
    FOREIGN KEY (verba_id)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.folha_pagamento_lotacao
    ADD CONSTRAINT fk_folha_pagamento_lotacao__folha_pagamento__01
    FOREIGN KEY (folha_pagamento_id)
    REFERENCES dbo.folha_pagamento (id);

ALTER TABLE dbo.folha_pagamento_lotacao
    ADD CONSTRAINT fk_folha_pagamento_lotacao__lotacao__01
    FOREIGN KEY (lotacao_id)
    REFERENCES dbo.lotacao (id);

ALTER TABLE dbo.frequencia
    ADD CONSTRAINT fk_frequencia__falta__01
    FOREIGN KEY (falta_id)
    REFERENCES dbo.falta (id);

ALTER TABLE dbo.frequencia
    ADD CONSTRAINT fk_frequencia__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.funcao
    ADD CONSTRAINT fk_funcao__categoria_profissional__01
    FOREIGN KEY (categoria_profissional_id)
    REFERENCES dbo.categoria_profissional (id);

ALTER TABLE dbo.funcao
    ADD CONSTRAINT fk_funcao__cbo__01
    FOREIGN KEY (cbo_id)
    REFERENCES dbo.cbo (id);

ALTER TABLE dbo.funcao
    ADD CONSTRAINT fk_funcao__centro_custo__01
    FOREIGN KEY (centro_custo_id)
    REFERENCES dbo.centro_custo (id);

ALTER TABLE dbo.funcao
    ADD CONSTRAINT fk_funcao__grupo_salarial__01
    FOREIGN KEY (grupo_salarial_id)
    REFERENCES dbo.grupo_salarial (id);

ALTER TABLE dbo.funcao
    ADD CONSTRAINT fk_funcao__natureza_funcao__01
    FOREIGN KEY (natureza_funcao_id)
    REFERENCES dbo.natureza_funcao (id);

ALTER TABLE dbo.funcao
    ADD CONSTRAINT fk_funcao__processo_funcao__01
    FOREIGN KEY (processo_funcao_id)
    REFERENCES dbo.processo_funcao (id);

ALTER TABLE dbo.funcao_atividade
    ADD CONSTRAINT fk_funcao_atividade__atividade__01
    FOREIGN KEY (atividade_id)
    REFERENCES dbo.atividade (id);

ALTER TABLE dbo.funcao_atividade
    ADD CONSTRAINT fk_funcao_atividade__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.funcao_curso
    ADD CONSTRAINT fk_funcao_curso__curso__01
    FOREIGN KEY (curso_id)
    REFERENCES dbo.curso (id);

ALTER TABLE dbo.funcao_curso
    ADD CONSTRAINT fk_funcao_curso__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.funcao_habilidade
    ADD CONSTRAINT fk_funcao_habilidade__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.funcao_habilidade
    ADD CONSTRAINT fk_funcao_habilidade__habilidade__01
    FOREIGN KEY (habilidade_id)
    REFERENCES dbo.habilidade (id);

ALTER TABLE dbo.funcao_historico_lei
    ADD CONSTRAINT fk_funcao_historico_lei__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.funcao_requisito
    ADD CONSTRAINT fk_funcao_requisito__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.funcao_requisito
    ADD CONSTRAINT fk_funcao_requisito__requisito__01
    FOREIGN KEY (requisito_id)
    REFERENCES dbo.requisito (id);

ALTER TABLE dbo.funcao_verba
    ADD CONSTRAINT fk_funcao_verba__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.funcao_verba
    ADD CONSTRAINT fk_funcao_verba__verba__01
    FOREIGN KEY (verba_id)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.funcao_vinculo
    ADD CONSTRAINT fk_funcao_vinculo__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.funcao_vinculo
    ADD CONSTRAINT fk_funcao_vinculo__vinculo__01
    FOREIGN KEY (vinculo_id)
    REFERENCES dbo.vinculo (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__afastamento__01
    FOREIGN KEY (tp_sit_func_afastamento_id)
    REFERENCES dbo.afastamento (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__banco__01
    FOREIGN KEY (banco_id)
    REFERENCES dbo.banco (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__cargo__01
    FOREIGN KEY (cargo_id)
    REFERENCES dbo.cargo (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__centro_custo__01
    FOREIGN KEY (centro_custo_id)
    REFERENCES dbo.centro_custo (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__classificacao_ato__01
    FOREIGN KEY (classificacao_ato_id)
    REFERENCES dbo.classificacao_ato (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__dado_cadastral_complementar__01
    FOREIGN KEY (dado_cadastral_complementar_id)
    REFERENCES dbo.dado_cadastral_complementar (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__empresa_filial__01
    FOREIGN KEY (empresa_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__empresa_filial__02
    FOREIGN KEY (filial_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__lotacao__01
    FOREIGN KEY (lotacao_id)
    REFERENCES dbo.lotacao (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__motivo_afastamento__01
    FOREIGN KEY (motivo_afastamento_id)
    REFERENCES dbo.motivo_afastamento (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__municipio__01
    FOREIGN KEY (municipio_registro_id)
    REFERENCES dbo.municipio (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__municipio__02
    FOREIGN KEY (municipio_trabalho_id)
    REFERENCES dbo.municipio (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__municipio__03
    FOREIGN KEY (municipio_id)
    REFERENCES dbo.municipio (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__nacionalidade__01
    FOREIGN KEY (nacionalidade_id)
    REFERENCES dbo.nacionalidade (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__sindicato__01
    FOREIGN KEY (sindicato_id)
    REFERENCES dbo.sindicato (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__turno__01
    FOREIGN KEY (jornada_trabalho_turno_id)
    REFERENCES dbo.turno (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__unidade_federativa__01
    FOREIGN KEY (ctps_uf_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__unidade_federativa__02
    FOREIGN KEY (orgao_expeditor_uf_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__unidade_federativa__03
    FOREIGN KEY (registro_estrangeiro_uf_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__unidade_federativa__04
    FOREIGN KEY (titulo_eleitor_uf_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__unidade_federativa__05
    FOREIGN KEY (uf_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__unidade_federativa__06
    FOREIGN KEY (uf_trabalho_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.funcionario
    ADD CONSTRAINT fk_funcionario__vinculo__01
    FOREIGN KEY (vinculo_id)
    REFERENCES dbo.vinculo (id);

ALTER TABLE dbo.funcionario_anexo
    ADD CONSTRAINT fk_funcionario_anexo__anexo__01
    FOREIGN KEY (anexo_id)
    REFERENCES dbo.anexo (id);

ALTER TABLE dbo.funcionario_anexo
    ADD CONSTRAINT fk_funcionario_anexo__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.funcionario_exercicio
    ADD CONSTRAINT fk_funcionario_exercicio__classificacao_ato__01
    FOREIGN KEY (classificacao_ato_id)
    REFERENCES dbo.classificacao_ato (id);

ALTER TABLE dbo.funcionario_exercicio
    ADD CONSTRAINT fk_funcionario_exercicio__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.funcionario_vale_transporte
    ADD CONSTRAINT fk_funcionario_vale_transporte__funcao__01
    FOREIGN KEY (vale_transporte_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.funcionario_vale_transporte
    ADD CONSTRAINT fk_funcionario_vale_transporte__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.funcionario_verba
    ADD CONSTRAINT fk_funcionario_verba__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.funcionario_verba
    ADD CONSTRAINT fk_funcionario_verba__verba__01
    FOREIGN KEY (verba_id)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.licenca_medica
    ADD CONSTRAINT fk_licenca_medica__afastamento__01
    FOREIGN KEY (afastamento_id)
    REFERENCES dbo.afastamento (id);

ALTER TABLE dbo.licenca_medica
    ADD CONSTRAINT fk_licenca_medica__classificacao_internacional_doenca__01
    FOREIGN KEY (cid_id)
    REFERENCES dbo.classificacao_internacional_doenca (id);

ALTER TABLE dbo.licenca_medica
    ADD CONSTRAINT fk_licenca_medica__crm_crea__01
    FOREIGN KEY (crm_id)
    REFERENCES dbo.crm_crea (id);

ALTER TABLE dbo.licenca_medica
    ADD CONSTRAINT fk_licenca_medica__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.licenca_medica
    ADD CONSTRAINT fk_licenca_medica__motivo_afastamento__01
    FOREIGN KEY (motivo_afastamento_id)
    REFERENCES dbo.motivo_afastamento (id);

ALTER TABLE dbo.licenca_premio
    ADD CONSTRAINT fk_licenca_premio__funcionario_exercicio__01
    FOREIGN KEY (funcionario_exercicio_id)
    REFERENCES dbo.funcionario_exercicio (id);

ALTER TABLE dbo.lotacao
    ADD CONSTRAINT fk_lotacao__centro_custo__01
    FOREIGN KEY (id_centro_custo)
    REFERENCES dbo.centro_custo (id);

ALTER TABLE dbo.lotacao_cargo
    ADD CONSTRAINT fk_lotacao_cargo__cargo__01
    FOREIGN KEY (cargo_id)
    REFERENCES dbo.cargo (id);

ALTER TABLE dbo.lotacao_cargo
    ADD CONSTRAINT fk_lotacao_cargo__empresa_filial__01
    FOREIGN KEY (empresa_filial_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.lotacao_cargo
    ADD CONSTRAINT fk_lotacao_cargo__lotacao__01
    FOREIGN KEY (lotacao_id)
    REFERENCES dbo.lotacao (id);
