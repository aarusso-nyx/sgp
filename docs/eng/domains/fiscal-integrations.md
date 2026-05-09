# Fiscal And Integrations Domain Authority

Authored domain authority for eSocial, EFD-Reinf, DCTFWeb, DIRF, SIAFIC, TCE, signatures, queues, and official exports.

## Merged Artifact Index

- DCTFWeb
- DIRF Anual
- Hub de Validação e Assinatura eSocial
- Eventos de Tabelas e Cadastro eSocial
- EFD-Reinf R-4000
- Submissao eSocial SOAP
- Reintegracao S-2298
- Parser de Retorno eSocial
- SIAFIC integration
- TS-V - Alteração Contratual S-2306
- Contrato Pluggável TCE/TCM/TCU
- Catálogo de Estados e Leiautes TCE
- TCE-03 — Adapter de Referencia AUDESP/SP
- TCE-04 Fila de Submissao
- TCE RREO/RGF Fiscal Report Builders
- Gov.br Advanced Signature Sandbox
- TCE State Source-Pending Adapters
- Official Fiscal Export Primitives
- Adapter Mock Queue Contract
- Mock TCE Relay
- Mock eSocial Relay

## Regulatory References Cross-Reference

This table closes the Round 3 regulatory-adherence recommendation by mapping
each obligation-level cached reference under `docs/refs/**` to implementation
or retained decision evidence. Raw primary-source dumps under
`docs/refs/**/law/**` are intentionally excluded from the orphan check because
they are cited through the obligation summaries below.

### eSocial and RFB cluster

| Reference                                         | Obligation cluster                                                                        | Implementation / evidence path:line                                          | Current posture                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `docs/refs/esocial/00-index.md`                   | eSocial S-1.3 family index                                                                | backend/src/integrations/stynx-esocial/stynx-esocial-gateway.controller.ts:1 | SGP owns only internal/admin enqueue helpers and the event projection table.       |
| `docs/refs/esocial/events-periodicos.md`          | S-1200/S-1202/S-1207/S-1210/S-1298/S-1299 periodic events                                 | backend/src/integrations/stynx-esocial/contracts/payloads/folha.ts:1         | SGP enqueues periodic requests into `public.esocial_events`.                       |
| `docs/refs/esocial/events-nao-periodicos.md`      | S-2200/S-2205/S-2206/S-2210/S-2220/S-2230/S-2240/S-2298/S-2299/S-2306 non-periodic events | backend/src/integrations/stynx-esocial/contracts/payloads/trabalhador.ts:1   | SGP enqueues non-periodic requests and stores receipts in `public.esocial_events`. |
| `docs/refs/esocial/events-tabelas.md`             | S-1000/S-1005/S-1010/S-1020 table events                                                  | backend/src/integrations/stynx-esocial/contracts/payloads/tabelas.ts:1       | Table-event construction and manual operation belong to stynx-esocial.             |
| `docs/refs/esocial/events-totalizadores.md`       | S-5001/S-5002/S-5012 totalizer returns                                                    | backend/src/integrations/stynx-esocial/spool-update-consumer.service.ts:1    | Return/totalizer promotion arrives through event updates.                          |
| `docs/refs/esocial/events-exclusao-fechamento.md` | S-3000 exclusion and S-1298/S-1299 reopening/closure                                      | backend/src/integrations/stynx-esocial/contracts/payloads/fechamento.ts:1    | Closure/exclusion requests cross the service boundary through contracts.           |
| `docs/refs/esocial/transmission-soap-ws.md`       | SOAP WS transmission and production-restricted boundary                                   | backend/src/integrations/stynx-esocial/stynx-esocial.client.ts:1             | SGP does not perform SOAP transmission; it calls the stynx-esocial boundary.       |
| `docs/refs/esocial/xsd-and-signing.md`            | XSD validation and PAdES/PKCS#7 sandbox evidence                                          | backend/src/auth/govbr/software-pades-pkcs7.signer.ts:1                      | Local sandbox signer/validator implemented; real certificate validation deferred.  |
| `docs/refs/esocial/dctfweb-mit.md`                | DCTFWeb, MIT, CSLL adicional                                                              | backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts:1         | Implemented CSLL/MIT builder and golden fixture.                                   |
| `docs/refs/esocial/efd-reinf.md`                  | EFD-Reinf R-2000/R-2055                                                                   | backend/src/integrations-worker/efd-reinf/builders/r2055.builder.ts:1        | Implemented R-2055/R-2000 builders and goldens.                                    |
| Feature audit M.06                                | MANAD payroll digital-file package                                                        | backend/src/report-service/manad-export-report.service.ts:1                  | Implemented deterministic TXT/JSON export package with golden fixture.             |

### External-Service Ownership Rebaseline

Feature-audit mitigation MUST keep external-service and framework boundaries
out of SGP implementation scope:

- eSocial is an external runtime owned by `../stynx-esocial`. SGP owns HR and
  payroll source records, normalized producer DTOs, `public.esocial_events`
  projection rows, idempotency/source references, and operator-visible status.
  XML construction, XSD validation, signing, SOAP submission, return parsing,
  totalizer parsing, retry/DLQ, and external audit publication belong to
  `../stynx-esocial`.
- DET is an external-service integration boundary. SGP owns only the
  tenant-local DET inbox projection, local annotations, operator state, and
  "ciencia requested/recorded" status. Polling the government inbox, certificate
  custody, acknowledgement protocol, retry/DLQ, message normalization, and
  external audit publication belong to a future `stynx-det` service.
- SIAPE and SIOPS are deferred external integrations until an owner-approved
  service boundary exists. SGP can retain explicit deferral records and source
  data projections, but must not claim active SIAPE/SIOPS service ownership.
- SIOPE stays in SGP only when implemented as a local government reporting or
  export workflow over SGP source data. Any FNDE service polling/transmission
  runtime must be reclassified with SIAPE/SIOPS as an external integration.
- Shared administration, token/auth, RBAC machinery, storage primitives, and
  generic platform controls are owned by `../stynx`. SGP may consume those
  primitives and may define SGP-domain permissions, but it must not fork or
  replace the framework.

### Payroll, HR, legal, and procurement cluster

| Reference                                          | Obligation cluster                              | Implementation / evidence path:line                                 | Current posture                                                      |
| -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `docs/refs/legal/clt-rescisao-aviso-fgts.md`       | CLT termination, proportional notice, FGTS/GRRF | tests/backend/golden/rescisao-v01/input.json:1                      | Implemented payroll termination goldens and FGTS/GRRF coverage.      |
| `docs/refs/legal/pensao-alimenticia.md`            | Alimony/pension food discounts                  | backend/src/folha-pagamento/operations/alimony/alimony.service.ts:1 | Implemented employee alimony management and payroll integration.     |
| `docs/refs/legal/consignacoes-margem-lei-14509.md` | Consignment margin caps                         | tests/backend/margin-calculator.golden.spec.ts:45                   | Implemented golden margin calculator coverage.                       |
| `docs/refs/legal/decimo-terceiro-ferias.md`        | 13th salary and vacation payroll                | tests/backend/decimo-terceiro-golden.e2e-spec.ts:1                  | Implemented 13th salary and vacation payroll goldens.                |
| `docs/refs/legal/ec-103-previdencia.md`            | Constitutional pension reform                   | backend/src/previdenciario/previdenciario.service.ts:47             | Implemented previdenciario service/policy surface.                   |
| `docs/refs/legal/rpps-vs-rgps.md`                  | RPPS/RGPS regime distinction                    | backend/src/previdenciario/regras/regras.service.ts:34              | Implemented pension-rule service surface.                            |
| `docs/refs/legal/previdenciario-irrf.md`           | Previdenciario and IRRF calculations            | backend/src/previdenciario/declaracao/declaracao.service.ts:18      | Implemented declaration/calculation surfaces.                        |
| `docs/refs/legal/concursos-publicos.md`            | Public concurso flow, appointment, quotas       | database/sql/10-11-recrutamento-ddl.sql:1                           | Implemented recruitment schema and portal/admin flow surfaces.       |
| `docs/refs/legal/licencas-estatutarias.md`         | Statutory leave workflows                       | backend/src/rh/workflows/leaves/leaves.service.ts:1                 | Implemented leave surface with remaining policy breadth tracked.     |
| `docs/refs/legal/teto-acumulacao.md`               | CF art. 37 XVI lawful accumulation              | backend/src/rh/employees/accumulation.service.ts:1                  | Implemented compatibility matrix and deterministic seed.             |
| `docs/refs/legal/portaria-671-ponto.md`            | Time-attendance, AFD, REP/biometric posture     | database/sql/10-08-ponto-ddl.sql:1                                  | Implemented ponto schema and frontend/admin surfaces.                |
| `docs/refs/legal/lei-14133-licitacoes.md`          | Procurement law reference                       | docs/gov/evidence/deferred-decision-ledger.md:22                    | Reference-only for v0.0.1; procurement runtime remains out of scope. |

### LGPD cluster

| Reference                                    | Obligation cluster                        | Implementation / evidence path:line              | Current posture                                                  |
| -------------------------------------------- | ----------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| `docs/refs/lgpd/lei-13709.md`                | LGPD umbrella obligations                 | database/sql/15-pii-encryption.sql:1             | Implemented PII tagging/encryption and protected route surfaces. |
| `docs/refs/lgpd/anpd-guidelines.md`          | ANPD operational guidance                 | backend/src/common/lgpd/legal-basis.service.ts:1 | Implemented legal-basis service and audit evidence.              |
| `docs/refs/lgpd/dpo-dsar.md`                 | DPO designation and DSAR channel          | backend/src/lgpd/dpo.controller.ts:1             | Implemented public DPO/DSAR endpoints.                           |
| `docs/refs/lgpd/pii-categorias-cpf-bio.md`   | CPF/biometric/sensitive category handling | database/sql/13-pii-comments.sql:1               | Implemented PII comments plus Round 4 encryption closure.        |
| `docs/refs/lgpd/ropa-rcis.md`                | ROPA/RCIS records                         | backend/src/lgpd/ropa.controller.ts:1            | Implemented ROPA/RCIS controller surface.                        |
| `docs/refs/lgpd/tratamento-poder-publico.md` | Public-power treatment basis              | backend/src/lgpd/public-power.controller.ts:1    | Implemented public-power LGPD route surface.                     |

### TCE, transparency, SIAFIC, and official exports cluster

| Reference                                   | Obligation cluster                               | Implementation / evidence path:line                               | Current posture                                                      |
| ------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `docs/refs/tce/00-pluggable-contract.md`    | Pluggable TCE/TCM/TCU adapter contract           | backend/src/tce/adapters/queue-adapter.ts:1                       | Implemented local queue-backed adapter contract.                     |
| `docs/refs/tce/state-catalog.md`            | State catalog and source-pending layout registry | tests/backend/tce-02-catalog.e2e-spec.ts:1                        | Implemented state catalog evidence and source-pending posture.       |
| `docs/refs/tce/lai-portal-transparencia.md` | LAI/transparency publication                     | tests/backend/golden/transparency/public-payroll-v01/input.json:1 | Implemented transparency golden outputs.                             |
| `docs/refs/tce/rreo-rgf.md`                 | RREO/RGF fiscal reports                          | tests/backend/golden/tce/rreo-v01/sp/input.json:1                 | Implemented SP/MG source-pending RREO/RGF goldens and local relay.   |
| `docs/refs/tce/siafic.md`                   | SIAFIC integration                               | tests/backend/siafic-sync.e2e-spec.ts:1                           | Implemented neutral SIAFIC sync contract; official layout deferred.  |
| `docs/refs/tce/siope-siops.md`              | SICONFI/SIOPE/SIOPS export primitives            | tests/backend/fixtures/official-exports/siope.golden.csv:1        | Implemented official export primitives with source-pending branding. |

## Adapter Mock Queue Contract

**Status:** Implemented as dependency-free reference contract
**Scope:** SGP boundary architecture for fiscal, banking, eSocial, TCE, and other
external integrations.

### Decision

SGP v0.0.1 terminates at adapters. Adapters exchange messages with local mock
relay services through a two-way queue contract: one request topic, one response
topic, and one dead-letter topic per integration kind. Real homologation and
production transmission remain outside SGP runtime scope unless a future owner
decision explicitly authorizes an ente-specific relay.

The production transport recommendation is BullMQ over Redis because it has an
MIT license and established retry/DLQ semantics. R4-95 does not add BullMQ as a
dependency; the accepted runtime contract lives behind `QueueAdapterTransport`,
with an in-memory reference transport for tests and local mock relays. Later
workers can replace the transport without changing the envelope or adapter
surface.

### Topics

For each `kind`, the canonical topics are:

- request: `sgp.adapter.<kind>.request`
- response: `sgp.adapter.<kind>.response`
- dead letter: `sgp.adapter.<kind>.dlq`

The `kind` is a stable lowercase integration family such as `tce`, `esocial`,
`banking`, `siafic`, or a narrower worker-owned derivative. R4-96/R4-97/R4-98
instantiate concrete relay kinds without changing the cross-cutting contract.

### Request envelope

Every request message MUST carry:

- `request-id`: unique UUID or equivalent stable identifier.
- `correlation-id`: trace value propagated across adapter, mock relay, logs,
  metrics, retries, and final response.
- `idempotency-key`: deterministic key for the legal fact or artifact being
  relayed.
- `tenant_id`: tenant boundary for the source fact.
- `kind`: integration family.
- `payload`: integration-owned JSON payload.
- `attempt`: current one-based delivery attempt.
- `max-attempts`: retry budget for this request.
- `reply-to`: response topic.
- `dead-letter-topic`: DLQ topic.
- `created-at`: ISO timestamp.

### Response envelope

Every response message MUST carry:

- `request-id`, `correlation-id`, `tenant_id`, and `kind` copied from the
  request.
- `status`: `OK`, `RETRY`, or `DEAD_LETTER`.
- `attempt`: attempt that produced the response.
- `payload`: response payload when `status=OK`.
- `error`: structured error with `kind`, `code`, `message`, and optional
  `details` when `status` is not `OK`.
- `created-at`: ISO timestamp.

Adapters MUST reject responses whose `correlation-id` does not match the
pending request. Mock relays MUST be deterministic in CI and MUST NOT call real
eSocial, TCE, banking, RFB, GovBR, or SIAFIC endpoints.

### Retry and dead-letter rules

`RETRY` means the mock relay saw a transient condition and the adapter may
re-publish the same request with `attempt + 1`, preserving `request-id`,
`correlation-id`, `idempotency-key`, `tenant_id`, and `kind`. When `attempt`
reaches `max-attempts`, the adapter publishes one dead-letter envelope to
`sgp.adapter.<kind>.dlq` and fails the caller with a delivery error. A relay may
also return `DEAD_LETTER` directly for definitive failures.

DLQ entries retain the final request, final response when present, reason, and
dead-letter timestamp. Replays are future operator workflows; this contract only
defines the durable message shape.

### Observability hooks

Adapters expose hooks for request publication, response receipt, retry
scheduling, and DLQ publication. Implementations should bind those hooks to the
existing worker observability posture: structured logs include `request-id`,
`correlation-id`, `tenant_id`, `kind`, `attempt`, and `status`; metrics update
queue depth, active claims, retry counts, and dead letters by queue/kind.

### Reference implementation

The reference implementation is:

- `backend/src/common/adapters/queue-adapter.ts`: generic `SgpQueueAdapter`,
  envelope types, topic derivation, in-memory transport, retry, correlation, and
  DLQ behavior.
- `backend/src/external/mocks/_reference/reference-mock-responder.ts`: mock
  responder side with deterministic happy, transient retry, DLQ, and concurrent
  response behavior.
- `backend/src/common/adapters/queue-adapter.spec.ts`: contract tests for
  happy path, retry, DLQ, and concurrent correlation.

## Mock TCE Relay

**Status:** Implemented for local SP/MG RREO/RGF queue evidence.

**Scope:** R4-96 mock relay and TCE queue adapter for the R4-95 adapter
contract. Production TCE/AUDESP/SICOM homologation, official state endpoint
submission, credential custody, and tribunal acceptance evidence remain outside
this implementation.

### Decision

The TCE mock relay runs as a deterministic local queue consumer for `kind=tce`.
The adapter publishes a queue request with the persisted `tce.submission` id and
one R4-15 fiscal report envelope. The relay accepts the current source-pending
SP/MG envelopes for `RREO` and `RGF`, preserves `officialConformance=false`,
and returns state-shaped local acknowledgement payloads:

- SP receives an AUDESP-shaped acknowledgement with `protocoloAudesp`,
  `situacao`, and `reciboLocal`.
- MG receives a SICOM/TCE-MG-shaped acknowledgement with `numeroProtocolo`,
  `situacao`, and `hashPacote`.

The adapter persists the mock round trip into the live `tce.submission` table by
setting `status=STUB_OK`, request size, response payload, response hash,
submission timestamp, and response timestamp. The prompt phrase
`tce.submission_state` maps to this live table in the current schema; no
parallel state table or legacy compatibility layer is introduced.

### Boundaries

- Supported report schemas in R4-96: `tce-rreo-v01` and `tce-rgf-v01`.
- Supported states in R4-96: `SP` and `MG`.
- Supported transport in tests: `InMemoryQueueTransport` over the R4-95
  `SgpQueueAdapter` contract.
- Unsupported by design: real TCE/AUDESP/SICOM endpoints, production
  homologation, official layout conformance, credential custody, and tribunal
  acceptance evidence.

### Implementation

- `backend/src/external/mocks/tce-relay/`: deterministic local TCE relay
  responder.
- `backend/src/tce/adapters/queue-adapter.ts`: adapter-side TCE queue bridge
  and `tce.submission` state writer.
- `backend/src/tce/submission/`: state fiscal-report submission service that
  wires persisted SP/MG source-pending RREO/RGF reports through the local relay
  queue and returns acknowledgement state for downstream workers/controllers.
- `tests/backend/tce-queue-adapter.e2e-spec.ts`: focused queue proof for SP
  RREO and MG RGF acknowledgement round trips and state persistence.
- `tests/backend/tce-queue-adapter.e2e-spec.ts`: R4-81 queue proof for state
  shaped acknowledgement round trips.

## Stynx eSocial Boundary

**Status:** Implemented for the SGP-side spool/API boundary.

**Scope:** SGP gateway, contracts, spool, audit mirror, and callback consumers.
Production homologation, national eSocial endpoint calls, production
certificates, XSD bundles, and HSM/A3 custody are owned by stynx-esocial.

### Decision

The eSocial relay no longer runs in SGP. SGP publishes tenant-scoped spool
messages and stynx-esocial returns protocol, receipt, retry, rejection, and audit
updates through the SGP gateway. SGP stores only request/response hashes,
operator metadata, status, and receipt fields needed by product screens and
reports.

### Boundaries

- Supported event classes: all SGP-originating S-xxxx classes represented in
  `backend/src/integrations/stynx-esocial/contracts/payloads/`.
- Supported SGP transport: HTTP/queue client plus `public.esocial_events`.
- Unsupported by design in SGP: XML builders, XSD validation, eSocial SOAP,
  national-environment homologation, certificate custody, and direct SQL into
  the stynx-esocial database.

### Implementation

- `backend/src/integrations/stynx-esocial/`: SGP-side HTTP/queue gateway,
  contracts, audit consumer, and spool update consumer for the lifted service.
- `backend/src/esocial-events/`: tenant-scoped spool writer/reader used by SGP
  modules that need eSocial receipts, statuses, and report evidence.
- `tests/backend/esocial-events.spec.ts`: focused proof for spool enqueue and
  status persistence.
- `tests/backend/stynx-esocial-spool-update-consumer.spec.ts`: proof that
  stynx-esocial callbacks update the SGP spool without direct database coupling.

## DCTFWeb

## DCTFWeb

**Escopo:** FISC-01 — geração e transmissão da DCTFWeb a partir de S-5011/S-5012/S-5013 e MIT.

### Decisão

A DCTFWeb do SGP é gerada no `integrations-worker/dctfweb` a partir de totalizadores aceitos na competência. O módulo consome `esocial.esocial_totalizer` para S-5011, S-5012 e S-5013, exige que o S-1299 de origem esteja `ACCEPTED`, consome `fiscal.efd_reinf_totalizer` para R-9015 quando houver fechamento EFD-Reinf R-4099 aceito, grava a declaração em `fiscal.dctfweb_declaration` e materializa cada débito em `fiscal.dctfweb_item`. Quando a origem MIT/PGD-DCTF traz adicional de CSLL, o valor fica separado em `fiscal.dctfweb_item.csll_adicional_amount` e no atributo XML interno `csllAdicional`, sem misturar o adicional ao valor principal do débito.

Para fatos geradores a partir de 2025, `MitInclusionService` emite o XML de inclusão MIT para débitos que antes eram declarados via DCTF PGD. A origem operacional esperada é `fiscal.dctf_pgd_tax_debit`, com uma linha por débito, `cnpj_filial` de 14 dígitos, código de tributo, período, base, valor, adicional de CSLL quando aplicável, vencimento e status MIT. O XML MIT agrupa débitos por `cnpj_filial`, preserva identificadores PGD por débito e gera `mitDebitId` determinístico para rastrear a inclusão dentro da DCTFWeb.

### Pré-requisitos

- S-1299 aceito para a competência.
- Totalizadores S-5011, S-5012 e/ou S-5013 persistidos com recibo de origem.
- Débitos PGD-DCTF pendentes em `fiscal.dctf_pgd_tax_debit` quando houver obrigação MIT para a competência.
- Certificado fiscal ICP-Brasil A1/A3 ativo no tenant, exposto ao módulo por
  `backend/src/external/signature/tenant-fiscal-certificate.service.ts`.
- Permissões `fiscal.dctfweb.read` e `fiscal.dctfweb.write` no catálogo canônico.

### Fluxo

1. O operador informa ano, mês e tipo de declaração no admin em `frontend/src/app/features/fiscal/dctfweb/`.
2. `POST /api/v1/admin/fiscal/dctfweb/gerar` cria o XML e os itens fiscais com valores `numeric(14,2)`.
3. `POST /api/v1/admin/fiscal/dctfweb/:id/assinar` assina o XML com o certificado ativo reutilizando o material ICP-Brasil do ES-07.
4. `POST /api/v1/admin/fiscal/dctfweb/:id/transmitir` envia o XML assinado ao endpoint RFB configurado por `DCTFWEB_RFB_ENDPOINT_URL`; sem endpoint, usa sandbox local.
5. O recibo grava número, horário, payload de retorno e hash do XML transmitido. O hash deve ser igual ao hash do XML assinado.

### MIT

O MIT é tratado como origem `sourceEvent="MIT"` nos DTOs e no XML interno. Cada débito possui `mitStatus`, `mitDebitId`, `cnpjFilial` e `csllAdicionalAmount`; o status de emissão do serviço é `INCLUDED` quando o XML MIT é produzido. O serviço aceita filtro opcional por `cnpj_filial` para que unidades gestoras inscritas como filiais apresentem DCTFWeb própria, sem misturar débitos de outra filial na mesma inclusão.

O layout regulatório final importável pela Receita ainda é uma fronteira externa: o SGP preserva os campos e identificadores necessários no XML interno e nos testes de contrato, sem escolher versão de leiaute pública nova fora dos documentos oficiais.

### Retificadora

Declarações `RETIFICADORA` devem preencher `original_declaration_id`. A regra é aplicada pela API e por constraint física em `fiscal.dctfweb_declaration`; não existe retificadora solta no v0.0.1.

### Segurança e auditoria

`fiscal.dctfweb_declaration` e `fiscal.dctfweb_item` usam RLS forçado por `tenant_id` com `sgp_tenant_matches(tenant_id)` e `sgp_has_any_permission(...)`. Toda mutação dispara trigger com `public.sgp_append_audit_event(...)`, e os controladores também registram evento de aplicação para geração, assinatura e transmissão.

### Referência cruzada: DIRF

A DIRF anual transicional esta documentada em `docs/eng/domains/fiscal-integrations.md`. Ela nao substitui a DCTFWeb: FISC-02 cobre apenas rendimentos de terceiros ainda nao integralmente cobertos pelo S-1210/eSocial, enquanto FISC-01 permanece baseado nos totalizadores S-5011/S-5012/S-5013 aceitos e na declaracao DCTFWeb por competencia.

### Referência cruzada: EFD-Reinf R-4000

A EFD-Reinf R-4000 esta documentada em `docs/eng/domains/fiscal-integrations.md`. O totalizador R-9015 produzido pelo fechamento R-4099 aceito alimenta a DCTFWeb na mesma competencia e substitui a dependencia operacional de DIRF para fatos geradores a partir do corte legal.

### Referências oficiais

- IN RFB 2.005/2021 — apresentação da DCTFWeb.
- IN RFB 2.237/2024 — MIT e substituição da DCTF PGD pela DCTFWeb para fatos geradores a partir de 2025.
- Manual de Orientação da DCTFWeb 2025, Receita Federal.
- MP 2.200-2/2001 — ICP-Brasil.

## DIRF Anual

## DIRF Anual

**Escopo:** FISC-02 — geracao anual de DIRF para rendimentos de terceiros ainda nao substituidos pelo S-1210/eSocial, somente para ano-base anterior a 2025.

### Escopo funcional

A DIRF do SGP cobre apenas pagamentos a terceiros: autonomos nao empregados, pessoas juridicas, beneficiarios no exterior e outros rendimentos retidos fora da folha de empregados. A folha mensal de servidores segue coberta por CALC-11 e ES-04/S-1210, e nao e fonte deste arquivo.

O modulo le `payment.dirf_payment_source`, agrega por ano-base, tenant, beneficiario e codigo de receita, e grava o resultado em `fiscal.dirf_arquivo`, `fiscal.dirf_beneficiario` e `fiscal.dirf_pagamento`. O arquivo TXT fica em `txt_content` para os gates locais e em `txt_ref` como referencia auditavel de armazenamento externo.

DIRF esta deprecada para fatos geradores a partir de 2025-01-01. A API `POST /v1/admin/fiscal/dirf/gerar` retorna `410 Gone` para ano-base `2025` ou posterior, e a acao de geracao na interface fica oculta nesses anos-base. A substituicao regulatoria fica no escopo de EFD-Reinf R-4000.

### Leiaute e validacao

`layout_version` e obrigatorio e segue o formato `DIRF-RFB-2.060/{ano-base}`. A referencia normativa da transicao e a IN RFB 2.060/2021 e os leiautes anuais publicados pela Receita Federal/e-CAC para o PGD DIRF do ano-base. O validador automatico do SGP verifica ordem dos registros, cabecalho, abertura, beneficiarios, pagamentos, totalizadores e encerramento. A regressao final contra o PGD oficial permanece manual: o TXT gerado deve ser importado no PGD DIRF do ano-base e a evidencia operacional deve registrar o resultado antes da entrega.

### Retificadora

Arquivos `RETIFICADORA` exigem `original_arquivo_id` apontando para a DIRF original do mesmo tenant. A regra e aplicada por DTO/API e por constraint fisica em `fiscal.dirf_arquivo`; nao existe retificadora solta no v0.0.1.

### Seguranca e auditoria

As tabelas DIRF sao tenant-scoped, usam RLS forcado por `tenant_id` com `sgp_tenant_matches(tenant_id)` e `sgp_has_any_permission(...)`, e exigem as permissoes canonicas `fiscal.dirf.read` e `fiscal.dirf.write`. Toda mutacao dispara trigger com `public.sgp_append_audit_event(...)`, e a geracao pelo controller tambem registra evento `EXPORT` com ano-base, tipo, versao de leiaute, hash TXT e totalizadores.

### Fora do escopo

- DIRF de folha de empregados substituida pelo S-1210.
- Geracao de DIRF para ano-base 2025 ou posterior.
- Transmissao automatica a RFB ou Receitanet.
- Conversao de moeda para beneficiario no exterior; o valor entra ja convertido em reais.

## Hub de Validação e Assinatura eSocial

## Hub de Validação e Assinatura eSocial

**Versão:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** ES-07, validação XSD S-1.3, assinatura ICP-Brasil e rotação de certificados.

### Decisão

O SGP v0.0.1 não constrói, valida, assina, transmite, consulta ou classifica XML
eSocial em processo. O limite SGP é o gateway `backend/src/integrations/stynx-esocial/`
e a tabela `public.esocial_events`. Builders, bundle XSD, certificados
operacionais, SOAP, parser de retorno, totalizadores e política de retry
pertencem ao serviço separado stynx-esocial.

### Spool e contratos

Cada emissão eSocial que nasce no SGP grava uma mensagem em `public.esocial_events`
por meio de `backend/src/esocial-events/` ou do client stynx-esocial. A mensagem
carrega tenant, classe do evento, referência de origem, payload normalizado,
hashes, status e metadados de auditoria. O retorno de stynx-esocial atualiza o
mesmo registro; relatórios e recibos SGP leem apenas essa projeção.

### Certificados e assinatura

Certificados eSocial pertencem a stynx-esocial. O SGP não expõe API
browser-facing para certificado eSocial, não armazena PKCS#12 e não executa
XML-DSig eSocial; certificados fiscais usados por DCTFWeb/EFD-Reinf ficam no
serviço genérico de assinatura externa do SGP, fora do runtime eSocial.

### Falhas e auditoria

Falhas XSD, SOAP, ambiente nacional e classificação de retorno são persistidas
no stynx-esocial e espelhadas no SGP como atualização de evento. Auditoria SGP
registra a ação de origem e a transição da projeção, sem FK, FDW, schema
compartilhado ou conexão SQL para o banco isolado de stynx-esocial.

### Frontend

SGP não mantém módulo frontend eSocial nem a antiga família de rotas
browser-facing eSocial. Ações de negócio do SGP disparam eventos internamente; a
operação técnica, XML, certificados, retorno e retentativa pertencem ao
stynx-esocial.

## Eventos de Tabelas e Cadastro eSocial

## Eventos de Tabelas e Cadastro eSocial

**Versao:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** ES-01, ES-02, ES-03, ES-04, ES-05, ES-06, SST-03, SST-04 e SST-05, eventos S-1xxx iniciais, S-1200/S-1202/S-1207/S-1210, S-1298/S-1299, totalizadores S-5xxx, S-2200/S-2205/S-2206, S-2210, S-2220, S-2230, S-2240, S-2299, S-2400/S-2405/S-2410/S-2416/S-2418/S-2420 e S-3000

### Decisao

Os eventos eSocial são solicitações de integração no SGP. O runtime SGP
normaliza a origem funcional, grava `public.esocial_events`, publica a mensagem
para stynx-esocial e depois consome atualizações de status/recibo pelo mesmo
spool. O SGP não possui builders XML, schema `esocial`, tabelas de estado
S-xxxx, certificado eSocial, parser de retorno ou submissão SOAP.

As regras funcionais que disparam eventos continuam pertencendo aos módulos de
origem: folha, RH, previdenciário, recrutamento, convênio e SST. Cada módulo
chama `backend/src/integrations/stynx-esocial/stynx-esocial.client.ts` ou
`backend/src/esocial-events/esocial-events.service.ts` com a classe do evento,
referência de origem e payload de negócio. Stynx-esocial é responsável por
delta, XSD, assinatura, transmissão, reabertura/fechamento, exclusão,
totalizadores e reconciliação com recibos oficiais.

### Mapa Entidade para Evento

| Evento                                                         | Entidade fonte SGP                                                                              | Transporte SGP          |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------- |
| S-1000/S-1005/S-1010/S-1020/S-1030/S-1040/S-1050/S-1060/S-1070 | Cadastros de gestão, empresa, lotação, rubricas, cargos, funções e jornadas                     | `public.esocial_events` |
| S-1200/S-1202/S-1207/S-1210                                    | Folha gerada, itens da folha, benefícios RPPS e remessas pagas                                  | `public.esocial_events` |
| S-1298/S-1299/S-3000                                           | Fechamento, reabertura e exclusão solicitados pela operação                                     | `public.esocial_events` |
| S-2200/S-2205/S-2206/S-2230/S-2298/S-2299                      | Servidor, vínculo, alterações cadastrais/contratuais, afastamentos, reintegração e desligamento | `public.esocial_events` |
| S-2210/S-2220/S-2240                                           | CAT, ASO arquivado e exposição ambiental                                                        | `public.esocial_events` |
| S-2300/S-2306/S-2399                                           | TS-V, estágio, conselheiro, autônomo e alterações contratuais                                   | `public.esocial_events` |
| S-2400/S-2405/S-2410/S-2416/S-2418/S-2420                      | Aposentadoria, pensão, recadastramento, alteração, reativação e cessação de benefício           | `public.esocial_events` |

### Operacao

SGP não publica rotas eSocial para o navegador. Eventos nascem de ações
funcionais já existentes, como posse, alteração contratual, reintegração,
desligamento, férias, afastamento, folha gerada, pagamento e fechamento. Essas
ações chamam serviços internos ou o client stynx-esocial, gravam
`public.esocial_events` e deixam XML, assinatura, transmissão, retorno,
retentativa e operação manual no stynx-esocial.

Os únicos helpers HTTP eSocial mantidos no SGP são rotas admin estreitas sob
`/api/v1/admin/esocial/*`, usadas por fluxos internos de RH/folha que ainda
precisam solicitar S-2298 e S-2306 explicitamente. Elas não formam uma API
eSocial browser-facing nem substituem a operação do serviço externo.

### Auditoria e RLS

`public.esocial_events` usa RLS forçado por tenant com
`sgp_tenant_matches(tenant_id)`. Leitura usa `esocial.event.read`; emissões e
retentativas usam `esocial.event.write`; submissão usa
`esocial.submission.read`/`esocial.submission.retry`; certificados usam
`esocial.certificate.read`/`esocial.certificate.write`. Toda mutação SGP grava
auditoria local e nunca escreve em schema ou banco stynx-esocial.

## EFD-Reinf R-4000

## EFD-Reinf R-4000

**Escopo:** FISC-05 — eventos R-4010, R-4020, R-4040, R-4080 e R-4099 para retencoes federais substitutivas da DIRF em fatos geradores a partir de 2025-01.

O SGP gera eventos da serie R-4000 no `integrations-worker/efd-reinf`. R-4010 le pagamentos a beneficiario pessoa fisica, R-4020 le pagamentos a pessoa juridica, R-4040 e R-4080 aceitam itens explicitos de retencao quando nao houver fonte mensal consolidada, e R-4099 fecha a competencia a partir dos eventos R-4000 aceitos.

O ciclo operacional espelha DCTFWeb: gerar XML, assinar com o certificado ICP-Brasil ativo do tenant, transmitir ao endpoint RFB configurado por `EFD_REINF_RFB_ENDPOINT_URL` ou ao sandbox local, e registrar recibo/hash do XML transmitido. O XML interno nao fixa versao de leiaute regulatorio; a selecao oficial de leiaute permanece decisao de owner antes de homologacao externa.

Dados persistidos:

- `fiscal.efd_reinf_event` guarda evento, status, XML, assinatura, recibo e payload de retorno.
- `fiscal.efd_reinf_item` guarda beneficiario, codigo de receita, valor bruto e valor retido.
- `fiscal.efd_reinf_totalizer` materializa o totalizador R-9015 gerado a partir do R-4099 aceito para consumo pela DCTFWeb.

As tabelas sao tenant-scoped, usam RLS forcado por `tenant_id` com `sgp_tenant_matches(tenant_id)` e `sgp_has_any_permission(...)`, e reutilizam temporariamente as permissoes `fiscal.dctfweb.read` e `fiscal.dctfweb.write` porque a criacao de novas strings RBAC foi deferida para decisao de owner. Toda mutacao dispara auditoria pela trilha fiscal.

### Referencia cruzada: DCTFWeb e DIRF

A DCTFWeb passa a consumir totalizadores Reinf R-9015 junto dos totalizadores eSocial S-5011, S-5012 e S-5013. A DIRF permanece documentada em `docs/eng/domains/fiscal-integrations.md` como fluxo transicional para competencias anteriores ao corte legal.

## Submissao eSocial SOAP

## Submissao eSocial SOAP

**Versao:** 2.0 | **Data:** 2026-05-04 | **Status:** Lifted out
**Escopo:** ES-08 no SGP agora é apenas contrato de submissão para stynx-esocial.

**Truth banner:** SGP no longer owns SOAP client plumbing, WS-Security/mTLS,
XSD bundles, circuit breakers, production certificates, or national eSocial
homologation. Those responsibilities are outside this repository and are
represented in SGP by `public.esocial_events` plus gateway contracts.

### Decisao

Os módulos SGP disparam eSocial internamente a partir de ações de domínio. Cada
ação cria uma mensagem em `public.esocial_events` e a entrega ao client
stynx-esocial. O serviço externo decide lote, assinatura, ambiente, retry,
protocolo, recibo, rejeição definitiva e totalizadores.

### Endpoints

SGP não configura WSDL ou endpoint eSocial nacional. O único endpoint eSocial
externo do SGP é o destino stynx-esocial configurado para o gateway.

### Seguranca SOAP

SGP não assina XML eSocial nem envelope SOAP. Assinatura, mTLS, A1/A3 e
custódia de certificado pertencem ao stynx-esocial.

### Persistencia

`public.esocial_events` e o registro canonico SGP de cada mensagem enviada ou
recebida no limite com `stynx-esocial`. A tabela fica no banco SGP, forca RLS por
tenant, armazena hashes SHA-256 de payload/resposta, status
`PENDING|SENT|RECEIVED|ACCEPTED|REJECTED|RETRY|DLQ`, metadados de ator e
request, e e a fonte para recibos e relatorios SGP. O banco isolado
`stynx-esocial` nao tem FK, FDW, peering, replicacao, callback SQL ou connection
string compartilhada com SGP.

### Retry e Circuit Breaker

Falhas de transporte entre SGP e stynx-esocial entram no spool como `RETRY` ou
`DLQ`. Falhas do Ambiente Nacional são traduzidas por stynx-esocial e espelhadas
como `ACCEPTED`, `REJECTED` ou `RETRY`.

### Testes

Os testes SGP usam `tests/backend/esocial-events.spec.ts`,
`tests/backend/stynx-esocial-spool-update-consumer.spec.ts` e
`tests/backend/stynx-esocial-audit-consumer.spec.ts`. Eles não dependem de WSDL,
SOAP ou endpoint `gov.br`.

### Apendice ES-09: classificacao de retorno

O retorno recebido pelo SGP já vem classificado por stynx-esocial. O SGP
atualiza `public.esocial_events` e publica evidência de auditoria, sem parser de
XML oficial.

## Reintegracao S-2298

## Reintegracao S-2298

**Status:** implemented | **Escopo:** RH, Folha de Pagamento, eSocial

### Fluxo administrativo

A reintegracao registra uma ordem judicial, anulação administrativa ou anistia para vínculo previamente desligado. O operador informa o vínculo, o evento S-2299 original, a data de reintegração, a data da decisão, o fundamento e o anexo digitalizado. A aplicação valida que a data de reintegração não é futura e não antecede o desligamento original.

Ao aplicar a ordem, o sistema encerra o histórico funcional anterior, grava nova transição em `hr.employee_status_history` com `cause = 'REINSTATEMENT'`, remove a data de desligamento do servidor e reabre o vínculo. A ordem passa de `REGISTERED` para `APPLIED` e toda mutação é auditada por `sgp_append_audit_event(...)`.

### Fundamentos legais

O fluxo cobre reintegração por decisão judicial transitada em julgado, anulação de ato administrativo, incluindo decisão em PAD, e anistia. A base funcional considerada para o MVP é CLT art. 495 e Lei 8.112/1990 art. 28, com pagamento das diferenças do período entre o desligamento original e o retorno efetivo.

### Interacao com CALC-09

A aplicação usa a infraestrutura idempotente de reprocessamento de folha: para cada competência retroativa, cria ou reutiliza `payroll.payroll_run` com `cause = 'REINSTATEMENT_RETRO'`, recalcula rubricas compiladas por `payroll_calc.evaluate_earning_deduction(...)` e grava linhas `CALCULATED` com chave de idempotência ativa. A soma consolidada das diferenças é registrada em `payroll.payroll_financial_record` e pode ser repetida sem duplicar verbas ativas.

### Mapeamento S-2298

Ao aplicar a reintegração, o SGP grava uma mensagem S-2298 em
`public.esocial_events` por meio do gateway stynx-esocial. O payload contém o
tipo de reintegração, recibo de desligamento original quando disponível, datas
funcionais e processo judicial quando houver. Stynx-esocial monta, valida,
assina e transmite `evtReintegr`.

## Parser de Retorno eSocial

## Parser de Retorno eSocial

**Versao:** 2.0 | **Data:** 2026-05-04 | **Status:** Lifted out
**Escopo:** ES-09 no SGP é espelhamento de retorno via spool.

**Truth banner:** ES-09 parsing and official status classification are owned by
stynx-esocial. SGP stores classified return evidence in `public.esocial_events`
and does not parse official eSocial XML.

### Decisao

O SGP recebe de stynx-esocial retorno já classificado, com protocolo, recibo,
código, descrição, erros normalizados e timestamps. A tabela canônica local é
`public.esocial_events`; não existe schema de compatibilidade eSocial dentro do
banco SGP.

### Fluxo

`backend/src/integrations/stynx-esocial/spool-update-consumer.service.ts`
resolve a mensagem por `message_id`/referência de origem e atualiza status,
recibo, erros, hashes e timestamps no spool.

### Retry

Retry oficial pertence a stynx-esocial. SGP exibe `RETRY`/`DLQ` a partir do
spool e pode solicitar retentativa pelo gateway.

### UI Administrativa

SGP não possui UI administrativa eSocial. Operação de retornos definitivos,
recuperáveis e retentativas é responsabilidade do stynx-esocial, com SGP
mantendo somente o espelho em `public.esocial_events` para relatórios e
auditoria local.

### Seguranca

`public.esocial_events` é tenant-scoped, força RLS e usa
`sgp_tenant_matches(tenant_id)`. Leituras exigem `esocial.event.read`;
retentativas exigem `esocial.event.write` ou `esocial.submission.retry`.

## SIAFIC integration

## SIAFIC integration

### Scope

The integrations worker owns the SIAFIC outbound bridge for payroll accounting facts required by Decreto 10.540/2020 and Decreto 11.453/2023. The runtime does not implement a public API contract for SIAFIC in v0.0.1; it exposes an internal worker service that can be scheduled or invoked by an operator workflow after payroll accounting mappings are closed.

### Source of truth

SIAFIC sync is derived from the canonical payroll accounting model:

- `payroll.payroll_run` provides competence and lifecycle state.
- `payroll.v_payroll_run_line_active` provides active payroll lines only.
- `payroll.accounting_account` maps payroll rubrics to accounting accounts.

The sync requires the payroll run to be `GENERATED`, `APPROVED`, `PAID`, or `CLOSED` and requires active accounting mappings for the payroll lines. Missing accounting mappings block sync instead of producing partial accounting payloads.

### Runtime state

Canonical SQL state lives under `fiscal`:

- `fiscal.siafic_sync_batch` stores per-run batch state, ente code, per-stage status, receipt, retry count, and circuit state.
- `fiscal.siafic_sync_item` stores each emitted accounting item for `EMPENHO`, `LIQUIDACAO`, and `PAGAMENTO`.
- RLS reuses the fiscal DCTFWeb read/write permissions. No new RBAC strings are introduced in this wave.

### Connector behavior

The connector sends JSON payloads to `SIAFIC_ENDPOINT_URL` when configured. If the endpoint is not configured, it runs in local sandbox mode and returns deterministic receipts.

Retry and circuit defaults:

- `SIAFIC_MAX_ATTEMPTS`: defaults to `3`.
- `SIAFIC_TIMEOUT_MS`: defaults to `15000`.
- `SIAFIC_CIRCUIT_FAILURE_THRESHOLD`: defaults to `3`.
- `SIAFIC_CIRCUIT_RESET_TIMEOUT_MS`: defaults to `60000`.

Circuit state is keyed by ente code. When the failure threshold is reached, the ente circuit opens and rejects new transmissions until the reset timeout allows a half-open probe. Any successful probe closes the circuit and resets the failure count.

### Regulatory assumptions

The implementation treats Decreto 10.540/2020 plus Decreto 11.453/2023 as requiring outbound interoperability for payroll expense accounting facts, but it does not select a vendor-specific SIAFI, SIAFEM, or municipal SIAFIC layout. The payload is a neutral JSON contract containing competence, ente code, payroll run, stage, account code/type, rubric code/description, and amount. A production adapter may map that contract to the ente's official SIAFIC endpoint without changing payroll accounting source semantics.

### Golden conformance

R4-14 pins this boundary in `tests/backend/golden/siafic-v01/` and
`tests/backend/siafic-sync.e2e-spec.ts`. The golden traverses active payroll
accounting lines through `SiaficSyncService`, posts the neutral JSON payload for
`EMPENHO`, `LIQUIDACAO`, and `PAGAMENTO`, and verifies the persisted
`fiscal.siafic_sync_*` state shape.

Because `docs/refs/tce/siafic.md` does not select a Decreto 11.453/2023 layout
version, the golden records `layoutSelection=DEFERRED_OWNER_DECISION`,
`officialConformance=false`, and `productionHomologation=OUT_OF_SCOPE`.
Production SIAFIC homologation remains outside this runtime slice.

The 2026-05-04 owner decision makes that boundary permanent for SGP v0.0.1:
SIAFIC official-layout selection, field dictionaries, and homologation fixtures
are ente-side responsibilities downstream of the neutral JSON mock-relay
contract. SGP must preserve the neutral accounting payload semantics and must not
claim vendor-layout conformance without a future boundary-changing decision.

## TS-V - Alteração Contratual S-2306

## TS-V - Alteração Contratual S-2306

O ES-11 implementa a alteração contratual de trabalhador sem vínculo de
emprego/estatutário (TS-V) pelo evento eSocial S-2306. O ciclo TS-V também
gera solicitações S-2300 (início) e S-2399 (término) a partir de
`hr.tsv_contract` para estagiário, conselheiro e autônomo. O SGP grava essas
solicitações em `public.esocial_events`; stynx-esocial monta e transmite os XMLs.

As categorias TS-V seguem o MOS eSocial, incluindo estagiários regidos pela Lei 11.788/2008, conselheiros tutelares, agentes políticos sem vínculo CLT/RPPS e demais trabalhadores sem vínculo enquadráveis no RET. Para estagiários, o fluxo operacional R2-76 cria `hr.internship_record` com TCE, data de assinatura, plano de atividades, supervisor, curso, bolsa e jornada, e grava `hr.tsv_contract` categoria 901 como fonte do S-2300. O corte ordinário limita a jornada a 30 horas semanais; casos excepcionais de alternância teoria/prática que peçam 40 horas semanais exigem decisão de produto antes de alterar a validação.

O endpoint `POST /api/v1/recrutamento/estagios/:id/esocial/s2300` cria a
mensagem de spool S-2300 a partir do `tsv_contract_id` ligado ao estágio. A
criação de estágio exige termo de compromisso e plano de atividades porque a
Lei 11.788/2008 trata o plano como parte incorporada ao termo e o convênio entre
concedente e instituição de ensino não dispensa o termo.

O modelo físico novo fica em `hr.tsv_contract` e `hr.tsv_contract_change`. A alteração administrativa usa `PATCH /api/v1/admin/hr/tsv-contracts/:id`, exige `hr.employment.write`, valida `effectiveDate >= start_date` e rejeita patches sem mudança real. `fields_changed`, `previous_values` e `new_values` são JSONB com apenas os campos que diferem do snapshot atual; campos ausentes no patch não entram no delta.

Ao registrar `hr.tsv_contract_change`, o SGP cria a mensagem S-2306 com o delta
funcional. Alteração de `monthly_amount`, `role`, dados de estágio ou
`workplace_id` é enviada como payload de negócio; stynx-esocial decide os grupos
XML, valida contra o bundle oficial e transmite.

As tabelas são tenant-scoped, forçam RLS por `sgp_tenant_matches(tenant_id)` e permissões `hr.employment.read`, `hr.employment.write`, `esocial.event.read` e `esocial.event.write`. Toda mutação dispara `public.sgp_append_audit_event(...)`; valores monetários usam `numeric(14,2)`, jornadas usam `numeric(18,6)` e o código não usa `Math.round` para valores monetários.

## Contrato Pluggável TCE/TCM/TCU

## Contrato Pluggável TCE/TCM/TCU

**Versão:** 1.0 | **Data:** 2026-05-02 | **Status:** Implementado
**Escopo:** TCE-01, contrato de adapter, descoberta, registro e lifecycle.

### Decisão

O SGP v0.0.1 usa um contrato pluggável para Tribunais de Contas em `backend/src/tce/`. O core não conhece leiautes estaduais, municipais ou federais específicos; ele descobre providers NestJS anotados com `@TceAdapter({ id, state_code, organ_kind })`, valida que implementam `TceAdapter` e registra o catálogo global em `tce.adapter_registry`.

### Contrato

Todo adapter deve implementar:

- `id()`: identificador estável e único do plugin.
- `state_code()`: UF de dois caracteres; `XX` é reservado para stubs/contratos.
- `organ_kind()`: `TCE`, `TCM` ou `TCU`.
- `supported_layouts()`: códigos e versões semver de leiaute.
- `validate(payload, layout_version)`: valida payload antes de serializar.
- `serialize(payload, layout_version)`: produz envelope assinado/serializável pelo adapter.
- `submit(envelope)`: envia para o destino do adapter ou sandbox.
- `parseResponse(raw)`: normaliza retorno em protocolo, status e mensagem.
- `health()`: valida disponibilidade do adapter sem acionar envio real.

### Lifecycle

O lifecycle mínimo é `REGISTERED -> VALIDATION_OK/VALIDATION_FAIL -> SUBMISSION_OK/SUBMISSION_FAIL -> HEALTH_OK/HEALTH_FAIL`. Transições são persistidas em `tce.adapter_lifecycle_event` com payload JSONB e auditoria por trigger via `public.sgp_append_audit_event(...)`.

O adapter `noop` é o stub determinístico de contrato. Ele suporta o leiaute `NOOP 0.0.1`, valida payload JSON object, serializa para JSON, retorna recibo local `NOOP-*` e não faz chamadas externas.

### Registro e Segurança

`tce.adapter_registry` e `tce.adapter_lifecycle_event` são globais, não tenant-scoped. RLS é forçado nas duas tabelas: usuários com `tce.adapter.read` ou `tce.adapter.manage` podem ler, mas mutações exigem o caminho controlado de backend/worker com `app.bypass_rls=true`. Endpoints administrativos usam `@RequirePermission`:

- `GET /api/v1/tce/adapters`: `tce.adapter.read`.
- `GET /api/v1/tce/adapters/:id/events`: `tce.adapter.read`.
- `POST /api/v1/tce/adapters/:id/enable`: `tce.adapter.manage`.
- `POST /api/v1/tce/adapters/:id/disable`: `tce.adapter.manage`.

### Frontend

A tela admin fica em `frontend/src/app/features/tce/adapters/` e consome o catálogo registrado. Ela lista UF, órgão, versão, status, health e lifecycle, e expõe ações de habilitar/desabilitar para operadores com permissão `tce.adapter.read` na rota e `tce.adapter.manage` no backend.

### Fora do Escopo

TCE-01 não cria catálogo completo de UFs, versões por layout ou adapters reais como AUDESP/SP, SIM-AM/PR, SAGRES/PB ou SIAP/CE. Esses contratos entram nas fatias TCE-02 e TCE-03.

## Catálogo de Estados e Leiautes TCE

## Catálogo de Estados e Leiautes TCE

O SGP v0.0.1 mantém um catálogo global, público e não tenant-scoped para Tribunais de Contas em `tce.state`, `tce.layout_version` e `tce.layout_field`. O objetivo é separar a fonte de verdade de metadados públicos do contrato pluggável de adapters: o core sabe quais órgãos, sistemas e versões existem, mas não embarca dicionários proprietários nem baixa leiautes externos.

### Modelo

`tce.state` registra as 26 UFs, o Distrito Federal, o TCU (`BR`) e TCMs relevantes com código interno de dois caracteres, UF pai quando municipal, tipo de órgão e URL oficial. As entradas municipais usam códigos internos distintos da UF pai para preservar unicidade física e mantêm `parent_state_code` apontando para a UF real.

`tce.layout_version` registra sistema, versão semântica, vigência, status, URL pública e observações. A semente inicial cria placeholders `DRAFT` para `SIM-AM`/PR, `AUDESP`/SP, `SAGRES`/PB e `SIAP`/CE. Esses registros existem apenas para roteamento e governança inicial; campos permanecem vazios até adapters concretos aprovados preencherem `tce.layout_field`.

`tce.layout_field` descreve campos por caminho lógico, tipo, obrigatoriedade, tamanho, precisão decimal, regra de transformação e dica de origem. Campos decimais exigem `decimal_precision` e `decimal_scale`; tipos não decimais não podem declarar precisão.

### Vigência e Status

As versões seguem o fluxo `DRAFT -> ACTIVE -> SUPERSEDED -> RETIRED`. Uma versão só pode ser criada como `DRAFT`. Ao ativar uma versão, o banco bloqueia sobreposição de vigência para o mesmo `state_id + system_name` quando já existir outra versão `ACTIVE`. A vigência usa intervalo fechado entre `effective_from` e `effective_to`; `effective_to = NULL` representa vigência aberta.

### Segurança e Auditoria

As três tabelas forçam RLS. Leitura exige `tce.catalog.read` ou `tce.catalog.manage`; mutação exige `tce.catalog.manage`. Como o catálogo é global, as políticas não usam `tenant_id`, mas todas as mutações disparam trigger de auditoria via `public.sgp_append_audit_event(...)`.

Os endpoints administrativos ficam em `backend/src/tce/catalog/` e usam `@RequirePermission`. A tela administrativa fica em `frontend/src/app/features/tce/catalog/`, com navegação UF -> sistemas -> versões -> campos. Operadores veem o catálogo em modo leitura; ações de ativar ou superar versão são protegidas no backend por `tce.catalog.manage`.

## TCE-03 — Adapter de Referencia AUDESP/SP

## TCE-03 — Adapter de Referencia AUDESP/SP

### Escopo

O adapter `audesp-sp` e a referencia concreta do contrato TCE para o sistema AUDESP do TCE-SP, categoria publica "Folha de Pagamento". Ele consome uma `payroll.payroll_run` com status `APPROVED`, gera um envelope XML local e persiste o ciclo em `tce.submission`. A versao inicial usa o placeholder publico `AUDESP 0.0.1` criado no catalogo TCE-02; nenhum dicionario proprietario do TCE-SP e embarcado.

### Mapeamento

O mapeamento parte de `payroll.payroll_run` e `payroll.v_payroll_run_line_active`, agrupando itens por servidor:

| AUDESP placeholder                  | Origem SGP                                                     |
| ----------------------------------- | -------------------------------------------------------------- |
| `AudespFolha.Cabecalho.OrgaoCodigo` | `hr.company.code`, com fallback controlado para CNPJ ou tenant |
| `CompetenciaAno` / `CompetenciaMes` | `payroll.payroll_run.competence_year/month`                    |
| `TipoRemessa`                       | constante `FOLHA_PAGAMENTO`                                    |
| `Servidor.Matricula`                | `hr.employee.registration`                                     |
| `Servidor.Cpf`                      | `hr.employee.cpf` somente digitos                              |
| `Servidor.Cargo`                    | `hr.job_position.name`, com fallback `NAO_INFORMADO`           |
| `Servidor.Proventos`                | soma de rubricas `EARNING`                                     |
| `Servidor.Descontos`                | soma de rubricas `DEDUCTION`                                   |
| `Servidor.Liquido`                  | proventos menos descontos                                      |

Valores monetarios sao tratados como `Decimal` e serializados em escala 2, sem `Math.round`.

### Stub e fail-safe

`TCE_STUB_MODE` tem default logico `true`. Nesse modo, `POST /api/v1/tce/audesp-sp/submissions/:id/submit` serializa o XML, calcula SHA-256, grava tamanho do request e chama `AudespStubServerService`, que gera protocolo deterministico `AUDESP-STUB-*`. A flag opcional `TCE_AUDESP_SP_FIXTURE_RESPONSE` permite fixar a resposta em teste.

Quando `TCE_STUB_MODE=false`, o adapter falha em modo seguro com erro explicito. O SGP v0.0.1 nao possui envio real ao TCE-SP; producao exige adapter especifico por instalacao, credenciais, homologacao e decisao de owner antes de habilitar rede.

### Persistencia, RLS e auditoria

`tce.submission` e tenant-scoped e referencia `tce.layout_version` e `payroll.payroll_run`. A tabela forca RLS com:

`sgp_tenant_matches(tenant_id) AND sgp_has_any_permission('tce.submission.read'|'tce.submission.manage')`

Mutacoes disparam trigger que chama `public.sgp_append_audit_event(...)`; os endpoints tambem usam `AuditService.auditMutation` para manter a trilha de API. Permissoes novas vivem no catalogo como `tce.submission.read` e `tce.submission.manage`.

### Superficie

Backend:

- `backend/src/tce/adapters/audesp-sp/audesp-sp.adapter.ts`
- `mapping/payroll-to-audesp.mapper.ts`
- `serializer/audesp-xml.serializer.ts`
- `validator/audesp-validator.service.ts`
- `stub/audesp-stub-server.service.ts`
- `audesp-sp.controller.ts`

Frontend:

- `frontend/src/app/features/tce/audesp-sp/`
- rota admin `tce/audesp-sp`

Testes:

- Mapper, serializer com fixture XML, validator, stub e fail-safe do adapter.
- E2E `tests/backend/tce-03-audesp-sp.e2e-spec.ts`.
- Probe RLS `tests/rls/tce-submission-cross-tenant.spec.ts`.

## TCE-04 Fila de Submissao

## TCE-04 Fila de Submissao

### Escopo

O submodulo `backend/src/tce/queue/` instala a infraestrutura operacional das submissoes TCE. Ele usa fila Postgres em `tce.submission_queue`, historico em `tce.submission_attempt` e circuit breaker global em `tce.adapter_circuit_state`. O envio real a governo continua fora do v0.0.1: em CI e desenvolvimento o adapter AUDESP/SP opera somente contra o stub local.

### Modelo operacional

O worker reclama jobs com `FOR UPDATE SKIP LOCKED`, muda o status para `LOCKED` e executa o adapter correspondente. Falhas transitorias retornam para `RETRY` com backoff exponencial e jitter; falhas definitivas ficam em `FAILED`; excesso de `max_attempts` vai para `DEAD_LETTER`. Jobs ja bloqueados por outro no nao sao reclamados pela mesma varredura.

O circuit breaker usa a chave `adapter_id + endpoint_url`. Tres falhas transitorias consecutivas abrem o circuito por padrao. Durante `OPEN`, novas execucoes registram tentativa `CIRCUIT_OPEN` e voltam para `RETRY`; apos o cooldown, o worker passa para `HALF_OPEN` e permite uma sonda. Sucesso fecha o circuito e zera a contagem. Operadores com `tce.submission.manage` podem resetar manualmente o circuito.

### API administrativa

- `GET /api/v1/tce/queue`: lista jobs com filtros `adapter`, `state_code`, `status` e `competence`.
- `GET /api/v1/tce/queue/:id`: retorna drilldown do job com historico de tentativas.
- `POST /api/v1/tce/queue/:id/replay`: reabre jobs `FAILED`, `RETRY` ou `DEAD_LETTER` para nova tentativa.
- `GET /api/v1/tce/circuits`: lista circuitos por adapter e endpoint.
- `POST /api/v1/tce/circuits/:adapter_id/:endpoint/reset`: fecha manualmente o circuito.

Leitura exige `tce.submission.read`; mutacao exige `tce.submission.manage`.

### RLS e auditoria

`tce.submission_queue` e `tce.submission_attempt` sao tenant-scoped e usam `sgp_tenant_matches(tenant_id) AND sgp_has_any_permission(...)`. `tce.adapter_circuit_state` e global: leitura e liberada para operadores de submissao, e escrita normal e restrita ao caminho de worker com `app.bypass_rls=true`. Mutacoes de fila e tentativas disparam `sgp_append_audit_event(...)`; endpoints administrativos tambem registram auditoria de API.

### UI

A tela `frontend/src/app/features/tce/queue/` fica em `#!/tce/queue`. Ela mostra filtros por UF/adapter/status/competencia, lista jobs com tentativas, proximo retry e ultimo erro, abre drilldown com historico e payload, e exibe circuitos com acao de reset.

## TCE RREO/RGF Fiscal Report Builders

**Status:** Implementado como esqueleto LRF neutro e source-pending por UF.

### Escopo

`backend/src/tce/builders/rreo.builder.ts` e
`backend/src/tce/builders/rgf.builder.ts` produzem envelopes JSON
deterministicos para relatórios fiscais RREO e RGF. O core e agnostico ao
estado, mas o envelope carrega perfil-alvo de UF para permitir que o relay TCE
mockado e futuros adapters estaduais preservem o contexto de tribunal, sistema,
transporte e URL de fonte.

### Contrato

Todo envelope RREO/RGF inclui:

- tipo do relatorio, versao de schema, fonte legal e edicao de leiaute;
- ente, responsavel, periodo legal, prazo, data de geracao e evidencia de
  publicacao;
- ponto de fechamento do livro de origem, hash da fonte e folhas associadas;
- perfil de UF (`SP`/`MG` neste corte), `layoutStatus=UNVERIFIED_LAYOUT` e
  `officialConformance=false`;
- hash de evidencia e chave de idempotencia deterministica para fila.

RREO exige periodo `BIMESTER` e linhas de demonstrativo com valores do periodo e
acumulados. RGF exige periodo `QUADRIMESTER`, Receita Corrente Liquida, despesa
total com pessoal e percentuais de limite legal, prudencial e alerta. Valores
monetarios usam `Decimal` e escala 2; percentuais usam escala 4.

### Limite de conformidade

O esqueleto atende ao contrato de periodo, responsavel, publicacao e fechamento
exigido pela LRF em `docs/eng/facts/law-tce.md`, mas nao declara conformidade
oficial com layout estadual. A promocao para leiaute oficial exige URL/edicao
aprovada em `tce.layout_version`, dicionario de campos, goldens do manual
selecionado e decisao de owner.

### Evidencia

- `backend/src/tce/builders/rreo.builder.ts`
- `backend/src/tce/builders/rgf.builder.ts`
- `backend/src/tce/builders/rreo-rgf.builder.spec.ts`
- `tests/backend/golden/tce/rreo-v01/`
- `tests/backend/golden/tce/rgf-v01/`

## Gov.br Advanced Signature Sandbox

## Gov.br Advanced Signature Sandbox

### Scope

R2-135 adds the v0.0.1 backend and portal boundary for self-service Gov.br
advanced signatures without selecting a production Gov.br provider or external
library. The implemented route is `POST /api/portal/v1/auth/govbr/sign`; the
local callback is `GET /api/portal/v1/auth/govbr/sign/callback`.

The portal currently uses this boundary for draft cadastral-change payloads in
`/meus-dados/:section`. The backend records a local sandbox evidence envelope
and redirects the user back to `/govbr-sign/callback`.

### Legal Contract

Regulatory source: Lei 14.063/2020, art. 4, II:
https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm

The sandbox envelope preserves these advanced-signature evidence fields:

| Lei 14.063/2020 art. 4, II requirement             | Local evidence                                                                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Associated uniquely to the signer                  | `signerUniqueKey` is derived from tenant, authenticated subject, and CPF claim when present.                                                       |
| Signer controls creation data with high confidence | The request uses an opaque `state` and one-time `challenge` controlled by the authenticated session and callback.                                  |
| Later modification is detectable                   | The envelope stores SHA-256 hashes over the canonical payload and signature metadata; verification fails when the payload changes after signature. |

This is not a production Gov.br integration. Production cutover must replace
`GovBrSignatureSandboxAdapter` with a provider adapter that supplies equivalent
or stronger evidence, while preserving the controller/service contract and
tests for approved and denied decisions.

### Runtime Behavior

1. Portal user edits a supported self-service payload.
2. Portal calls `POST /api/portal/v1/auth/govbr/sign` with the resource type,
   draft resource id, canonical payload, and return URL.
3. Backend creates a pending local request, hashes the payload, binds signer
   evidence to the authenticated actor, and returns a sandbox redirect URL.
4. Browser redirects to the sandbox callback.
5. Callback applies an approved or denied decision. Approved requests receive a
   `govbr-sandbox://advanced-signatures/{id}` evidence URI and tamper-evident
   envelope; denied requests close without signature evidence.
6. Backend redirects to the portal callback route with status and protocol id.

### Test Contract

`backend/src/auth/govbr/sign.service.spec.ts` covers approved and denied paths,
including payload-tamper detection against the generated advanced-signature
envelope. `backend/src/auth/govbr/sign.controller.spec.ts` covers controller
delegation and callback redirect behavior.

## TCE State Source-Pending Adapters

## TCE State Source-Pending Adapters

**Status:** Implementado como sandbox source-pending | **Wave:** 9

### Scope

The TCE state payroll adapter set registers deterministic adapters for:

`tce-mg`, `tce-rj`, `tce-rs`, `tce-pr`, `tce-ba`, `tce-pe`, `tce-ce`, `tce-df`, `tce-go`, and `tce-sc`.

These adapters implement the `TceAdapter` contract and are discoverable through the TCE registry. They intentionally do not claim official regulatory conformance and do not select a layout version. Each adapter supports internal layout `0.0.1` with `sourceStatus=UNVERIFIED_LAYOUT`.

### Source boundary

Official-source findings on 2026-05-03:

- TCE-MG published 2026 material for SICOM Folha de Pagamento, including a 2026 cartilha announcement and public PDF.
- TCE-RS publishes SIAPC/PAD layout material, including payroll file references such as `TCE_4810.TXT` and `TCE_4820.TXT`.
- TCE-RJ public SIGFIS pages were located, but no verified payroll layout dictionary was selected.
- The other state prompts remained unverified in the round backlog and require owner-selected source URLs before official output is enabled.

### Contract behavior

The source-pending adapter:

- validates only explicit sandbox payloads with `sourceStatus=UNVERIFIED_LAYOUT`;
- serializes deterministic JSON for golden testing;
- returns `PENDING` with protocol prefix `SOURCE-PENDING-*`;
- reports health as `source-pending-sandbox`;
- records `officialConformance=false`.

This keeps the registry, discovery, lifecycle, and CI golden surface green without inventing official layouts.

### Evidence

- Adapter base: `backend/src/tce/adapters/state-payroll/state-payroll-adapter.base.ts`
- State adapters: `backend/src/tce/adapters/tce-mg/` and sibling `tce-*` folders
- Golden fixture: `tests/backend/fixtures/tce/state-payroll/source-pending-goldens.json`
- Unit spec: `backend/src/tce/adapters/state-payroll/state-payroll-adapters.spec.ts`
- Registry e2e: `tests/backend/tce-01-adapter-contract.e2e-spec.ts`

### Production enablement gate

Before any adapter can submit official files:

1. Record the official source URL and layout edition in `tce.layout_version`.
2. Replace `UNVERIFIED_LAYOUT` with the approved layout status.
3. Add field-level layout metadata and parser/serializer goldens from the official dictionary.
4. Add endpoint-specific submission behavior or a tenant-owned connector.
5. Re-run `npm run test:coverage`, `npm run governance:check`, and `DATABASE_URL=... npm run db:smoke`.

## MANAD Export Package

**Status:** Implemented as a deterministic SGP report-worker export package.

M.06 MANAD is generated by the report worker from tenant-scoped approved, paid,
or closed payroll runs. The SGP-owned contract is a deterministic evidence
package, not direct RFB transmission. The TXT artifact uses the `MANAD-SGP-V1`
layout with header, item, and total records. The JSON artifact carries the same
rows and totals for operator reconciliation.

### Evidence

- Runtime: `backend/src/report-service/manad-export-report.service.ts`
- Worker routing: `backend/src/report-service/report-worker.service.ts`
- Data source: `payroll.payroll_run`, `payroll.employee_payroll_item`,
  `payroll.payroll_earning_deduction`, and `hr.employee`
- Golden fixture: `tests/backend/golden/manad-v01/expected.txt`
- Focused spec: `backend/src/report-service/manad-export-report.service.spec.ts`

Generated files are persisted through `public.generated_report_file`, so the
existing generated-report audit trigger records insert/update/delete mutations.
Official RFB upload, receipt polling, and homologation remain outside this SGP
runtime unless reopened by owner decision.

## Official Fiscal Export Primitives

**Status:** Implementado como geradores determinísticos com layout selecionado pelo chamador

### Scope

Wave 9 adds export primitives for:

- Siconfi RREO/RGF under `backend/src/integrations-worker/siconfi/`
- SIOPE under `backend/src/integrations-worker/siope/`
- SIOPS under `backend/src/integrations-worker/siops/`

The generators produce deterministic CSV goldens and require the caller to provide `sourceStatus=CALLER_SELECTED_OFFICIAL_LAYOUT`, `layoutEdition`, and `sourceUrl`. They do not choose a regulatory layout version internally.

### Source anchors

- RREO/RGF: LC 101/2000 and Tesouro Nacional MDF/Siconfi material. The Tesouro page identified the 15th MDF edition as the current edition on 2026-05-03.
- SIOPE: Decreto 6.253/2007, Lei 10.832/2003, and FNDE SIOPE downloads. The FNDE downloads page listed 2026 annual version `26.0.1.2` dated 2026-04-10.
- SIOPS: LC 141/2012 and Ministry of Health/FNS SIOPS material. The FNS notice published 2026 first-bimester structure availability on 2026-04-01.

### Safety boundary

These generators are contract primitives, not final government transmitters. They are safe to use for internal evidence packages when the caller records the official layout source. They must not be branded as accepted Siconfi, SIOPE, or SIOPS transmissions until the target system import/export contract is verified and covered by an official-layout golden.

R5-40 adds local queue-backed mock relays for SICONFI, SIOPE, and SIOPS. Those relays emit deterministic sandbox acknowledgements through the R4-95 queue contract only. Real federal transmission, import automation, credentials, homologation, production acceptance, and official receipt polling remain OUT of the SGP v0.0.1 runtime boundary unless a later owner decision authorizes a specific connector.

### Evidence

- `backend/src/integrations-worker/siconfi/rreo-rgf.generator.spec.ts`
- `backend/src/integrations-worker/siope/siope-export.generator.spec.ts`
- `backend/src/integrations-worker/siops/siops-export.generator.spec.ts`
- `tests/backend/fixtures/official-exports/`
