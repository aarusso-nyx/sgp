# DIRF Anual

**Escopo:** FISC-02 — geracao anual de DIRF para rendimentos de terceiros ainda nao substituidos pelo S-1210/eSocial.

## Escopo funcional

A DIRF do SGP cobre apenas pagamentos a terceiros: autonomos nao empregados, pessoas juridicas, beneficiarios no exterior e outros rendimentos retidos fora da folha de empregados. A folha mensal de servidores segue coberta por CALC-11 e ES-04/S-1210, e nao e fonte deste arquivo.

O modulo le `payment.dirf_payment_source`, agrega por ano-base, tenant, beneficiario e codigo de receita, e grava o resultado em `fiscal.dirf_arquivo`, `fiscal.dirf_beneficiario` e `fiscal.dirf_pagamento`. O arquivo TXT fica em `txt_content` para os gates locais e em `txt_ref` como referencia auditavel de armazenamento externo.

## Leiaute e validacao

`layout_version` e obrigatorio e segue o formato `DIRF-RFB-2.060/{ano-base}`. A referencia normativa da transicao e a IN RFB 2.060/2021 e os leiautes anuais publicados pela Receita Federal/e-CAC para o PGD DIRF do ano-base. O validador automatico do SGP verifica ordem dos registros, cabecalho, abertura, beneficiarios, pagamentos, totalizadores e encerramento. A regressao final contra o PGD oficial permanece manual: o TXT gerado deve ser importado no PGD DIRF do ano-base e a evidencia operacional deve registrar o resultado antes da entrega.

## Retificadora

Arquivos `RETIFICADORA` exigem `original_arquivo_id` apontando para a DIRF original do mesmo tenant. A regra e aplicada por DTO/API e por constraint fisica em `fiscal.dirf_arquivo`; nao existe retificadora solta no v0.0.1.

## Seguranca e auditoria

As tabelas DIRF sao tenant-scoped, usam RLS forcado por `tenant_id` com `sgp_tenant_matches(tenant_id)` e `sgp_has_any_permission(...)`, e exigem as permissoes canonicas `fiscal.dirf.read` e `fiscal.dirf.write`. Toda mutacao dispara trigger com `public.sgp_append_audit_event(...)`, e a geracao pelo controller tambem registra evento `EXPORT` com ano-base, tipo, versao de leiaute, hash TXT e totalizadores.

## Fora do escopo

- DIRF de folha de empregados substituida pelo S-1210.
- Transmissao automatica a RFB ou Receitanet.
- Conversao de moeda para beneficiario no exterior; o valor entra ja convertido em reais.
