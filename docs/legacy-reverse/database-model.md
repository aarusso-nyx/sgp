# Inferred Database Model

Generated at: 2026-04-16T21:59:42.223Z
Total inferred tables: 69

Confidence legend: `observed`, `inferred`, `unverified`.

## Tables

### anexo
- Status: inferred
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: inventories/api-calls.json
- Columns:
  - 105_imagem_sistema_brasao_detran1_png (inferred)
  - 330_imagem_sistema_detran_hor_2_cor2_png (inferred)
  - download_file (inferred)
  - id (inferred)
- Foreign keys: none inferred

### arquivo_remessa_pagamento
- Status: observed
- Primary key: arquivo_remessa_pagamento_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/001-arquivoremessapagamento-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - competencia (observed)
  - data_criacao (observed)
  - data_pagamento (observed)
  - filial (observed)
  - motivo (observed)
  - situacao (observed)
  - tipo_de_processamento (observed)
- Foreign keys:
  - filial -> filial.id (unverified)

### auditoria
- Status: observed
- Primary key: auditoria_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/002-auditoria-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - data (observed)
  - operacao (observed)
  - periodo_final (observed)
  - periodo_inicial (observed)
  - tabela (observed)
  - usuario (observed)
- Foreign keys:
  - usuario -> usuario.id (unverified)

### banco
- Status: observed
- Primary key: banco_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/003-banco-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - bloqueado (observed)
  - digito (observed)
  - nome_da_agencia (observed)
  - numero (observed)
- Foreign keys: none inferred

### batimento_folha_pagamento
- Status: observed
- Primary key: batimento_folha_pagamento_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/004-batimentofolhapagamento-relatorio.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### cargo
- Status: observed
- Primary key: codigo (inferred)
- PK rationale: Likely key based on naming convention (codigo/*_id).
- Evidence: playwright/reports/deep/005-cargo-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - codigo (observed)
  - descricao (observed)
  - nome (observed)
- Foreign keys: none inferred

### causa_afastamento
- Status: observed
- Primary key: codigo (inferred)
- PK rationale: Likely key based on naming convention (codigo/*_id).
- Evidence: playwright/reports/deep/006-causaafastamento-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - codigo (observed)
  - descricao (observed)
- Foreign keys: none inferred

### centro_custo
- Status: observed
- Primary key: centro_custo_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/007-centrocusto-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### classificacao_ato
- Status: observed
- Primary key: classificacao_ato_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/008-classificacaoato-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### competencia
- Status: inferred
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: inventories/api-calls.json
- Columns:
  - ano (inferred)
  - id (inferred)
- Foreign keys: none inferred

### contador_notificacao
- Status: inferred
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: inventories/api-calls.json
- Columns:
  - id (inferred)
- Foreign keys: none inferred

### convenio
- Status: observed
- Primary key: codigo (inferred)
- PK rationale: Likely key based on naming convention (codigo/*_id).
- Evidence: playwright/reports/deep/009-convenio-gestao.png, playwright/reports/deep/010-convenios-estagiario.png, playwright/reports/deep/011-convenios-instituicaoensino.png, playwright/reports/deep/012-convenios-programa.png, playwright/reports/devtools-nav.png
- Columns:
  - cnpj (observed)
  - codigo (observed)
  - data_final (observed)
  - data_inicio (observed)
  - descricao (observed)
  - endereco (observed)
  - instituicao (observed)
  - nome (observed)
  - programa (observed)
- Foreign keys:
  - programa -> programa.id (unverified)

### dado_cadastral_complementar
- Status: observed
- Primary key: dado_cadastral_complementar_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/013-dadocadastralcomplementar-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### definicao_organico
- Status: observed
- Primary key: definicao_organico_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/014-definicaoorganico-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### dependente
- Status: observed
- Primary key: dependente_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/015-dependente-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - filial (observed)
  - funcion_a_rio (observed)
  - matricula (observed)
  - nome_do_funcion_a_rio (observed)
  - quantidade_de_dependente (observed)
- Foreign keys:
  - filial -> filial.id (unverified)

### dia_util
- Status: observed
- Primary key: dia_util_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/016-diautil-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### empresa_filial
- Status: observed
- Aliases merged: empresa_filial, empresa_nao_matrize_ativa
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: playwright/reports/deep/017-empresafilial-gestao.png, playwright/reports/devtools-nav.png, inventories/api-calls.json
- Columns:
  - empresa_filial (observed)
  - id (inferred)
  - nome_sigla (observed)
  - sigla (observed)
  - tipo_de_filial (observed)
- Foreign keys: none inferred

### enum
- Status: inferred
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: inventories/api-calls.json
- Columns:
  - id (inferred)
  - nome_enum (inferred)
- Foreign keys: none inferred

### experiencia_profissional
- Status: observed
- Primary key: experiencia_profissional_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/018-experienciaprofissional-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - funcionario (observed)
- Foreign keys: none inferred

### exportacao_arquivo
- Status: observed
- Primary key: exportacao_arquivo_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/019-exportacaoarquivo-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - tipo_arquivo (observed)
- Foreign keys: none inferred

### faixa_salarial
- Status: observed
- Primary key: faixa_salarial_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/020-faixasalarial-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - classe (observed)
  - faixa_salarial (observed)
  - grupo (observed)
- Foreign keys: none inferred

### feria_programacao
- Status: observed
- Primary key: feria_programacao_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/021-feriasprogramacao-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### ficha_financeira
- Status: observed
- Primary key: ficha_financeira_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/022-fichafinanceira-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - cpf (observed)
  - filial (observed)
  - funcionario (observed)
  - lotacao (observed)
  - matricula (observed)
  - nome_do_funcionario (observed)
  - situacao_funcional (observed)
- Foreign keys:
  - filial -> filial.id (unverified)
  - lotacao -> lotacao.id (unverified)
  - situacao_funcional -> situacao_funcional.id (unverified)

### filial
- Status: inferred
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: inventories/api-calls.json
- Columns:
  - id (inferred)
- Foreign keys: none inferred

### folha_pagamento
- Status: observed
- Primary key: folha_pagamento_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/023-folhapagamento-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### frequencia
- Status: observed
- Primary key: frequencia_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/024-frequencia-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - ano (observed)
  - funcionario (observed)
- Foreign keys: none inferred

### funcao
- Status: observed
- Primary key: funcao_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/025-funcao-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### funcionario
- Status: observed
- Primary key: funcionario_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/026-funcionario-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - cpf (observed)
  - filial (observed)
  - funcionario (observed)
  - matricula (observed)
  - nome (observed)
  - situacao_funcional (observed)
  - vinculo (observed)
- Foreign keys:
  - filial -> filial.id (unverified)
  - situacao_funcional -> situacao_funcional.id (unverified)
  - vinculo -> vinculo.id (unverified)

### historico_situacao_funcional
- Status: observed
- Primary key: historico_situacao_funcional_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/027-historicosituacaofuncional-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - filial (observed)
  - funcionario (observed)
  - matricula (observed)
  - nome (observed)
  - situacao_atual (observed)
  - vinculo (observed)
- Foreign keys:
  - filial -> filial.id (unverified)
  - vinculo -> vinculo.id (unverified)

### importacao_consignado
- Status: observed
- Primary key: importacao_consignado_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/028-importacaoconsignado.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### importador_verba_funcionario
- Status: inferred
- Primary key: importador_verba_funcionario_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### legislacao
- Status: observed
- Primary key: legislacao_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/029-legislacao-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - ano_da_norma (observed)
  - detalhamento_da_norma (observed)
  - no_da_norma (observed)
  - tipo_da_norma (observed)
  - tipo_de_ente_federado (observed)
- Foreign keys: none inferred

### licenca_premio
- Status: observed
- Primary key: licenca_premio_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/030-licencapremio-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### login
- Status: inferred
- Primary key: login_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### lotacao
- Status: observed
- Primary key: lotacao_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/031-lotacao-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### menu
- Status: inferred
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: inventories/api-calls.json
- Columns:
  - gestao (inferred)
  - id (inferred)
  - papel (inferred)
- Foreign keys: none inferred

### motivo
- Status: observed
- Primary key: motivo_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/032-motivo-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - descricao (observed)
  - evento (observed)
  - tipo (observed)
- Foreign keys: none inferred

### motivo_afastamento
- Status: observed
- Primary key: motivo_afastamento_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/033-motivoafastamento-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### motivo_desligamento
- Status: observed
- Primary key: codigo (inferred)
- PK rationale: Likely key based on naming convention (codigo/*_id).
- Evidence: playwright/reports/deep/034-motivodesligamento-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - codigo (observed)
  - descricao (observed)
- Foreign keys: none inferred

### natureza_funcao
- Status: observed
- Primary key: natureza_funcao_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/035-naturezafuncao-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### natureza_juridica
- Status: observed
- Primary key: codigo (inferred)
- PK rationale: Likely key based on naming convention (codigo/*_id).
- Evidence: playwright/reports/deep/036-naturezajuridica-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - codigo (observed)
  - grupamento (observed)
  - nome (observed)
- Foreign keys: none inferred

### nivel_salarial_historico
- Status: observed
- Primary key: nivel_salarial_historico_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/037-nivelsalarialhistorico-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - codigo_do_nivel (observed)
  - descricao (observed)
  - descricao_do_nivel (observed)
  - total_de_ajuste (observed)
- Foreign keys: none inferred

### notificacao
- Status: inferred
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: playwright/reports/devtools-nav.png, inventories/api-calls.json
- Columns:
  - id (inferred)
  - page (inferred)
  - size (inferred)
- Foreign keys: none inferred

### page
- Status: observed
- Primary key: page_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/038-page-home.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### parametro_sistema
- Status: observed
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: playwright/reports/deep/039-parametrosistema-gestao.png, playwright/reports/devtools-nav.png, inventories/api-calls.json
- Columns:
  - frase_inicial_sistema (observed); constraints=required|maxlength:500
  - id (inferred)
  - sigla_sistema (observed); constraints=required|maxlength:20
- Foreign keys: none inferred

### perfil
- Status: inferred
- Primary key: perfil_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### perfil_acesso
- Status: observed
- Primary key: perfil_acesso_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/040-perfilacesso-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - data_de_criacao (observed)
  - nome (observed)
  - permissao (observed)
- Foreign keys: none inferred

### programa
- Status: inferred
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: inventories/api-calls.json
- Columns:
  - id (inferred)
  - programa (inferred)
- Foreign keys: none inferred

### referencia_salarial
- Status: observed
- Primary key: codigo (inferred)
- PK rationale: Likely key based on naming convention (codigo/*_id).
- Evidence: playwright/reports/deep/041-referenciasalarial-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - codigo (observed)
  - descricao (observed)
  - valor (observed)
- Foreign keys: none inferred

### relatorio
- Status: observed
- Primary key: relatorio_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/042-relatorio-financeiro-gestao.png, playwright/reports/deep/045-relatorios-estagio.png, playwright/reports/deep/046-relatorios-relatoriorepassefundorh.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### relatorio_folha_pagamento
- Status: observed
- Primary key: relatorio_folha_pagamento_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/043-relatoriofolhapagamento-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - ano (observed)
  - filial (observed)
  - filtro_competencia (observed)
  - tipo_processamento (observed)
- Foreign keys:
  - filial -> filial.id (unverified)

### relatorio_gerencial
- Status: observed
- Primary key: codigo (inferred)
- PK rationale: Likely key based on naming convention (codigo/*_id).
- Evidence: playwright/reports/deep/044-relatoriogerencial-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - codigo (observed)
  - filial (observed)
  - qtd_funcionario (observed)
  - relatorio_gerencial_filtro_ano (observed)
  - relatorio_gerencial_filtro_competencia (observed)
  - tipo_processamento (observed)
  - total_de_desconto (observed)
  - total_de_provento (observed)
  - total_liquido (observed)
  - valor_medio (observed)
- Foreign keys:
  - filial -> filial.id (unverified)

### relatorio_servidor_pag_bloqueado
- Status: observed
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: playwright/reports/deep/047-relatorioservidorpagbloqueado-gestao.png, playwright/reports/devtools-nav.png, inventories/api-calls.json
- Columns:
  - data_nascimento (observed); constraints=required
  - empresa (inferred)
  - filial (inferred)
  - funcional (inferred)
  - fundo_selecionado (observed)
  - id (inferred)
  - pensao_alimenticia (observed)
  - pensionista (observed)
  - servidor_selecionado (observed); constraints=required
  - situacao (inferred)
  - situacao_funcional_selecionada (observed)
- Foreign keys:
  - empresa -> empresa.id (unverified)
  - filial -> filial.id (unverified)

### responsavel_legal
- Status: observed
- Primary key: responsavel_legal_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/048-responsavellegal-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### sindicato
- Status: observed
- Primary key: sindicato_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/049-sindicato-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - cnpj (observed)
  - descricao (observed)
- Foreign keys: none inferred

### situacao_funcional
- Status: observed
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: playwright/reports/deep/050-situacaofuncional-gestao.png, playwright/reports/devtools-nav.png, inventories/api-calls.json
- Columns:
  - codigo (observed)
  - descricao (observed)
  - entra_folha (inferred)
  - entra_na_folha (observed)
  - id (inferred)
  - modalidade (observed)
  - tipo (observed)
- Foreign keys: none inferred

### tempo_servico
- Status: observed
- Primary key: tempo_servico_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/051-temposervico-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - funcionario (observed)
- Foreign keys: none inferred

### tipo_contrato
- Status: observed
- Primary key: tipo_contrato_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/052-tipocontrato-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - nome (observed)
- Foreign keys: none inferred

### tipo_documento
- Status: observed
- Primary key: tipo_documento_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/053-tipodocumento-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - descricao (observed)
- Foreign keys: none inferred

### tipo_feria
- Status: observed
- Primary key: tipo_feria_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/054-tipoferias-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### tipo_folha
- Status: observed
- Primary key: codigo (inferred)
- PK rationale: Likely key based on naming convention (codigo/*_id).
- Evidence: playwright/reports/deep/055-tipofolha-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - codigo (observed)
  - descricao (observed)
- Foreign keys: none inferred

### tipo_processamento
- Status: observed
- Primary key: codigo (inferred)
- PK rationale: Likely key based on naming convention (codigo/*_id).
- Evidence: playwright/reports/deep/056-tipoprocessamento-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - codigo (observed)
  - descricao (observed)
  - tipo_folha (observed)
  - vinculo_s (observed)
- Foreign keys: none inferred

### transferencia_funcionario
- Status: observed
- Primary key: transferencia_funcionario_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/057-transferenciafuncionario-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - cpf (observed)
  - filial_atual (observed)
  - funcionario (observed)
  - lotacao (observed)
  - matricula (observed)
  - nome (observed)
- Foreign keys:
  - lotacao -> lotacao.id (unverified)

### turno
- Status: observed
- Primary key: codigo (inferred)
- PK rationale: Likely key based on naming convention (codigo/*_id).
- Evidence: playwright/reports/deep/058-turno-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - codigo (observed)
  - descricao (observed)
  - horario (observed)
  - jornada_diaria_h (observed)
  - turno_ativo (observed)
- Foreign keys: none inferred

### usuario
- Status: observed
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: playwright/reports/deep/059-usuario-gestao.png, playwright/reports/devtools-nav.png, inventories/api-calls.json
- Columns:
  - ativo (observed)
  - cpf (observed)
  - id (inferred)
  - login (observed)
  - nome (observed)
  - role (inferred)
  - verifica_permissao (inferred)
- Foreign keys: none inferred

### vale_transporte
- Status: observed
- Primary key: vale_transporte_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/060-valetransporte-gestao.png, playwright/reports/devtools-nav.png
- Columns:
- Foreign keys: none inferred

### verba
- Status: observed
- Primary key: codigo (inferred)
- PK rationale: Likely key based on naming convention (codigo/*_id).
- Evidence: playwright/reports/deep/061-verba-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - ativa (observed)
  - codigo (observed)
  - descricao (observed)
- Foreign keys: none inferred

### verba_funcionario
- Status: observed
- Primary key: verba_funcionario_id (unverified)
- PK rationale: Fallback convention; no direct key-like column observed.
- Evidence: playwright/reports/deep/062-verbasfuncionario-gestao.png, playwright/reports/devtools-nav.png
- Columns:
  - funcionario (observed)
- Foreign keys: none inferred

### vinculo
- Status: observed
- Primary key: id (observed)
- PK rationale: Column observed in screen fields/table headers.
- Evidence: playwright/reports/deep/063-vinculo-gestao.png, playwright/reports/devtools-nav.png, inventories/api-calls.json
- Columns:
  - id (inferred)
- Foreign keys: none inferred
