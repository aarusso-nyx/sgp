# Submissao eSocial SOAP

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** ES-08, envio de lotes SOAP, WS-Security, mTLS e circuit breaker.

## Decisao

O `sgp-esocial-worker` deixa de usar adapter sandbox para submissao e passa a operar pelo submodulo `source/backend/src/esocial-worker/submission/`. O fluxo oficial agrupa eventos `public.esocial_event` ja validados e assinados pelo ES-07, cria uma linha em `esocial.submission_batch`, monta o lote `EnviarLoteEventos`, assina o envelope SOAP com WS-Security e transmite por mTLS usando o PKCS#12 ativo do tenant em `esocial.tenant_certificate`.

## Endpoints

O ambiente e controlado por `ESOCIAL_ENV=QUALIFICATION|PRODUCTION`. `ESOCIAL_ENDPOINT_ENVIO` aponta para o WSDL/endpoint de envio de lotes e `ESOCIAL_ENDPOINT_CONSULTA` fica reservado para ES-09. O repositorio commita somente valores de qualificacao em `.env.example`; endpoints ou credenciais de producao devem vir de secret manager/runtime.

## Seguranca SOAP

Ha duas assinaturas distintas. O XML interno do evento continua assinado pelo ES-07 com XML-DSig enveloped. O ES-08 assina o envelope SOAP com WS-Security, incluindo `Timestamp`, `BinarySecurityToken` X.509 e referencias assinadas ao `Body` e ao `Timestamp`. A camada TLS usa `https.Agent({ pfx, passphrase })` com o PKCS#12 recuperado pelo `CertificateStoreService`.

## Persistencia

`esocial.submission_batch` registra tenant, lote, ambiente, endpoint, ids dos eventos, hashes SHA-256 de request/response, status HTTP, status operacional, tentativas e proximo retry. A tabela forca RLS por `tenant_id` com `sgp_tenant_matches(tenant_id)` e permissoes `esocial.submission.read`/`esocial.submission.retry`. `esocial.endpoint_circuit_state` e global, legivel por operadores de submissao e mutavel apenas pelo worker via bypass RLS.

## Retry e Circuit Breaker

Falhas de timeout, HTTP 429/5xx e faults transitorios de processamento entram em `RETRY`/`TIMEOUT` com backoff exponencial e jitter. Faults definitivos entram em `REJECTED`. O circuit breaker abre apos falhas consecutivas configuradas por endpoint e passa para `HALF_OPEN` apos cooldown antes de permitir nova tentativa.

## Testes

Os testes usam WSDL stub commitado em `source/backend/src/esocial-worker/submission/__fixtures__/ws-enviar-lote-eventos.wsdl` e servidor local. O cliente bloqueia endpoints `gov.br` quando executado em Jest, garantindo que CI nao faca chamada real ao Ambiente Nacional.
