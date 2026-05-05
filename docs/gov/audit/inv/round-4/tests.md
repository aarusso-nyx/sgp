# Test Inventory (Round 4)

Narrative wrapper around [`test-coverage-map.json`](./test-coverage-map.json) and [`test-coverage-map.md`](./test-coverage-map.md).

## Counts at HEAD `ea0966c`

| Metric                                                   |             Round-3 |                                                                  Round-4 |                     Δ |
| -------------------------------------------------------- | ------------------: | -----------------------------------------------------------------------: | --------------------: |
| Detected `*.spec.ts` / `*.e2e-spec.ts` (tooling)         |                 575 | (re-run by tooling — see [test-coverage-map.md](./test-coverage-map.md)) |                     — |
| `find tests -name '*.spec.ts'` (file count under tests/) |                 226 |                                                                  **243** |               **+17** |
| Total `*.spec.ts` repo-wide                              |                 450 |                                                                  **476** |               **+26** |
| Total `*.e2e-spec.ts` repo-wide                          |                 125 |                                                                  **136** |               **+11** |
| Tests `*.{ts,mjs,js}` LOC                                |              30 730 |                                                               **34 055** |  **+3 325 (+10.8 %)** |
| Functional requisites with mapped tests                  | 1 / 1 (parser stub) |                                                **77** parsed (R4-60 fix) | parser fully restored |

## Test surface by location (post-R4)

| Location                                            | Specs (round-3) | Specs (round-4) | Notes                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | --------------: | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`tests/backend/`](../../../../../tests/backend/)   |             127 |         **139** | +12: new e2e specs for R4-01 (PAdES), R4-02 (concurrency), R4-10 (DCTFWeb CSLL), R4-11 (EFD-Reinf R-2055), R4-12/13 (totalizers), R4-14 (SIAFIC), R4-15 (RREO/RGF), R4-17 (CF 37 XVI), R4-90 (esocial via queue), R4-91 (banking via queue), R4-30 (readiness), R4-31 (observability) |
| [`tests/rls/`](../../../../../tests/rls/)           |              80 |          **80** | unchanged                                                                                                                                                                                                                                                                             |
| [`tests/db/`](../../../../../tests/db/)             |              10 |          **11** | +1 RLS-posture-parity spec (R4-72)                                                                                                                                                                                                                                                    |
| [`tests/scripts/`](../../../../../tests/scripts/)   |               8 |         **11+** | +new audit-tooling specs: `audit-decimal-coverage`, `audit-idempotency-coverage`, `audit-fe-i18n-coverage`, plus the docs/refs cross-reference guard spec                                                                                                                             |
| [`tests/e2e/`](../../../../../tests/e2e/)           |               5 |           **5** | unchanged                                                                                                                                                                                                                                                                             |
| [`tests/frontend/`](../../../../../tests/frontend/) |               2 |           **2** | unchanged                                                                                                                                                                                                                                                                             |
| [`tests/audit/`](../../../../../tests/audit/)       |               1 |           **1** | unchanged                                                                                                                                                                                                                                                                             |
| `backend/src/**/*.spec.ts` (in-tree)                |            ~330 |        **~360** | +new sub-service specs from R4-40 / R4-41 / R4-42 decompositions                                                                                                                                                                                                                      |

## Goldens inventory (post-R4)

Located at [`tests/backend/golden/`](../../../../../tests/backend/golden/):

| Subdir                                                             | Domain                           | Source                                                |
| ------------------------------------------------------------------ | -------------------------------- | ----------------------------------------------------- |
| `payroll-mensal-v01/`                                              | Monthly payroll                  | R2-50                                                 |
| `decimo-terceiro-v01/`                                             | 13th salary                      | R2-50                                                 |
| `ferias-folha-v01/`                                                | Vacations + payroll              | R2-50                                                 |
| `rescisao-v01/`                                                    | Termination                      | R2-50                                                 |
| `payslip-pdf-a-v01/`                                               | Payslip PDF/A                    | R2-92                                                 |
| `comprovante-anual-v01/`                                           | Annual income statement          | R3-016                                                |
| `cnab240/` (5 banks: bb, bradesco, caixa, itau, santander, return) | Banking remittance               | R2-87                                                 |
| `tce/state-payroll-v01/`                                           | TCE state-payroll output         | R3-016                                                |
| `transparency/public-payroll-v01/`                                 | Portal de Transparência          | R3-016                                                |
| **`margem-consignavel-v01/`**                                      | Lei 14.509 three-bucket margin   | **R4-04 NEW**                                         |
| **`manual-entry-import-v01/`**                                     | F-FOL-007 importador estructural | **R4-16 NEW (PARTIAL — legacy byte-parity blocked)**  |
| **`servidor-import-v01/`**                                         | F-FOL-008 importador estructural | **R4-16 NEW (PARTIAL)**                               |
| **`pensionista-import-v01/`**                                      | F-FOL-009 importador estructural | **R4-16 NEW (PARTIAL)**                               |
| **`siafic-v01/`**                                                  | SIAFIC neutral JSON              | **R4-14 NEW (PARTIAL — `officialConformance=false`)** |
| **`efd-reinf-r2055-v01/`**                                         | EFD-Reinf R-2055 NT 01/2026      | **R4-11 NEW**                                         |
| **`dctfweb-csll-v01/`**                                            | DCTFWeb CSLL adicional           | **R4-10 NEW**                                         |
| **`tce/rreo-v01/`**                                                | TCE RREO (LRF)                   | **R4-15 NEW**                                         |
| **`tce/rgf-v01/`**                                                 | TCE RGF (LRF)                    | **R4-15 NEW**                                         |

**Total goldens directories: 18** (was 9 in round-3, +9 in R4).

## eSocial XSD fixtures (post-R4)

[`backend/src/esocial-worker/parsers/__fixtures__/`](../../../../../backend/src/esocial-worker/parsers/__fixtures__/) — added in R4-12 / R4-13:

| Fixture                                | Purpose                                         |
| -------------------------------------- | ----------------------------------------------- |
| `s5001-totalizer.golden.xml`           | totalizer reference                             |
| **`s5002-totalizer.golden.xml`**       | R4-12 — IRRF por trabalhador                    |
| **`s5002-totalizer-retro.golden.xml`** | R4-12 — retroactive case                        |
| `s5011-totalizer.golden.xml`           | totalizer reference                             |
| **`s5012-totalizer.golden.xml`**       | R4-13 — IRRF mensal empregador (reconciliation) |
| `s5013-totalizer.golden.xml`           | totalizer reference                             |

## Per-domain coverage delta vs round-3

| Domain                     | Round-3 status                              | Round-4 delta                                                                                                                                                    |
| -------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payroll (FOL-\*)           | Goldens green (monthly/13º/rescisão/férias) | + Lei 14.509 margem golden (R4-04); + idempotency adoption proven 9/9 (R4-21); + decimal policy 0 violations (R4-22)                                             |
| eSocial (S-1xxx/S-2xxx)    | XSD + dispatch + retry covered              | + S-5002 + S-5012 totalizer parsers + reconciliation (R4-12/R4-13); + S-1299 PAdES PKCS#7 envelope (R4-01); + queue-based submission for S-1299 (R4-90, PARTIAL) |
| Fiscal (DCTFWeb/EFD-Reinf) | Stub                                        | + DCTFWeb CSLL adicional + MIT (R4-10); + EFD-Reinf R-2055 + R-2000 NT 01/2026 (R4-11)                                                                           |
| TCE                        | Per-state stub goldens + transparency       | + RREO + RGF skeleton with SP/MG goldens (R4-15); + SIAFIC neutral JSON e2e (R4-14, PARTIAL); + queue-based state submission (R4-81/R4-96)                       |
| Banking                    | 5-bank CNAB240 goldens                      | + Mock relay round-trip (R4-98); + dispatch via queue (R4-91)                                                                                                    |
| LGPD                       | DPO/DSAR/public-power/PII batch (round-3)   | + 19 cols ciphertext siblings (R4-20); NFR-013 → DONE                                                                                                            |
| RH                         | R3-022 modernization slice                  | + CF 37 XVI accumulation matrix (R4-17); + employees.service decomposition (R4-40, 1 763 → 163 LOC)                                                              |
| Avaliação                  | (round-2 base)                              | + 5-way decomposition (R4-42, 1 140 → 103 LOC)                                                                                                                   |
| Integrations dispatcher    | Single 1 428-LOC hub                        | + per-kind dispatchers (R4-41, 1 428 → 449 LOC)                                                                                                                  |
| Worker scheduling          | Raw `setInterval` (4 hits)                  | + `@nestjs/schedule`-based scheduler with OTel + readiness (R4-03/R4-30/R4-31)                                                                                   |
| Adapters / mock services   | None                                        | + 2-way queue contract (R4-95); 3 mock relays (R4-96/97/98)                                                                                                      |
| Audit-tooling              | 8 specs (round-3)                           | + decimal-coverage + idempotency-coverage + fe-i18n-coverage + docs/refs cross-reference specs                                                                   |

## FR-ledger restoration (R4-60 closed)

The round-3 single-FR-001-stub problem is **fixed**. The R4-60 parser now walks `docs/eng/domains/*.md` headings:

- **77 FR rows** parsed from 6 domain files.
- Per-FR test mapping is now functional (re-run via `npm run audit:tests -- --round 4`).
- See [docs/gov/audit/functional-requisites.md](../../functional-requisites.md) for the full list and [diag/round-4/fr-delta.md](../../diag/round-4/fr-delta.md) for the round-3 → round-4 delta.

## Caveats

- Round-4 specs lock the SGP-boundary architecture (R4-95 + R4-96/97/98) but **do not** test against real external services. The mock-relay pattern is a deliberate boundary per owner decision (2026-05-03).
- R4-90 (eSocial submission via queue) is PARTIAL — only S-1299 is queue-supported; other implemented S-1xxx/S-2xxx classes intentionally raise `ESOCIAL_QUEUE_EVENT_UNSUPPORTED` instead of silent SOAP fallback. Owner-decision blocker recorded in [docs/work/round-3/QUESTIONS.md](../../../../work/round-3/QUESTIONS.md).
- R4-16 (importador goldens) is PARTIAL — structural goldens shipped; legacy XLSX template byte-parity remains source-pending per same QUESTIONS.md.
- R4-14 (SIAFIC) is PARTIAL — neutral JSON conformance shipped with `officialConformance=false`; Decreto 11.453/2023 layout selection deferred.
