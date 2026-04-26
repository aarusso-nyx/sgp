-- ============================================================
-- Worker A Core DDL: foreign keys chunk 3
-- Schema: dbo
-- Foreign keys: 85
-- Applied after all tables are created.
-- ============================================================

ALTER TABLE dbo.lotacao_funcao
    ADD CONSTRAINT fk_lotacao_funcao__empresa_filial__01
    FOREIGN KEY (empresa_filial_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.lotacao_funcao
    ADD CONSTRAINT fk_lotacao_funcao__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.lotacao_funcao
    ADD CONSTRAINT fk_lotacao_funcao__lotacao__01
    FOREIGN KEY (lotacao_id)
    REFERENCES dbo.lotacao (id);

ALTER TABLE dbo.motor_calculo_regra
    ADD CONSTRAINT fk_motor_calculo_regra__tipo_processamento__01
    FOREIGN KEY (tipo_processamento_id)
    REFERENCES dbo.tipo_processamento (id);

ALTER TABLE dbo.motor_calculo_regra
    ADD CONSTRAINT fk_motor_calculo_regra__verba__01
    FOREIGN KEY (verba_id)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.municipio
    ADD CONSTRAINT fk_municipio__unidade_federativa__01
    FOREIGN KEY (id_unidade_federativa)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.nivel_salarial_historico
    ADD CONSTRAINT fk_nivel_salarial_historico__referencia_salarial__01
    FOREIGN KEY (nivel_salarial_id)
    REFERENCES dbo.referencia_salarial (id);

ALTER TABLE dbo.nivel_salarial_historico
    ADD CONSTRAINT fk_nivel_salarial_historico__simulador_nivel_salarial__01
    FOREIGN KEY (simulador_nivel_salarial_id)
    REFERENCES dbo.simulador_nivel_salarial (id);

ALTER TABLE dbo.notificacao
    ADD CONSTRAINT fk_notificacao__usuario__01
    FOREIGN KEY (id_usuario_destinatario)
    REFERENCES dbo.usuario (id);

ALTER TABLE dbo.papel
    ADD CONSTRAINT fk_papel__menu__01
    FOREIGN KEY (id_menu)
    REFERENCES dbo.menu (id);

ALTER TABLE dbo.pensao_alimenticia
    ADD CONSTRAINT fk_pensao_alimenticia__agencia__01
    FOREIGN KEY (agencia_id)
    REFERENCES dbo.agencia (id);

ALTER TABLE dbo.pensao_alimenticia
    ADD CONSTRAINT fk_pensao_alimenticia__banco__01
    FOREIGN KEY (banco_id)
    REFERENCES dbo.banco (id);

ALTER TABLE dbo.pensao_alimenticia
    ADD CONSTRAINT fk_pensao_alimenticia__centro_custo__01
    FOREIGN KEY (centro_custo_id)
    REFERENCES dbo.centro_custo (id);

ALTER TABLE dbo.pensao_alimenticia
    ADD CONSTRAINT fk_pensao_alimenticia__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.pensao_alimenticia
    ADD CONSTRAINT fk_pensao_alimenticia__municipio__01
    FOREIGN KEY (municipio_id)
    REFERENCES dbo.municipio (id);

ALTER TABLE dbo.pensao_alimenticia
    ADD CONSTRAINT fk_pensao_alimenticia__responsavel_legal__01
    FOREIGN KEY (responsavel_id)
    REFERENCES dbo.responsavel_legal (id);

ALTER TABLE dbo.pensao_alimenticia
    ADD CONSTRAINT fk_pensao_alimenticia__unidade_federativa__01
    FOREIGN KEY (uf_documento_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.pensao_alimenticia
    ADD CONSTRAINT fk_pensao_alimenticia__unidade_federativa__02
    FOREIGN KEY (uf_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.pensao_alimenticia
    ADD CONSTRAINT fk_pensao_alimenticia__verba__01
    FOREIGN KEY (verba_id)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.prestador_servico
    ADD CONSTRAINT fk_prestador_servico__categoria_profissional__01
    FOREIGN KEY (categoria_prestador_id)
    REFERENCES dbo.categoria_profissional (id);

ALTER TABLE dbo.prestador_servico
    ADD CONSTRAINT fk_prestador_servico__cbo__01
    FOREIGN KEY (cbo_prestador_id)
    REFERENCES dbo.cbo (id);

ALTER TABLE dbo.prestador_servico
    ADD CONSTRAINT fk_prestador_servico__convenio__01
    FOREIGN KEY (convenio_id)
    REFERENCES dbo.convenio (id);

ALTER TABLE dbo.prestador_servico
    ADD CONSTRAINT fk_prestador_servico__empresa_filial__01
    FOREIGN KEY (empresa_filial_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.prestador_servico
    ADD CONSTRAINT fk_prestador_servico__municipio__01
    FOREIGN KEY (municipio_prestador_id)
    REFERENCES dbo.municipio (id);

ALTER TABLE dbo.prestador_servico
    ADD CONSTRAINT fk_prestador_servico__nacionalidade__01
    FOREIGN KEY (nacionalidade_id)
    REFERENCES dbo.nacionalidade (id);

ALTER TABLE dbo.prestador_servico
    ADD CONSTRAINT fk_prestador_servico__unidade_federativa__01
    FOREIGN KEY (uf_id_cnh)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.prestador_servico
    ADD CONSTRAINT fk_prestador_servico__unidade_federativa__02
    FOREIGN KEY (uf_id_ctps)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.prestador_servico
    ADD CONSTRAINT fk_prestador_servico__unidade_federativa__03
    FOREIGN KEY (uf_id_endereco)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.prestador_servico
    ADD CONSTRAINT fk_prestador_servico__verba__01
    FOREIGN KEY (verba_id)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.processo
    ADD CONSTRAINT fk_processo__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.recisao_contrato
    ADD CONSTRAINT fk_recisao_contrato__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.recisao_contrato
    ADD CONSTRAINT fk_recisao_contrato__motivo_desligamento__01
    FOREIGN KEY (motivo_id)
    REFERENCES dbo.motivo_desligamento (id);

ALTER TABLE dbo.requisicao_pessoal
    ADD CONSTRAINT fk_requisicao_pessoal__funcionario__01
    FOREIGN KEY (solicitante_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.requisicao_pessoal
    ADD CONSTRAINT fk_requisicao_pessoal__funcionario__02
    FOREIGN KEY (funcionario_substituido_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.requisicao_pessoal_candidato
    ADD CONSTRAINT fk_requisicao_pessoal_candidato__anexo__01
    FOREIGN KEY (id_anexo)
    REFERENCES dbo.anexo (id);

ALTER TABLE dbo.requisicao_pessoal_candidato
    ADD CONSTRAINT fk_requisicao_pessoal_candidato__requisicao_pessoal__01
    FOREIGN KEY (id_req_pessoal)
    REFERENCES dbo.requisicao_pessoal (id);

ALTER TABLE dbo.requisicao_pessoal_funcao
    ADD CONSTRAINT fk_requisicao_pessoal_funcao__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.requisicao_pessoal_funcao
    ADD CONSTRAINT fk_requisicao_pessoal_funcao__requisicao_pessoal__01
    FOREIGN KEY (requisicao_pessoal_id)
    REFERENCES dbo.requisicao_pessoal (id);

ALTER TABLE dbo.requisicao_pessoal_funcao
    ADD CONSTRAINT fk_requisicao_pessoal_funcao__turno__01
    FOREIGN KEY (turno_id)
    REFERENCES dbo.turno (id);

ALTER TABLE dbo.responsavel_legal
    ADD CONSTRAINT fk_responsavel_legal__banco__01
    FOREIGN KEY (id_banco)
    REFERENCES dbo.banco (id);

ALTER TABLE dbo.responsavel_legal
    ADD CONSTRAINT fk_responsavel_legal__municipio__01
    FOREIGN KEY (id_municipio)
    REFERENCES dbo.municipio (id);

ALTER TABLE dbo.responsavel_legal
    ADD CONSTRAINT fk_responsavel_legal__unidade_federativa__01
    FOREIGN KEY (id_unidade_federativa)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.simulador_nivel_salarial_acordo
    ADD CONSTRAINT fk_sim_nivel_sal_acordo__sim_nivel_sal__01
    FOREIGN KEY (simulador_id)
    REFERENCES dbo.simulador_nivel_salarial (id);

ALTER TABLE dbo.simulador_nivel_salarial_valores
    ADD CONSTRAINT fk_simulador_nivel_salarial_valores__referencia_salarial__01
    FOREIGN KEY (nivel_salarial_id)
    REFERENCES dbo.referencia_salarial (id);

ALTER TABLE dbo.simulador_nivel_salarial_valores
    ADD CONSTRAINT fk_sim_nivel_sal_valores__sim_nivel_sal__01
    FOREIGN KEY (simulador_id)
    REFERENCES dbo.simulador_nivel_salarial (id);

ALTER TABLE dbo.sindicato
    ADD CONSTRAINT fk_sindicato__unidade_federativa__01
    FOREIGN KEY (id_unidade_federativa_sindicato)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.situacao_funcional
    ADD CONSTRAINT fk_situacao_funcional__empresa_filial__01
    FOREIGN KEY (empresa_filial_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.situacao_funcional
    ADD CONSTRAINT fk_situacao_funcional__funcao__01
    FOREIGN KEY (funcao_id)
    REFERENCES dbo.funcao (id);

ALTER TABLE dbo.situacao_funcional
    ADD CONSTRAINT fk_situacao_funcional__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.situacao_funcional
    ADD CONSTRAINT fk_situacao_funcional__motivo__01
    FOREIGN KEY (motivo_id)
    REFERENCES dbo.motivo (id);

ALTER TABLE dbo.situacao_funcional
    ADD CONSTRAINT fk_situacao_funcional__motivo_afastamento__01
    FOREIGN KEY (sit_motivo_afastamento_id)
    REFERENCES dbo.motivo_afastamento (id);

ALTER TABLE dbo.situacao_funcional
    ADD CONSTRAINT fk_situacao_funcional__referencia_salarial__01
    FOREIGN KEY (nivel_salarial_id)
    REFERENCES dbo.referencia_salarial (id);

ALTER TABLE dbo.sol_adiantamento
    ADD CONSTRAINT fk_sol_adiantamento__funcionario__01
    FOREIGN KEY (solicitante)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.tempo_servico
    ADD CONSTRAINT fk_tempo_servico__classificacao_ato__01
    FOREIGN KEY (classificacao_ato_id)
    REFERENCES dbo.classificacao_ato (id);

ALTER TABLE dbo.tempo_servico
    ADD CONSTRAINT fk_tempo_servico__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.tempo_servico
    ADD CONSTRAINT fk_tempo_servico__sefip__01
    FOREIGN KEY (sefip_id)
    REFERENCES dbo.sefip (id);

ALTER TABLE dbo.tempo_servico
    ADD CONSTRAINT fk_tempo_servico__unidade_federativa__01
    FOREIGN KEY (uf_id)
    REFERENCES dbo.unidade_federativa (id);

ALTER TABLE dbo.tipo_folha_verbas
    ADD CONSTRAINT fk_tipo_folha_verbas__tipo_folha__01
    FOREIGN KEY (id_tipo_folha)
    REFERENCES dbo.tipo_folha (id);

ALTER TABLE dbo.tipo_folha_verbas
    ADD CONSTRAINT fk_tipo_folha_verbas__verba__01
    FOREIGN KEY (id_verba)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.tomador_servico
    ADD CONSTRAINT fk_tomador_servico__codigo_pagamento_gps__01
    FOREIGN KEY (id_codigo_pagamento_gps)
    REFERENCES dbo.codigo_pagamento_gps (id);

ALTER TABLE dbo.tomador_servico
    ADD CONSTRAINT fk_tomador_servico__codigo_recolhimento__01
    FOREIGN KEY (id_codigo_recolhimento)
    REFERENCES dbo.codigo_recolhimento (id);

ALTER TABLE dbo.transferencia_funcionario
    ADD CONSTRAINT fk_transferencia_funcionario__empresa_filial__01
    FOREIGN KEY (empresa_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.transferencia_funcionario
    ADD CONSTRAINT fk_transferencia_funcionario__funcionario__01
    FOREIGN KEY (funcionario_id)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.transferencia_funcionario
    ADD CONSTRAINT fk_transferencia_funcionario__lotacao__01
    FOREIGN KEY (lotacao_id)
    REFERENCES dbo.lotacao (id);

ALTER TABLE dbo.treinamento_sugerido
    ADD CONSTRAINT fk_treinamento_sugerido__curso__01
    FOREIGN KEY (curso_id)
    REFERENCES dbo.curso (id);

ALTER TABLE dbo.treinamento_sugerido_complemento
    ADD CONSTRAINT fk_treinamento_sugerido_complemento__municipio__01
    FOREIGN KEY (id_municipio)
    REFERENCES dbo.municipio (id);

ALTER TABLE dbo.treinamento_sugerido_complemento
    ADD CONSTRAINT fk_treinamento_sugerido_complemento__treinamento_sugerido__01
    FOREIGN KEY (id_treinamento_sugerido)
    REFERENCES dbo.treinamento_sugerido (id);

ALTER TABLE dbo.treinamento_sugerido_funcionario
    ADD CONSTRAINT fk_treinamento_sugerido_funcionario__funcionario__01
    FOREIGN KEY (id_funcionario)
    REFERENCES dbo.funcionario (id);

ALTER TABLE dbo.treinamento_sugerido_funcionario
    ADD CONSTRAINT fk_treinamento_sugerido_funcionario__treinamento_sugerido__01
    FOREIGN KEY (id_treinamento_sugerido)
    REFERENCES dbo.treinamento_sugerido (id);

ALTER TABLE dbo.treinamento_sugerido_valores
    ADD CONSTRAINT fk_treinamento_sugerido_valores__treinamento_sugerido__01
    FOREIGN KEY (id_treinamento_sugerido)
    REFERENCES dbo.treinamento_sugerido (id);

ALTER TABLE dbo.turno_folga
    ADD CONSTRAINT fk_turno_folga__turno__01
    FOREIGN KEY (turno_id)
    REFERENCES dbo.turno (id);

ALTER TABLE dbo.usuario
    ADD CONSTRAINT fk_usuario__anexo__01
    FOREIGN KEY (id_anexo)
    REFERENCES dbo.anexo (id);

ALTER TABLE dbo.usuario
    ADD CONSTRAINT fk_usuario__empresa_filial__01
    FOREIGN KEY (empresa_filial_id)
    REFERENCES dbo.empresa_filial (id);

ALTER TABLE dbo.usuario_papel
    ADD CONSTRAINT fk_usuario_papel__papel__01
    FOREIGN KEY (papel_id)
    REFERENCES dbo.papel (id);

ALTER TABLE dbo.usuario_papel
    ADD CONSTRAINT fk_usuario_papel__usuario__01
    FOREIGN KEY (usuario_id)
    REFERENCES dbo.usuario (id);

ALTER TABLE dbo.verba
    ADD CONSTRAINT fk_verba__centro_custo__01
    FOREIGN KEY (centro_custo_id)
    REFERENCES dbo.centro_custo (id);

ALTER TABLE dbo.verba_formula
    ADD CONSTRAINT fk_verba_formula__verba__01
    FOREIGN KEY (verba_id)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.vinculo
    ADD CONSTRAINT fk_vinculo__afastamento__01
    FOREIGN KEY (situacao_inicial_afastamento_id)
    REFERENCES dbo.afastamento (id);

ALTER TABLE dbo.vinculo
    ADD CONSTRAINT fk_vinculo__esocial__01
    FOREIGN KEY (categoria_esocial_id)
    REFERENCES dbo.esocial (id);

ALTER TABLE dbo.vinculo
    ADD CONSTRAINT fk_vinculo__sefip__01
    FOREIGN KEY (categoria_sefip_id)
    REFERENCES dbo.sefip (id);

ALTER TABLE dbo.vinculo
    ADD CONSTRAINT fk_vinculo__sefip__02
    FOREIGN KEY (ocorrencia_sefip_id)
    REFERENCES dbo.sefip (id);

ALTER TABLE dbo.vinculo
    ADD CONSTRAINT fk_vinculo__tipo_contrato__01
    FOREIGN KEY (tipo_contrato_id)
    REFERENCES dbo.tipo_contrato (id);

ALTER TABLE dbo.vinculo
    ADD CONSTRAINT fk_vinculo__vinculo__01
    FOREIGN KEY (vinculo_apos_id)
    REFERENCES dbo.vinculo (id);

ALTER TABLE dbo.vinculo_verba
    ADD CONSTRAINT fk_vinculo_verba__verba__01
    FOREIGN KEY (verba_id)
    REFERENCES dbo.verba (id);

ALTER TABLE dbo.vinculo_verba
    ADD CONSTRAINT fk_vinculo_verba__vinculo__01
    FOREIGN KEY (vinculo_id)
    REFERENCES dbo.vinculo (id);
