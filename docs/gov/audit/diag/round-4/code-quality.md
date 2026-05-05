# Code Quality (Round 4)

Round-4 inherits the round-2 A–J code-quality scorecard at [`docs/work/round-2/08-code-quality.md`](../../../../work/round-2/08-code-quality.md). Schema unchanged from round-1 §13.1. This file overlays the round-4 deltas.

**Headline:** the three round-2-flagged top-LOC risks are **closed by R4 decompositions**:

- `employees.service.ts` 1 763 → **163 LOC** (R4-40, −90.7 %)
- `integrations-worker.service.ts` 1 428 → **449 LOC** (R4-41, −68.6 %)
- `avaliacao.service.ts` 1 140 → **103 LOC** (R4-42, −91.0 %)

A new top-1 file emerges: `report-worker.service.ts` at 1 032 LOC (round-3 was 985, +47 from R4-02 concurrency guard). This is the **next** decomposition target.

## A. File-size hotspots — top 15 backend `*.ts` (excl. spec/generated, post-R4)

|   LOC | Path                                                                                                                                                                                        | Round-3 LOC |         Δ | Notes                                                                                                         |
| ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------: | --------: | ------------------------------------------------------------------------------------------------------------- |
| 1 032 | [`backend/src/report-service/report-worker.service.ts`](../../../../../backend/src/report-service/report-worker.service.ts)                                                                 |         985 |       +47 | R4-02 concurrency guard. **New top-1; round-5 split candidate.**                                              |
|   930 | [`backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts`](../../../../../backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts) |         930 |         0 | Stable.                                                                                                       |
|   927 | [`backend/src/esocial-worker/parsers/totalizer.parser.ts`](../../../../../backend/src/esocial-worker/parsers/totalizer.parser.ts)                                                           |  ~50 (stub) |  **+877** | R4-12 + R4-13 mapped parsers. Acceptable for now; split if S-5003/S-5011/S-5013 grow.                         |
|   923 | [`backend/src/folha-pagamento/payroll/folha-mensal.workflow.ts`](../../../../../backend/src/folha-pagamento/payroll/folha-mensal.workflow.ts)                                               |         923 |         0 | Stable.                                                                                                       |
|   875 | [`backend/src/convenio/internships/internships.service.ts`](../../../../../backend/src/convenio/internships/internships.service.ts)                                                         |         875 |         0 | Stable.                                                                                                       |
|   797 | [`backend/src/folha-pagamento/rescisao/rescisao.service.ts`](../../../../../backend/src/folha-pagamento/rescisao/rescisao.service.ts)                                                       |         797 |         0 | Stable.                                                                                                       |
|   772 | [`backend/src/portal/portal.service.ts`](../../../../../backend/src/portal/portal.service.ts)                                                                                               |         772 |         0 | Stable.                                                                                                       |
|   752 | [`backend/src/saude/pericia.service.ts`](../../../../../backend/src/saude/pericia.service.ts)                                                                                               |         752 |         0 | Stable.                                                                                                       |
|   748 | [`backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts`](../../../../../backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts)                                   |         607 |  **+141** | R4-10 CSLL adicional. Reasonable; might split if R-2000/R-2055 builders converge.                             |
|   731 | [`backend/src/previdenciario/previdenciario.dto.ts`](../../../../../backend/src/previdenciario/previdenciario.dto.ts)                                                                       |         731 |         0 | DTO catalog; size acceptable.                                                                                 |
|   727 | [`backend/src/folha-pagamento/import/pensionista-import.service.ts`](../../../../../backend/src/folha-pagamento/import/pensionista-import.service.ts)                                       |         727 |         0 | R2-71 landing; capped at maturity 3 pending NQ-1.                                                             |
|   726 | [`backend/src/rh/workflows/rh-workflows.controller.ts`](../../../../../backend/src/rh/workflows/rh-workflows.controller.ts)                                                                 |         726 |         0 | Controller surface; consider DTO/decorator extraction.                                                        |
|   725 | [`backend/src/previdenciario/previdenciario.controller.ts`](../../../../../backend/src/previdenciario/previdenciario.controller.ts)                                                         |         725 |         0 | Controller surface; same comment.                                                                             |
|   690 | [`backend/src/report-service/payslip/payslip-render.service.ts`](../../../../../backend/src/report-service/payslip/payslip-render.service.ts)                                               |        ~690 |         0 | Stable.                                                                                                       |
|   635 | [`backend/src/esocial-worker/parsers/totalizer.parser.spec.ts`](../../../../../backend/src/esocial-worker/parsers/totalizer.parser.spec.ts)                                                 |       small | **+~600** | R4-12+R4-13 spec growth (excluded from production hotspot list per "non-spec" filter — listed for awareness). |

Files **exiting** the top 15 (round-3 → round-4):

- `employees.service.ts` 1 763 → 163 (left top 15).
- `integrations-worker.service.ts` 1 428 → 449 (left top 15).
- `avaliacao.service.ts` 1 140 → 103 (left top 15).
- `pensionista-import.service.ts` was at #12 with 727; still there at #11.

## B. New code surfaces (R4 additions, parallel to hotspots)

These are new files added in R4 that constitute the SGP boundary architecture. None individually large, but worth recording:

| LOC | Path                                                                                                                                                              | R4-\* item             |
| --: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 504 | [`backend/src/auth/govbr/software-pades-pkcs7.signer.ts`](../../../../../backend/src/auth/govbr/software-pades-pkcs7.signer.ts)                                   | R4-01                  |
| 427 | [`backend/src/common/adapters/queue-adapter.ts`](../../../../../backend/src/common/adapters/queue-adapter.ts)                                                     | R4-95                  |
| 412 | [`backend/src/tce/builders/rreo.builder.ts`](../../../../../backend/src/tce/builders/rreo.builder.ts)                                                             | R4-15                  |
| 400 | [`backend/src/integrations-worker/dispatcher/previdentiary.dispatcher.ts`](../../../../../backend/src/integrations-worker/dispatcher/previdentiary.dispatcher.ts) | R4-41 (sub-dispatcher) |
| 377 | [`backend/src/avaliacao/progression-simulation.service.ts`](../../../../../backend/src/avaliacao/progression-simulation.service.ts)                               | R4-42 (sub-service)    |
| 377 | [`backend/src/external/mocks/esocial-relay/esocial-relay.mock.ts`](../../../../../backend/src/external/mocks/esocial-relay/esocial-relay.mock.ts)                 | R4-97                  |
| 354 | [`backend/src/integrations-worker/cnab240/adapters/queue-adapter.ts`](../../../../../backend/src/integrations-worker/cnab240/adapters/queue-adapter.ts)           | R4-98                  |
| 336 | [`backend/src/esocial-worker/adapters/queue-adapter.ts`](../../../../../backend/src/esocial-worker/adapters/queue-adapter.ts)                                     | R4-97                  |
| 328 | [`backend/src/rh/employees/employee-registry.service.ts`](../../../../../backend/src/rh/employees/employee-registry.service.ts)                                   | R4-40 (sub-service)    |
| 318 | [`backend/src/integrations-worker/dispatcher/cnab240.dispatcher.ts`](../../../../../backend/src/integrations-worker/dispatcher/cnab240.dispatcher.ts)             | R4-41                  |
| 314 | [`backend/src/rh/employees/employee-contract-regime.service.ts`](../../../../../backend/src/rh/employees/employee-contract-regime.service.ts)                     | R4-40                  |
| 300 | [`backend/src/external/mocks/tce-relay/tce-relay.ts`](../../../../../backend/src/external/mocks/tce-relay/tce-relay.ts)                                           | R4-96                  |
| 287 | [`backend/src/external/mocks/banking-relay/banking-relay.ts`](../../../../../backend/src/external/mocks/banking-relay/banking-relay.ts)                           | R4-98                  |
| 275 | [`backend/src/tce/adapters/queue-adapter.ts`](../../../../../backend/src/tce/adapters/queue-adapter.ts)                                                           | R4-96                  |
| 261 | [`backend/src/rh/employees/employee-cadastral-changes.service.ts`](../../../../../backend/src/rh/employees/employee-cadastral-changes.service.ts)                 | R4-40                  |

The decomposition pattern is clean: no new sub-service exceeds 430 LOC; the mock relays are bounded (~300 LOC each).

## C. Hotspots (commit-window churn)

[`hotspots.md`](./hotspots.md) shows the round-3 → round-4 LOC churn. Top entries:

1. `employees.service.ts` — 80 LOC added, **1 681 LOC removed** (now 163). R4-40 decomposition.
2. `avaliacao.service.ts` — 48 added, **1 086 removed** (now 103). R4-42.
3. `integrations-worker.service.ts` — 57 added, **1 037 removed** (now 449). R4-41.
4. `totalizer.parser.ts` — 585 added, 50 removed (now 928). R4-12+R4-13.
5. `software-pades-pkcs7.signer.ts` — 503 added (new). R4-01.
6. `employee-lifecycle.service.ts` — 427 added (new). R4-40 sub-service.
7. `queue-adapter.ts` (common) — 426 added (new). R4-95.
8. `rreo.builder.ts` — 411 added (new). R4-15.

Extracted services + new domain primitives dominate; no fragile churn pattern.

## D. SQL hotspots (post-R4)

|     LOC | Path                                         | R3 → R4                                |
| ------: | -------------------------------------------- | -------------------------------------- |
|   3 190 | `database/sql/40-payroll_calc-functions.sql` | unchanged                              |
|   2 690 | `database/sql/70-hr-final.sql`               | + small CF 37 XVI matrix DDL extension |
|   1 994 | `database/sql/10-05-hr-ddl.sql`              | + accumulation matrix table (R4-17)    |
|   1 032 | `database/sql/40-recrutamento-functions.sql` | unchanged                              |
| **NEW** | `database/sql/91-reference-data.sql`         | R4-71/R4-72                            |
| **NEW** | `database/sql/92-audit-final.sql`            | R4-70                                  |

Total SQL LOC: **25 701** (was 25 025; +676 LOC across 2 new files + edits to existing).

## E. Other quality dimensions

| Dimension                            | Round-3 verdict | Round-4 delta                                                                                                                 |
| ------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| F. Test density (tests / source LOC) | 0.179           | **0.196** ((34 055 + ~31 000 in-tree spec) / (149 235 backend + 21 950 frontend non-spec)) — modest gain from +3 325 test LOC |
| G. Generated artefact freshness      | OpenAPI 3.1     | OpenAPI 3.1 (unchanged; routes 488 unchanged)                                                                                 |
| H. Lint / format                     | green           | green; **+ new ESLint rule** `no-raw-handler-logging` (R4-30)                                                                 |
| I. Typecheck                         | green           | green                                                                                                                         |
| J. Cyclic dependencies               | none flagged    | unchanged                                                                                                                     |
| **K. NFR coverage (NEW)**            | 8/15 DONE       | **12/15 DONE** (+4: NFR-003 decimal, NFR-004 idempotency, NFR-006 observability, NFR-007 logging)                             |
| **L. Decimal coverage (NEW)**        | not measured    | **714 files / 0 violations** ([`decimal-coverage.md`](./decimal-coverage.md))                                                 |
| **M. Idempotency coverage (NEW)**    | partial         | **9/9 surfaces (100 %)** ([`idempotency-coverage.md`](./idempotency-coverage.md))                                             |
| **N. FE i18n coverage (NEW)**        | not measured    | **268 files / 251 hard-coded string candidates** ([`fe-i18n-coverage.md`](./fe-i18n-coverage.md))                             |

## F. Code-quality findings new in round-4

1. **The R4-40/R4-41/R4-42 decomposition pattern is strong** — three top-3 round-3 risks closed without DTO/route changes. New sub-services land in same module with bounded LOC (each ≤ 430 LOC).
2. **`report-worker.service.ts` is the next risk** — round-2 risk #6 (concurrency) closed by R4-02, but file grew to 1 032 LOC. Round-5 candidate: split.
3. **`totalizer.parser.ts` consolidates eSocial totalizer logic** — 927 LOC bundles S-5001/2/3/11/12/13 parsers. Acceptable as a parser bundle; consider splitting if any single parser hits ~500 LOC.
4. **No new cyclic dependencies introduced** — the queue contract is one-way (SGP adapter → mock relay), no cycles.
5. **Audit-tooling now has 4 new coverage scripts** — decimal, idempotency, fe-i18n, docs-refs-cross-reference. Each locked by spec under [tests/scripts/](../../../../../tests/scripts/).
6. **Lint rule `no-raw-handler-logging`** rejects raw `console.log` / default `Logger` in handlers (R4-30). New permanent quality gate.
