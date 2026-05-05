# Code Quality (Round 9 — eSocial-excluded narrative)

Round-9 inherits the round-2 A–J code-quality scorecard at [`docs/work/round-2/08-code-quality.md`](../../../../work/round-2/08-code-quality.md). Round-4 overlay at [`docs/gov/audit/diag/round-4/code-quality.md`](../round-4/code-quality.md). This file overlays the round-5 + round-6 in-flight delta and the post-eSocial-extraction framing.

**Headline:** R5-02 closes the round-4-flagged top-1 LOC risk (`report-worker.service.ts` 1 032 LOC). Decomposition into 5 sub-services + helper modules. New top-1 LOC observation pending post-decomposition file-size scan.

## A. File-size hotspots — eSocial-excluded view

R5-02 decomposition splits `backend/src/report-service/report-worker.service.ts` into:

- `report-worker.service.ts` (core ≤ 600 LOC target)
- `blocked-payments-report.service.ts`
- `financial-report.service.ts`
- `managerial-report.service.ts`
- `payroll-summary-report.service.ts`
- `reconciliation-report.service.ts`
- `report-worker-{artifacts,data,formatting,types}.ts` helpers

**Top backend `*.ts` (excl. spec/generated) — eSocial parsers/builders excluded as lift target:**

|                 LOC | Path                                                                                                                                                                                        | Round-4 LOC |   Δ | Notes                                                  |
| ------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------: | --: | ------------------------------------------------------ |
| (post-R5-02 verify) | [`backend/src/report-service/report-worker.service.ts`](../../../../../backend/src/report-service/report-worker.service.ts)                                                                 |       1 032 |  -? | R5-02 split; main file → ≤ 600 LOC                     |
|                 930 | [`backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts`](../../../../../backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts) |         930 |   0 | Stable. Round-9 candidate for split if growth resumes. |
|                 923 | [`backend/src/folha-pagamento/payroll/folha-mensal.workflow.ts`](../../../../../backend/src/folha-pagamento/payroll/folha-mensal.workflow.ts)                                               |         923 |   0 | Stable.                                                |
|                 875 | [`backend/src/convenio/internships/internships.service.ts`](../../../../../backend/src/convenio/internships/internships.service.ts)                                                         |         875 |   0 | Stable.                                                |
|                 797 | [`backend/src/folha-pagamento/rescisao/rescisao.service.ts`](../../../../../backend/src/folha-pagamento/rescisao/rescisao.service.ts)                                                       |         797 |   0 | Stable.                                                |
|                 772 | [`backend/src/portal/portal.service.ts`](../../../../../backend/src/portal/portal.service.ts)                                                                                               |         772 |   0 | Stable.                                                |
|                 752 | [`backend/src/saude/pericia.service.ts`](../../../../../backend/src/saude/pericia.service.ts)                                                                                               |         752 |   0 | Stable.                                                |
|                 748 | [`backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts`](../../../../../backend/src/integrations-worker/dctfweb/dctfweb-builder.service.ts)                                   |         748 |   0 | Stable.                                                |
|                 731 | [`backend/src/previdenciario/previdenciario.dto.ts`](../../../../../backend/src/previdenciario/previdenciario.dto.ts)                                                                       |         731 |   0 | DTO catalog.                                           |
|                 727 | [`backend/src/folha-pagamento/import/pensionista-import.service.ts`](../../../../../backend/src/folha-pagamento/import/pensionista-import.service.ts)                                       |         727 |   0 | F-FOL-009; cap permanent (R5-16b WAIVE).               |
|                 726 | [`backend/src/rh/workflows/rh-workflows.controller.ts`](../../../../../backend/src/rh/workflows/rh-workflows.controller.ts)                                                                 |         726 |   0 | Stable.                                                |
|                 725 | [`backend/src/previdenciario/previdenciario.controller.ts`](../../../../../backend/src/previdenciario/previdenciario.controller.ts)                                                         |         725 |   0 | Stable.                                                |
|                 690 | [`backend/src/report-service/payslip/payslip-render.service.ts`](../../../../../backend/src/report-service/payslip/payslip-render.service.ts)                                               |         690 |   0 | Stable.                                                |

**eSocial files excluded as lift targets** (would dominate the table otherwise):

- `backend/src/esocial-worker/parsers/totalizer.parser.ts` (927 LOC) — migrates to stynx-esocial.
- `backend/src/auth/govbr/software-pades-pkcs7.signer.ts` (504 LOC) — migrates to `@stynx/pki-pades`.
- `backend/src/external/mocks/esocial-relay/esocial-relay.mock.ts` (376 LOC) — stays SGP-side as test double.

## B. New code surfaces (R5/R6 in-flight)

| LOC (approx) | Path                                                                                                                                            | R5/R6 item |
| -----------: | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
|         ~150 | [`database/sql/16-esocial-spool.sql`](../../../../../database/sql/16-esocial-spool.sql)                                                         | R6-06      |
|         ~400 | [`backend/src/esocial-spool/`](../../../../../backend/src/esocial-spool/) (5 files)                                                             | R6-06      |
|         ~200 | [`backend/src/integrations/stynx-esocial/`](../../../../../backend/src/integrations/stynx-esocial/)                                             | R6-01      |
|         ~250 | [`backend/src/common/adapters/sqs-queue-transport.ts`](../../../../../backend/src/common/adapters/sqs-queue-transport.ts)                       | R6-05      |
|          ~50 | [`backend/src/system-parameters/esocial-queue-transport-flag.ts`](../../../../../backend/src/system-parameters/esocial-queue-transport-flag.ts) | R6-07      |
|         ~250 | [`backend/src/external/mocks/govbr-relay/`](../../../../../backend/src/external/mocks/govbr-relay/)                                             | R5-41      |
|         ~750 | [`backend/src/external/mocks/`](../../../../../backend/src/external/mocks/) — siconfi-relay/, siope-relay/, siops-relay/                        | R5-40      |
|         ~300 | R5-02 sub-services (5 files + helpers)                                                                                                          | R5-02      |
|         ~150 | [`backend/src/rh/employees/`](../../../../../backend/src/rh/employees/) — employee-merit-leave.controller.ts + service.ts                       | R5-51      |
|          ~80 | RH professional-experience workflow + spec                                                                                                      | R5-50      |
|          ~50 | Gestão vacation-type spec + master-data row                                                                                                     | R5-52      |
|         ~100 | [`scripts/lib/audit/rls-spec-coverage.mjs`](../../../../../scripts/lib/audit/rls-spec-coverage.mjs) + spec                                      | R5-61      |

Net new LOC across SGP-side R5/R6 surfaces: **~3 000–4 000** (rough estimate; matches +4 883 backend LOC total minus ~500-1500 in modifications to existing files).

## C. SQL hotspots (post-R5/R6)

|          LOC | Path                                         | R9 status                     |
| -----------: | -------------------------------------------- | ----------------------------- |
|        3 190 | `database/sql/40-payroll_calc-functions.sql` | unchanged                     |
|        2 690 | `database/sql/70-hr-final.sql`               | extended for R5-50/51 (small) |
|        1 994 | `database/sql/10-05-hr-ddl.sql`              | extended for R5-50/51 (small) |
|        1 032 | `database/sql/40-recrutamento-functions.sql` | unchanged                     |
| **NEW ~150** | **`database/sql/16-esocial-spool.sql`**      | **R6-06**                     |

Total SQL LOC: **25 901** (was 25 701; +200 LOC; +1 file).

## D. Other quality dimensions

| Dimension                                | Round-4 verdict          | Round-9 delta                                                                                               |
| ---------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| F. Test density (tests / source LOC)     | 0.196                    | **~0.205** ((36 180 + ~31 000 in-tree spec) / (154 118 backend ex-spec + 25 003 frontend ex-spec)) — +0.009 |
| G. Generated artefact freshness          | OpenAPI 3.1              | unchanged                                                                                                   |
| H. Lint / format                         | green                    | green; new ESLint rule `no-raw-handler-logging` (R4-30) carried                                             |
| I. Typecheck                             | green                    | green                                                                                                       |
| J. Cyclic dependencies                   | none flagged             | unchanged                                                                                                   |
| K. NFR coverage                          | 12/15 DONE               | **12/15 DONE; PARTIAL count drops to 1 once R5-32 NFR-012 reframe lands; PII tagging extended (R5-70)**     |
| L. Decimal coverage                      | 714 files / 0 violations | unchanged                                                                                                   |
| M. Idempotency coverage                  | 9/9 surfaces (100 %)     | unchanged                                                                                                   |
| N. FE i18n coverage                      | 251 hardcoded strings    | **target ≤ 100 per R5-31; verify post-commit**                                                              |
| **O. RLS spec coverage parity (NEW)**    | not measured             | **R5-61 audit-tooling lock**; per-table spec parity verified                                                |
| **P. SGP boundary spool coverage (NEW)** | not measured             | **R6-06 + R6-08** — spool table + cross-boundary publishers/consumers                                       |

## E. Code-quality findings new in round-9

1. **R5-02 closes round-4 top-1 LOC risk** (`report-worker.service.ts` 1 032 → ≤ 600 main + 5 sub-services). Decomposition pattern matches R4-40/41/42 — bounded LOC per sub-service, no DTO/route surface change.
2. **The new SGP top-1 LOC candidate post-R5-02** is `reintegration-order.service.ts` (930 LOC) — stable; no immediate split signal but worth watching.
3. **eSocial files dominate any non-excluded LOC scan** until the lift-out cut-over completes. This audit explicitly excludes them; the SGP-side LOC reality post-cut-over is far smaller.
4. **R5-70 PII tagging extension** adds 36 `classification_comments` — long-tail PII coverage closed; LGPD art. 37 evidence-breadth ratchets.
5. **R5-61 RLS spec coverage parity audit** is the first audit-tooling addition that asserts a covenant rather than just measuring drift. Any new RLS-protected table without a cross-tenant + self-only spec pair will fail CI.
6. **R5-31 i18n catalog extraction** introduces [`frontend/src/app/core/i18n/feature-messages.ts`](../../../../../frontend/src/app/core/i18n/feature-messages.ts) — typed message-key registry; eliminates string-literal dispersion across `features/*`.
7. **No new top-LOC risks emerged from R5/R6 work.** Largest new file is `sqs-queue-transport.ts` at ~250 LOC; mock relays at ~250 LOC each.
