# Code Quality (Round 3)

Round-3 inherits the round-2 A–J code-quality scorecard at [`docs/work/round-2/08-code-quality.md`](../../../../work/round-2/08-code-quality.md) (877 lines). Schema unchanged from round-1 §13.1. This file overlays the round-3 deltas.

## A. File-size hotspots — top 15 backend `*.ts` (excl. spec/generated)

|   LOC | Path                                                                                                                                                                                        | Module                    | Round-3 status                                                                            |
| ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| 1 763 | [`backend/src/rh/employees/employees.service.ts`](../../../../../backend/src/rh/employees/employees.service.ts)                                                                             | `rh/`                     | **Untouched.** Round-2 risk #3, still untouched after two rounds.                         |
| 1 428 | [`backend/src/integrations-worker/integrations-worker.service.ts`](../../../../../backend/src/integrations-worker/integrations-worker.service.ts)                                           | `integrations-worker/`    | Stable. Hub for DCTFWeb/EFD-Reinf/GPS/DIRF/CNAB240/SIAFIC/SICONFI/SIOPE/SIOPS dispatch.   |
| 1 140 | [`backend/src/avaliacao/avaliacao.service.ts`](../../../../../backend/src/avaliacao/avaliacao.service.ts)                                                                                   | `avaliacao/`              | Stable.                                                                                   |
|   985 | [`backend/src/report-service/report-worker.service.ts`](../../../../../backend/src/report-service/report-worker.service.ts)                                                                 | `report-service/`         | Round-2 R2-51 closure. **Round-3 round-2-flagged risk #6** (thread safety) **untouched.** |
|   930 | [`backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts`](../../../../../backend/src/folha-pagamento/operations/reintegration/reintegration-order.service.ts) | `folha-pagamento/`        | Stable.                                                                                   |
|   923 | [`backend/src/folha-pagamento/payroll/folha-mensal.workflow.ts`](../../../../../backend/src/folha-pagamento/payroll/folha-mensal.workflow.ts)                                               | `folha-pagamento/`        | Likely touched by R3-010 idempotency adoption; needs second-pass review.                  |
|   875 | [`backend/src/convenio/internships/internships.service.ts`](../../../../../backend/src/convenio/internships/internships.service.ts)                                                         | `convenio/`               | Stable.                                                                                   |
|   797 | [`backend/src/folha-pagamento/rescisao/rescisao.service.ts`](../../../../../backend/src/folha-pagamento/rescisao/rescisao.service.ts)                                                       | `folha-pagamento/`        | Stable.                                                                                   |
|   772 | [`backend/src/portal/portal.service.ts`](../../../../../backend/src/portal/portal.service.ts)                                                                                               | `portal/`                 | Stable.                                                                                   |
|   752 | [`backend/src/saude/pericia.service.ts`](../../../../../backend/src/saude/pericia.service.ts)                                                                                               | `saude/`                  | Stable.                                                                                   |
|   731 | [`backend/src/previdenciario/previdenciario.dto.ts`](../../../../../backend/src/previdenciario/previdenciario.dto.ts)                                                                       | `previdenciario/`         | DTO catalog; size acceptable.                                                             |
|   727 | [`backend/src/folha-pagamento/import/pensionista-import.service.ts`](../../../../../backend/src/folha-pagamento/import/pensionista-import.service.ts)                                       | `folha-pagamento/import/` | R2-71 landing; capped at maturity 3 pending NQ-1.                                         |
|   726 | [`backend/src/rh/workflows/rh-workflows.controller.ts`](../../../../../backend/src/rh/workflows/rh-workflows.controller.ts)                                                                 | `rh/`                     | Controller surface; consider DTO/decorator extraction.                                    |
|   725 | [`backend/src/previdenciario/previdenciario.controller.ts`](../../../../../backend/src/previdenciario/previdenciario.controller.ts)                                                         | `previdenciario/`         | Controller surface; same comment as #13.                                                  |

**Headline:** the 1 763-LOC `employees.service.ts` remains the single largest backend file and the most-cited refactor candidate; round-3 did not touch it. The 985-LOC `report-worker.service.ts` carries the round-2 thread-safety risk that round-3 also did not address.

## B. File-size hotspots — top 8 frontend `*.ts` (excl. spec/generated)

|   LOC | Path                                                                                                                                                                                              | Round-3 status                                                                                                                     |
| ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 3 623 | [`frontend/src/app/core/api/generated/openapi-client.ts`](../../../../../frontend/src/app/core/api/generated/openapi-client.ts)                                                                   | **Generated.** Regenerated in round-3 from R3-003 OpenAPI 3.1; not a quality concern.                                              |
|   649 | [`frontend/src/app/features/rh/pages/rh-home/rh-home.ts`](../../../../../frontend/src/app/features/rh/pages/rh-home/rh-home.ts)                                                                   | Likely touched by R3-022 signals modernization.                                                                                    |
|   508 | [`frontend/src/app/app.routes.ts`](../../../../../frontend/src/app/app.routes.ts)                                                                                                                 | Central route map. Acceptable for now; cleanup candidate when `convenio/relatorio/shared-platform` empty placeholders are removed. |
|   330 | [`frontend/src/app/core/navigation/admin-feature-catalog.ts`](../../../../../frontend/src/app/core/navigation/admin-feature-catalog.ts)                                                           | Generated permission-route map.                                                                                                    |
|   326 | [`frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts`](../../../../../frontend/src/app/features/admin-feature/pages/admin-feature-page/admin-feature-page.ts) | Wrapper page.                                                                                                                      |
|   321 | [`frontend/src/app/features/folha-pagamento/rubricas/rubricas.ts`](../../../../../frontend/src/app/features/folha-pagamento/rubricas/rubricas.ts)                                                 | Stable.                                                                                                                            |
|   305 | [`frontend/src/app/features/rh/services/rh-workflows.ts`](../../../../../frontend/src/app/features/rh/services/rh-workflows.ts)                                                                   | Stable.                                                                                                                            |
|   286 | [`frontend/src/app/features/gestao/pages/gestao-home/gestao-home.ts`](../../../../../frontend/src/app/features/gestao/pages/gestao-home/gestao-home.ts)                                           | Stable.                                                                                                                            |

## C. SQL hotspots — top 9 by LOC

|   LOC | Path                                                                                                      | Notes                                                             |
| ----: | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 3 190 | [`database/sql/40-payroll_calc-functions.sql`](../../../../../database/sql/40-payroll_calc-functions.sql) | Payroll computation functions. Size justified by formula breadth. |
| 2 690 | [`database/sql/70-hr-final.sql`](../../../../../database/sql/70-hr-final.sql)                             | Final FK/RLS pass for `hr.*`.                                     |
| 1 994 | [`database/sql/10-05-hr-ddl.sql`](../../../../../database/sql/10-05-hr-ddl.sql)                           | HR DDL — largest single domain.                                   |
| 1 032 | [`database/sql/40-recrutamento-functions.sql`](../../../../../database/sql/40-recrutamento-functions.sql) |                                                                   |
|   912 | [`database/sql/40-hr-functions.sql`](../../../../../database/sql/40-hr-functions.sql)                     |                                                                   |
|   885 | [`database/sql/40-esocial-functions.sql`](../../../../../database/sql/40-esocial-functions.sql)           |                                                                   |
|   882 | [`database/sql/70-payroll-final.sql`](../../../../../database/sql/70-payroll-final.sql)                   |                                                                   |
|   821 | [`database/sql/40-ponto-functions.sql`](../../../../../database/sql/40-ponto-functions.sql)               |                                                                   |
|   811 | [`database/sql/40-payment-functions.sql`](../../../../../database/sql/40-payment-functions.sql)           |                                                                   |

Total `database/**/*.sql` LOC: **25 025** (round-2: 24 842, +183 / +0.7 %). Consistent with comment/data-tag drift inside existing files; no new DDL files added.

## D. Hotspots from `git log` — see [`hotspots.md`](./hotspots.md)

The git-log hotspot table (top 30 by churn since round-2 baseline `c66a7b9`) is generated by `npm run audit:hotspots` and lives at [`hotspots.md`](./hotspots.md). Round-3 hotspots are dominated by:

1. `docs/refs/**` regulatory primary-source dumps (CLT, Constituição, LRF, eSocial layouts S-1.3) — single commits, large additions.
2. The three round-3 inventory JSON files under `docs/gov/audit/inv/round-3/` (api-surface, schema-digest, test-coverage-map) — regenerated by audit tooling.
3. Generated OpenAPI clients under `frontend/src/app/core/api/generated/` and `frontend/portal/src/app/core/api/generated/` — regenerated by R3-003.
4. The four consolidated docs under `docs/eng/` (platform, experience, quality-migration, product) — round-3 docs consolidation (134460b).
5. `docs/eng/` removals (~80 files folded into the new consolidated docs).

The big-LOC entries are not symptoms of code complexity — they are **single-commit additions of cached primary sources or regenerated artefacts**. The legitimate code hotspots remain the round-2 list (`employees.service.ts` etc.). Recommend an exclude-list for `docs/refs/**` and generated JSON in the next round.

## E. Other quality dimensions (round-3 carry-forward)

| Dimension                            | Round-2 verdict | Round-3 delta                                                                   |
| ------------------------------------ | --------------- | ------------------------------------------------------------------------------- |
| F. Test density (tests / source LOC) | 0.176           | **0.179** ((30 730 + ~31 000 spec-in-tree) / 140 421 backend + 22 488 frontend) |
| G. Generated artefact freshness      | OpenAPI 3.0     | **OpenAPI 3.1** post R3-003                                                     |
| H. Lint / format                     | green           | green (R3-012 ratchet)                                                          |
| I. Typecheck                         | green           | green                                                                           |
| J. Cyclic dependencies               | none flagged    | unchanged                                                                       |

## F. Code-quality findings new in round-3

1. **Empty FE feature directories** (`features/{convenio,relatorio,shared-platform}/`) — 0 `*.ts` files each. Either complete the surface or remove from `app.routes.ts`. Cross-listed in [`gaps.md`](./gaps.md) §4 item 2.
2. **Audit-tooling specs lock the audit pipeline.** New tests under [`tests/scripts/audit-*.spec.ts`](../../../../../tests/scripts/) (8 files) provide regression cover for the deterministic ledger refreshers — a positive quality move that didn't exist in round-2.
3. **Dispatcher reorganization** — internals split under `scripts/lib/audit/`, `scripts/lib/checks/`, `scripts/lib/db/`, `scripts/lib/generate/`, `scripts/lib/governance/`, `scripts/lib/qa/` — without surface change. `scripts/run.mjs` still routes the same subcommands. Quality positive (better internal cohesion); locked by [`tests/scripts/dispatcher-surface.spec.ts`](../../../../../tests/scripts/dispatcher-surface.spec.ts).
4. **Removed scripts** folded into [`scripts/check-frontend.mjs`](../../../../../scripts/check-frontend.mjs): the previous `check-frontend-api-client.mjs`, `check-frontend-i18n.mjs`, and `check-frontend-modern-angular.mjs` siblings. Plus `start-runtime-stub.mjs` removed. Net dispatcher surface area decreased while behavior preserved.
