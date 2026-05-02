# PONTO-02 - Ingestao REP-P, REP-A e REP-C

Este corte implementa a entrada operacional de marcacoes dos registradores previstos na Portaria MTP 671/2021. O desenho fisico permanece em ingles no schema `ponto`, enquanto os fluxos de produto preservam os termos REP-P, REP-A, REP-C, AFDT e NSR.

## Equipamentos

Cada equipamento fica em `ponto.rep_device` com `tenant_id`, tipo (`REP_P`, `REP_A`, `REP_C`), identificacao fiscal do empregador, fabricante/modelo, status e dados especificos. `REP_C` exige `serial_number` unico por tenant. `REP_P` exige `program_hash`, usado tambem como segredo de validacao HMAC do stream JSON do programa de tratamento.

## Lotes

Cada recepcao cria um registro em `ponto.rep_ingestion_batch` com hash SHA-256 do conteudo original, nome do arquivo, status e resumo de erros. O conteudo original e preservado em `raw_file` para download administrativo. As linhas aceitas entram em `ponto.rep_ingestion_line` com `batch_id`, `rep_device_id`, `line_no`, `nsr`, `raw_line`, `parsed`, `dedup_key` e o `time_record_id` gerado.

## AFDT e REP-P

Para REP-A e REP-C, o backend aceita AFDT textual em linhas delimitadas por `;` ou `|` com `NSR;identificador_servidor;data;hora;evento`. O identificador pode ser UUID do servidor, CPF ou matricula. Para REP-P, o endpoint aceita `records[]` em JSON com NSR, servidor e data/hora; a assinatura HMAC-SHA256 sobre o JSON canonico precisa bater com o `program_hash` cadastrado.

## NSR, deduplicacao e cadeia de hash

A deduplicacao e feita por `(tenant_id, rep_device_id, nsr)`. Um reenvio integral de arquivo ja processado termina como `PROCESSED` com `duplicate=true` e sem novas marcacoes. Um lote com NSR retrocedendo dentro do proprio arquivo ou tentando inserir NSR novo menor que o historico do equipamento e rejeitado inteiro, com `error_summary` preenchido. Linhas aceitas sao convertidas para `ponto.time_record` com origem `REP_P`, `REP_A` ou `REP_C`, reutilizando `TimeRecordHashService` para manter a cadeia `prev_hash`/`record_hash`.

## Seguranca e auditoria

As tabelas novas forcam RLS com `sgp_tenant_matches(tenant_id)` e as permissoes `ponto.rep.read`, `ponto.rep.write` e `ponto.timerecord.write`. Mutacoes de equipamento, lote e linha chamam `sgp_append_audit_event(...)` por trigger de banco, e os controllers mutaveis exigem `@RequirePermission('ponto.rep.write')`.
