-- Worker B output: standalone SQL Server indexes translated to PostgreSQL.
-- Source inventory: sql/00_inventory/raw/indexes.json
-- Constraint-backed PK/UQ indexes listed in sql/00_inventory/raw/key_constraints.json
-- are intentionally excluded because they are implied by explicit constraints.
-- Inventory confirms 0 filtered indexes, 0 INCLUDE indexes, and 0 non-default
-- fillfactor values in this worker scope.

CREATE UNIQUE INDEX uk_area_formacao ON dbo.area_formacao USING btree (area_formacao);
CREATE UNIQUE INDEX uk_banco_codigo ON dbo.banco USING btree (codigo);
CREATE UNIQUE INDEX uk_banco_nome ON dbo.banco USING btree (nome);
CREATE UNIQUE INDEX uk_cargo_nome ON dbo.cargo USING btree (nome);

-- Source name suggests uniqueness, but frozen inventory marks this as non-unique.
CREATE INDEX uk_categoria_doenca_codigo ON dbo.categoria_doenca USING btree (codigo);
CREATE UNIQUE INDEX uk_categoria_doenca_descricao ON dbo.categoria_doenca USING btree (descricao);
CREATE UNIQUE INDEX uk_categoria_profissional_codigo ON dbo.categoria_profissional USING btree (codigo);
CREATE UNIQUE INDEX uk_categoria_profissional_descricao ON dbo.categoria_profissional USING btree (descricao);
CREATE UNIQUE INDEX uk_cbo_codigo ON dbo.cbo USING btree (codigo);
CREATE UNIQUE INDEX uk_cbo_nome ON dbo.cbo USING btree (nome);
CREATE UNIQUE INDEX uk_classificacao_internacional_doenca_codigo ON dbo.classificacao_internacional_doenca USING btree (codigo);
CREATE UNIQUE INDEX uk_classificacao_internacional_doenca_descricao ON dbo.classificacao_internacional_doenca USING btree (descricao);
CREATE UNIQUE INDEX uk_crm_crea_nome_conveniado ON dbo.crm_crea USING btree (nome_conveniado);
CREATE UNIQUE INDEX uk_crm_crea_nome_numero_crm_crea ON dbo.crm_crea USING btree (numero_crm_crea);
CREATE UNIQUE INDEX uk_esocial_descricao ON dbo.esocial USING btree (descricao);
CREATE INDEX flyway_schema_history_s_idx ON dbo.flyway_schema_history USING btree (success);
CREATE UNIQUE INDEX uk_funcionario_matricula ON dbo.funcionario USING btree (matricula);
CREATE UNIQUE INDEX uk_funcionario_nome ON dbo.funcionario USING btree (nome);
CREATE UNIQUE INDEX uk_grupo_salarial_nome ON dbo.grupo_salarial USING btree (nome);
CREATE UNIQUE INDEX uk_menu_nome ON dbo.menu USING btree (nome);
CREATE UNIQUE INDEX uk_modelo_documento_descricao ON dbo.modelo_documento USING btree (descricao);
CREATE UNIQUE INDEX uk_natureza_funcao_descricao ON dbo.natureza_funcao USING btree (descricao);

-- Source defines this standalone unique index in addition to the PK backing index.
CREATE UNIQUE INDEX pensao_alimenticia_id_uindex ON dbo.pensao_alimenticia USING btree (id);

-- Source name suggests uniqueness, but frozen inventory marks this as non-unique.
CREATE INDEX uk_nivel_salarial_codigo ON dbo.referencia_salarial USING btree (codigo);
CREATE UNIQUE INDEX uk_sub_categoria_doenca_codigo ON dbo.sub_categoria_doenca USING btree (codigo);
CREATE UNIQUE INDEX uk_sub_categoria_doenca_descricao ON dbo.sub_categoria_doenca USING btree (descricao);
CREATE UNIQUE INDEX uk_tipo_contrato_nome ON dbo.tipo_contrato USING btree (nome);
CREATE UNIQUE INDEX uk_tipo_processamento_codigo ON dbo.tipo_processamento USING btree (codigo);
CREATE UNIQUE INDEX uk_tipo_processamento_descricao ON dbo.tipo_processamento USING btree (descricao);

-- Source defines this standalone unique index in addition to the PK backing index.
CREATE UNIQUE INDEX transferencia_funcionario_id_uindex ON dbo.transferencia_funcionario USING btree (id);

CREATE UNIQUE INDEX uk_turno_codigo ON dbo.turno USING btree (codigo);
CREATE UNIQUE INDEX uk_usuario_login ON dbo.usuario USING btree (login);
CREATE UNIQUE INDEX uk_verba_codigo ON dbo.verba USING btree (codigo);
CREATE UNIQUE INDEX uk_verba_descricao_verba ON dbo.verba USING btree (descricao_verba);
CREATE UNIQUE INDEX uk_fk_vinculo_descricao ON dbo.vinculo USING btree (descricao);
