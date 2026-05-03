# PONTO-03 - AFD Geracao e Importacao

Este corte implementa o Arquivo Fonte de Dados (AFD) como artefato fiscal do modulo `ponto`, com desenho fisico em ingles e operacao alinhada a Portaria MTP 671/2021 para cabecalho, registros de detalhe, marcacoes e trailer com selo SHA-256.

## Modelo de Dados

`ponto.afd_export` registra solicitacoes de geracao por equipamento REP e periodo, com `object_store_key`, hash SHA-256, quantidade de linhas, usuario solicitante e status `GENERATING`, `READY` ou `FAILED`. `ponto.afd_import` registra arquivos recebidos de sistemas externos com `object_store_key`, hash, quantidade de linhas, status `PENDING`, `PROCESSED` ou `REJECTED` e resumo estruturado de erros. `ponto.afd_import_line` preserva as linhas parseadas, NSR, tipo de registro, payload e vinculo com `ponto.time_record` quando a linha e uma marcacao tipo 4.

Os metadados nao armazenam o AFD como blob inline. A chave `object_store_key` e o identificador estavel para armazenamento externo ou reconstituicao controlada. As linhas importadas sao mantidas como evidencia parseada para viabilizar auditoria e round-trip byte-identico.

## Layout e Selo

O backend define registros fixos de 256 caracteres para os tipos 1 a 9 em `afd-layout.ts`. O tipo 1 identifica empregador, periodo e versao do layout; o tipo 4 representa marcacao de ponto com NSR, servidor, data/hora, origem REP e hash da marcacao; o tipo 9 fecha o arquivo com periodo, contagem de linhas e SHA-256 calculado sobre as linhas anteriores.

Na importacao, o parser valida largura fixa, NSR, tipo de registro, contagem do trailer e selo SHA-256 do registro tipo 9. Selo invalido nao cria marcacoes e finaliza `ponto.afd_import` como `REJECTED` com `error_summary`.

## Geracao e Round-Trip

A geracao recebe `rep_device_id`, `period_start` e `period_end`, emite stream de linhas e ordena marcacoes por NSR. Quando o periodo corresponde a um AFD importado e processado, a geracao usa as linhas preservadas em `ponto.afd_import_line`, mantendo round-trip byte-identico. Quando nao ha importacao previa, o arquivo e montado a partir de `ponto.time_record`; periodos sem marcacoes geram AFD valido com apenas tipo 1 e tipo 9.

Linhas tipo 4 importadas sao convertidas para `ponto.time_record` usando a cadeia `TimeRecordHashService`, preservando `prev_hash` e `record_hash` do modelo PONTO-01.

## AFDT e ACJEF

R2-82 adiciona extratos fiscais AFDT e ACJEF gerados pelo backend a partir do mesmo corte de `rep_device_id`, `period_start` e `period_end` usado no AFD. A Portaria MTP 671/2021 usa o AEJ como arquivo vigente de jornada; por isso este corte nao redefine versao regulatoria externa nem substitui o AFD/AEJ. Os arquivos AFDT/ACJEF do SGP sao saídas deterministicas de fiscalizacao/historico para fechar o residual de aderencia apontado no round-1.

`POST /api/v1/ponto/afd/afdt` retorna um flat-file UTF-8 com cabecalho `AFDT`, linhas `AFDT-DETAIL` ordenadas por NSR a partir de `ponto.time_record`, e trailer com SHA-256 das linhas anteriores. Cada detalhe preserva NSR, instante, origem REP, equipamento, servidor, matricula, CPF, nome e hash da marcacao.

`POST /api/v1/ponto/afd/acjef` retorna um flat-file UTF-8 com cabecalho `ACJEF`, linhas `ACJEF-SUMMARY` por servidor e trailer com SHA-256. Cada resumo usa `ponto.fn_aggregate_timesheet(...)` para consolidar minutos trabalhados, esperados, extras, noturnos, atrasos, ausencias abonadas/nao abonadas e acertos de banco de horas do periodo.

## Seguranca e Auditoria

As tabelas `ponto.afd_export`, `ponto.afd_import` e `ponto.afd_import_line` forcam RLS com `sgp_tenant_matches(tenant_id)` e permissoes `ponto.afd.read` / `ponto.afd.write`. Todas as mutacoes disparam `sgp_append_audit_event(...)` por trigger de banco, e os endpoints mutaveis exigem `@RequirePermission('ponto.afd.write')`. As rotas AFDT/ACJEF nao persistem artefato nem alteram estado; elas reutilizam `ponto.afd.read`.
