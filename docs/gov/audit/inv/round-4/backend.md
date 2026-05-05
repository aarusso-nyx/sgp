# Backend Inventory (Round 4)

Narrative wrapper. Authority for the backend lives in [`backend/src/`](../../../../../backend/src/). The exhaustive controller × route × DTO map is in [`docs/gov/audit/api-surface.md`](../../api-surface.md) (488 implemented routes, unchanged from round-3). Round-4 inherits round-3's deep map at [`docs/gov/audit/inv/round-3/backend.md`](../round-3/backend.md); this file overlays the round-4 delta.

## Topology snapshot at HEAD `ea0966c`

| Aspect                      | Round-3 | Round-4     | Δ                                                                                 |
| --------------------------- | ------- | ----------- | --------------------------------------------------------------------------------- |
| Backend `*.ts` files        | 985     | **1 052**   | **+67**                                                                           |
| Backend LOC excl. generated | 140 421 | **149 235** | **+8 814 (+6.3 %)**                                                               |
| `@Controller(...)` files    | 132     | **132**     | 0 (no new public route surface; SGP boundary architecture is internal/queue-only) |
| Implemented HTTP routes     | 488     | **488**     | 0                                                                                 |
| Entrypoints (`main*.ts`)    | 7       | **7**       | 0                                                                                 |

## Round-4 deltas — by R4-\* item

### W1 — production blockers + architectural foundation

| R4-\*                                           | Landing surface                                                                                                                                                                                                                                                   | Evidence                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **R4-01** PAdES PKCS#7                          | new [`backend/src/auth/govbr/software-pades-pkcs7.signer.ts`](../../../../../backend/src/auth/govbr/software-pades-pkcs7.signer.ts) (503 LOC) — software-cert variant; signs/verifies S-1299 first slice. HSM decision recorded in deferred ledger                | new spec under tests/backend                        |
| **R4-02** Report-worker concurrency             | [`backend/src/report-service/report-worker.service.ts`](../../../../../backend/src/report-service/report-worker.service.ts) +77 LOC — concurrency guard; new e2e spec                                                                                             | tests/backend/report-worker-concurrency.e2e-spec.ts |
| **R4-03** Worker scheduling                     | new [`backend/src/common/worker-scheduling/worker-poll-scheduler.service.ts`](../../../../../backend/src/common/worker-scheduling/worker-poll-scheduler.service.ts) (175 LOC) — replaces raw `setInterval` in worker entrypoints; main-\*-worker.ts files updated | new specs                                           |
| **R4-95** Adapter ↔ mock-service queue contract | new [`backend/src/common/adapters/queue-adapter.ts`](../../../../../backend/src/common/adapters/queue-adapter.ts) (426 LOC) + spec (210 LOC)                                                                                                                      | tests cover happy path + retry + DLQ + correlation  |

### W2 — fiscal regulatory carry-over

| R4-\*                             | Landing surface                                                                                                                                                                                                                                                                                | Evidence                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **R4-10** DCTFWeb CSLL/MIT        | [`backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts`](../../../../../backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts) +141 LOC; controller + DTO updates; spec                                                                                             | new golden `tests/backend/golden/dctfweb-csll-v01/`    |
| **R4-11** EFD-Reinf R-2055/R-2000 | new [`backend/src/integrations-worker/efd-reinf/builders/r2055.builder.ts`](../../../../../backend/src/integrations-worker/efd-reinf/builders/r2055.builder.ts) (135 LOC) + [`r2000.builder.ts`](../../../../../backend/src/integrations-worker/efd-reinf/builders/r2000.builder.ts) (222 LOC) | new golden `tests/backend/golden/efd-reinf-r2055-v01/` |
| **R4-12** S-5002 totalizer parser | [`backend/src/esocial-worker/parsers/totalizer.parser.ts`](../../../../../backend/src/esocial-worker/parsers/totalizer.parser.ts) +585 LOC (includes R4-13)                                                                                                                                    | new fixtures `s5002-totalizer{,_retro}.golden.xml`     |
| **R4-13** S-5012 totalizer parser | same file as R4-12; +S-5012 mapping + reconciliation spec                                                                                                                                                                                                                                      | new fixture `s5012-totalizer.golden.xml`               |

### W3 — TCE/state + mock relays (SGP boundary)

| R4-\*                                            | Landing surface                                                                                                                                                                                                                                                                                                            | Evidence                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **R4-16** Regulatory fixture conventions         | new goldens under `tests/backend/golden/` — `manual-entry-import-v01/`, `servidor-import-v01/`, `pensionista-import-v01/` (PARTIAL — legacy XLSX byte-parity blocked per `QUESTIONS.md`)                                                                                                                                   | structural goldens shipped                                                          |
| **R4-15** TCE RREO/RGF skeleton                  | new [`backend/src/tce/builders/rreo.builder.ts`](../../../../../backend/src/tce/builders/rreo.builder.ts) (411 LOC) + [`rgf.builder.ts`](../../../../../backend/src/tce/builders/rgf.builder.ts) (181 LOC); goldens for SP+MG                                                                                              | tests/backend/golden/tce/{rreo-v01,rgf-v01}/                                        |
| **R4-14** SIAFIC e2e/golden                      | new [`tests/backend/golden/siafic-v01/`](../../../../../tests/backend/golden/siafic-v01/) (PARTIAL — Decreto 11.453/2023 layout source-pending per `QUESTIONS.md`); neutral JSON contract                                                                                                                                  | flagged `officialConformance=false`                                                 |
| **R4-96** Mock TCE relay + adapter               | new [`backend/src/external/mocks/tce-relay/tce-relay.ts`](../../../../../backend/src/external/mocks/tce-relay/tce-relay.ts) (300 LOC) + [`backend/src/tce/adapters/queue-adapter.ts`](../../../../../backend/src/tce/adapters/queue-adapter.ts) (275 LOC)                                                                  | end-to-end spec                                                                     |
| **R4-81** TCE state submission wired             | TCE submission flow exercised against ≥ 2 state-shaped payloads via mock relay                                                                                                                                                                                                                                             | spec                                                                                |
| **R4-97** Mock eSocial relay + adapter           | new [`backend/src/external/mocks/esocial-relay/esocial-relay.mock.ts`](../../../../../backend/src/external/mocks/esocial-relay/esocial-relay.mock.ts) (376 LOC) + [`backend/src/esocial-worker/adapters/queue-adapter.ts`](../../../../../backend/src/esocial-worker/adapters/queue-adapter.ts) (336 LOC); supports S-1299 | flagged: PARTIAL — owner decision pending on multi-class expansion (`QUESTIONS.md`) |
| **R4-90** eSocial submission wired through R4-97 | [`backend/src/esocial-worker/submission/submission.service.ts`](../../../../../backend/src/esocial-worker/submission/submission.service.ts) +146 LOC; queue mode supports S-1299 only; other classes get `ESOCIAL_QUEUE_EVENT_UNSUPPORTED` instead of silent SOAP fallback                                                 | safe-default per `QUESTIONS.md`                                                     |
| **R4-98** Mock banking relay + adapter           | new [`backend/src/external/mocks/banking-relay/banking-relay.ts`](../../../../../backend/src/external/mocks/banking-relay/banking-relay.ts) (287 LOC) + [`backend/src/integrations-worker/cnab240/adapters/queue-adapter.ts`](../../../../../backend/src/integrations-worker/cnab240/adapters/queue-adapter.ts) (354 LOC)  | 5-bank fixture round-trip via mock                                                  |
| **R4-91** Banking CNAB240 wired through R4-98    | new [`backend/src/integrations-worker/cnab240/cnab240-relay-dispatch.service.ts`](../../../../../backend/src/integrations-worker/cnab240/cnab240-relay-dispatch.service.ts) (98 LOC)                                                                                                                                       | in-process dispatch removed                                                         |

### W4 — critical-path deepening

| R4-\*                            | Landing surface                                                                                                                                                                             | Evidence                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **R4-17** CF 37 XVI accumulation | new [`backend/src/rh/employees/accumulation.service.ts`](../../../../../backend/src/rh/employees/accumulation.service.ts) (112 LOC) + spec; matrix table in `database/sql/10-05-hr-ddl.sql` | spec covers professor+técnico (legal), 2 comissionados (illegal)                                              |
| **R4-20** PII encryption batch   | extended `database/sql/15-pii-encryption.sql` (per R4-70); 19 cols → ciphertext siblings                                                                                                    | live-data inventory shows 0 plaintext at high/medium                                                          |
| **R4-21** Idempotency adoption   | new [`scripts/lib/audit/idempotency-coverage.mjs`](../../../../../scripts/lib/audit/idempotency-coverage.mjs); folha-pagamento services thread idempotency keys                             | [diag/round-4/idempotency-coverage.md](../../diag/round-4/idempotency-coverage.md) shows 9/9 = 100%           |
| **R4-22** Decimal policy breadth | new [`scripts/lib/audit/decimal-coverage.mjs`](../../../../../scripts/lib/audit/decimal-coverage.mjs)                                                                                       | [diag/round-4/decimal-coverage.md](../../diag/round-4/decimal-coverage.md) — 0 violations across 714 TS files |

### W5 — observability + structured logging

| R4-\*                                 | Landing surface                                                                                                                                                                                                                                                                 | Evidence                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **R4-30** Readiness + logging ratchet | new [`backend/eslint-rules/no-raw-handler-logging.js`](../../../../../backend/eslint-rules/no-raw-handler-logging.js) (63 LOC) + new [`backend/src/common/bootstrap/worker-readiness-probe.ts`](../../../../../backend/src/common/bootstrap/worker-readiness-probe.ts) (98 LOC) | NFR-007 → DONE per closure manifest + [docs/gov/audit/non-functional-requisites.md:25](../../non-functional-requisites.md) |
| **R4-31** Observability breadth       | new [`backend/src/common/observability/worker-poll-observability.ts`](../../../../../backend/src/common/observability/worker-poll-observability.ts) (101 LOC); domain counters for payroll/eSocial/DCTFWeb                                                                      | NFR-006 → DONE per [docs/gov/audit/non-functional-requisites.md:24](../../non-functional-requisites.md)                    |

### W6 — code-quality decomposition

| R4-\*                                            | Landing surface                                                                                                                                                                                                                                          |                                                   LOC delta |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------: |
| **R4-40** `employees.service.ts` decomposition   | New sub-services under `backend/src/rh/employees/`: `employee-{lifecycle,registry,reference-data,contract-regime,cadastral-changes,abono-permanencia,version}.service.ts` + `employee-mappers.ts` + `employees.types.ts` (~1 800 LOC across 9 new files) |         `employees.service.ts` 1 763 → **163 LOC** (−1 600) |
| **R4-41** `integrations-worker.service.ts` split | New per-kind dispatchers under `backend/src/integrations-worker/dispatcher/`: `cnab240`, `esocial-event`, `gfip`, `evaluation`, `previdentiary` (~1 100 LOC across 6 new files)                                                                          | `integrations-worker.service.ts` 1 428 → **449 LOC** (−979) |
| **R4-42** `avaliacao.service.ts` split           | New sub-services: `avaliacao-data-access`, `career-plan-runtime`, `evaluation-report`, `performance-evaluation`, `progression-simulation` (~1 200 LOC across 5 new files)                                                                                |         `avaliacao.service.ts` 1 140 → **103 LOC** (−1 037) |

### W7 — DB hardening

| R4-\*                                       | Landing surface                                                                                                      | Evidence                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **R4-70** Audit-column/trigger gaps closure | +12 triggers per schema digest; new `database/sql/92-audit-final.sql`                                                | live-data inventory re-run shows 0 mutating audit-column gaps |
| **R4-71** ANY ARRAY → enums                 | per-constraint conversions in `database/sql/02-schemas.sql` and per-table DDL files                                  | spec asserts converted columns                                |
| **R4-72** Reference catalogs RLS posture    | `COMMENT ON TABLE` for 4 unprotected catalogs; new spec at [tests/db/](../../../../../tests/db/) asserts list parity | regression gate                                               |

### W8/W9 — frontend + docs

| R4-\*                               | Landing surface                                                                                                                 | Evidence                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **R4-51** FE async/signals breadth  | features modernized; `.subscribe()` count below 50                                                                              | new spec/lint rule                                                                                                    |
| **R4-52** FE i18n baseline          | new [`scripts/lib/audit/fe-i18n-coverage.mjs`](../../../../../scripts/lib/audit/fe-i18n-coverage.mjs)                           | [diag/round-4/fe-i18n-coverage.md](../../diag/round-4/fe-i18n-coverage.md) — 251 hardcoded strings across 14 features |
| **R4-80** docs/refs cross-reference | new section in `docs/eng/domains/fiscal-integrations.md`; spec under `tests/scripts/docs-refs-cross-reference.spec.ts` (41 LOC) | guarded by spec                                                                                                       |

## Module size table — top 15 backend `*.ts` (excl. spec/generated)

|   LOC | Path                                                                                                                                                                                        | Round-3 LOC |                             Δ |
| ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------: | ----------------------------: |
| 1 032 | [`backend/src/report-service/report-worker.service.ts`](../../../../../backend/src/report-service/report-worker.service.ts)                                                                 |         985 | +47 (R4-02 concurrency guard) |
|   930 | [`backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts`](../../../../../backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts) |         930 |                             0 |
|   927 | [`backend/src/esocial-worker/parsers/totalizer.parser.ts`](../../../../../backend/src/esocial-worker/parsers/totalizer.parser.ts)                                                           |         ~50 |      **+877 (R4-12 + R4-13)** |
|   923 | [`backend/src/folha-pagamento/payroll/folha-mensal.workflow.ts`](../../../../../backend/src/folha-pagamento/payroll/folha-mensal.workflow.ts)                                               |         923 |                             0 |
|   875 | [`backend/src/convenio/internships/internships.service.ts`](../../../../../backend/src/convenio/internships/internships.service.ts)                                                         |         875 |                             0 |
|   797 | [`backend/src/folha-pagamento/rescisao/rescisao.service.ts`](../../../../../backend/src/folha-pagamento/rescisao/rescisao.service.ts)                                                       |         797 |                             0 |
|   772 | [`backend/src/portal/portal.service.ts`](../../../../../backend/src/portal/portal.service.ts)                                                                                               |         772 |                             0 |
|   752 | [`backend/src/saude/pericia.service.ts`](../../../../../backend/src/saude/pericia.service.ts)                                                                                               |         752 |                             0 |
|   748 | [`backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts`](../../../../../backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts)                                   |         607 |              **+141 (R4-10)** |
|   731 | [`backend/src/previdenciario/previdenciario.dto.ts`](../../../../../backend/src/previdenciario/previdenciario.dto.ts)                                                                       |         731 |                             0 |
|   727 | [`backend/src/folha-pagamento/import/pensionista-import.service.ts`](../../../../../backend/src/folha-pagamento/import/pensionista-import.service.ts)                                       |         727 |                             0 |
|   726 | [`backend/src/rh/workflows/rh-workflows.controller.ts`](../../../../../backend/src/rh/workflows/rh-workflows.controller.ts)                                                                 |         726 |                             0 |
|   725 | [`backend/src/previdenciario/previdenciario.controller.ts`](../../../../../backend/src/previdenciario/previdenciario.controller.ts)                                                         |         725 |                             0 |
|   690 | [`backend/src/report-service/payslip/payslip-render.service.ts`](../../../../../backend/src/report-service/payslip/payslip-render.service.ts)                                               |        ~690 |                             0 |

**Note:** `employees.service.ts` (was #1 at 1 763 LOC) is now 163 LOC after R4-40 decomposition; `integrations-worker.service.ts` (was #2 at 1 428 LOC) is now 449 LOC after R4-41 split; `avaliacao.service.ts` (was #3 at 1 140 LOC) is now 103 LOC after R4-42 split. **Top-3 round-3 risks closed.**

## Auth, audit & RBAC posture (deltas)

- **PAdES**: hint-embedder replaced by full PKCS#7 signer for S-1299; R4-01 closed for the first event class; software-cert variant chosen, HSM decision deferred.
- **Audit interceptor** (NFR-002): unchanged.
- **RBAC** (NFR-005): unchanged.
- **Throttler** (NFR-008): unchanged.
- **CORS** (NFR-009): unchanged.
- **Observability** (NFR-006): **PROMOTED to DONE** per [docs/gov/audit/non-functional-requisites.md:24](../../non-functional-requisites.md) — OTel/Prometheus instrumentation across folha-pagamento/eSocial/DCTFWeb.
- **Structured logging** (NFR-007): **PROMOTED to DONE** per [docs/gov/audit/non-functional-requisites.md:25](../../non-functional-requisites.md) — handler lint rule + bootstrap-logger coverage + readiness probes.
- **Idempotency** (NFR-004): **PROMOTED to DONE** — 9/9 surfaces covered.
- **Decimal policy** (NFR-003): **PROMOTED to DONE** — 0 violations across 714 TS files.
- **Audit immutability** + RLS + RBAC + rate-limit + CORS + governance gate + FE coverage + Playwright + API contract: all DONE (8 NFRs from round-3, now joined by 4 more = **12 / 15 DONE**).

## SGP boundary architecture (NEW in R4)

The **2-way message-queue contract** (R4-95) is the new architectural foundation. SGP terminates at adapters that talk to mock relay services via this contract:

- TCE: `backend/src/tce/adapters/queue-adapter.ts` ↔ `backend/src/external/mocks/tce-relay/`
- eSocial: `backend/src/esocial-worker/adapters/queue-adapter.ts` ↔ `backend/src/external/mocks/esocial-relay/` (S-1299 only; multi-class expansion blocked per `QUESTIONS.md`)
- Banking: `backend/src/integrations-worker/cnab240/adapters/queue-adapter.ts` ↔ `backend/src/external/mocks/banking-relay/`

Real homologation against TCE / eSocial / banking endpoints remains explicitly OUT of SGP scope per the owner decision recorded 2026-05-03 (recorded in `docs/gov/evidence/deferred-decision-ledger.md` per R4-62).
