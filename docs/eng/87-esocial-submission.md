# Submissao eSocial SOAP

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** ES-08, envio de lotes SOAP, WS-Security, mTLS e circuit breaker.

## Decisao

O `sgp-esocial-worker` deixa de usar adapter sandbox para submissao e passa a operar pelo submodulo `backend/src/esocial-worker/submission/`. O fluxo oficial agrupa eventos `public.esocial_event` ja validados e assinados pelo ES-07, cria uma linha em `esocial.submission_batch`, monta o lote `EnviarLoteEventos`, assina o envelope SOAP com WS-Security e transmite por mTLS usando o PKCS#12 ativo do tenant em `esocial.tenant_certificate`.

## Endpoints

O ambiente e controlado por `ESOCIAL_ENV=QUALIFICATION|PRODUCTION`. `ESOCIAL_ENDPOINT_ENVIO` aponta para o WSDL/endpoint de envio de lotes e `ESOCIAL_ENDPOINT_CONSULTA` fica reservado para ES-09. O repositorio commita somente valores de qualificacao em `backend/.env.example`; endpoints ou credenciais de producao devem vir de secret manager/runtime.

## Seguranca SOAP

Ha duas assinaturas distintas. O XML interno do evento continua assinado pelo ES-07 com XML-DSig enveloped. O ES-08 assina o envelope SOAP com WS-Security, incluindo `Timestamp`, `BinarySecurityToken` X.509 e referencias assinadas ao `Body` e ao `Timestamp`. A camada TLS usa `https.Agent({ pfx, passphrase })` com o PKCS#12 recuperado pelo `CertificateStoreService`.

## Persistencia

`esocial.submission_batch` registra tenant, lote, ambiente, endpoint, ids dos eventos, hashes SHA-256 de request/response, status HTTP, status operacional, tentativas e proximo retry. A tabela forca RLS por `tenant_id` com `sgp_tenant_matches(tenant_id)` e permissoes `esocial.submission.read`/`esocial.submission.retry`. `esocial.endpoint_circuit_state` e global, legivel por operadores de submissao e mutavel apenas pelo worker via bypass RLS.

## Retry e Circuit Breaker

Falhas de timeout, HTTP 429/5xx e faults transitorios de processamento entram em `RETRY`/`TIMEOUT` com backoff exponencial e jitter. Faults definitivos entram em `REJECTED`. O circuit breaker abre apos falhas consecutivas configuradas por endpoint e passa para `HALF_OPEN` apos cooldown antes de permitir nova tentativa.

## Testes

Os testes usam WSDL stub commitado em `backend/src/esocial-worker/submission/__fixtures__/ws-enviar-lote-eventos.wsdl` e servidor local. O cliente bloqueia endpoints `gov.br` quando executado em Jest, garantindo que CI nao faca chamada real ao Ambiente Nacional.

## Apendice ES-09: classificacao de retorno

O retorno do envio apenas confirma a recepcao do lote e grava `public.esocial_event.protocol_number`. A sincronizacao final ocorre no ES-09 ao parsear `ConsultarLoteEventos`: cada `cdResposta` e consultado em `esocial.response_classification` e roteado para `ACCEPTED`, `RECOVERABLE` ou `DEFINITIVE`.

Codigos `201` e `202` atualizam o evento para `PROCESSADO_COM_SUCESSO`, gravam `receipt_number`, `response_code`, `response_description`, `response_errors` e `last_response_at`, e removem qualquer retry pendente. Codigos recuperaveis (`101`, `301`, `407`, `408`, `409`, `410`) mantem o evento em `ERRO_TECNICO_RETENTAVEL` e criam `esocial.event_retry_schedule` com backoff exponencial. Codigos definitivos (`401` a `406`, `411`, `501` a `505`) marcam `ERRO_DEFINITIVO`, preservam as ocorrencias para a fila administrativa e nao geram retry automatico.
