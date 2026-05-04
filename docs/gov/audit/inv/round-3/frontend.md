# Frontend Inventory (Round 3)

Narrative wrapper. Authority for the admin app lives in [`frontend/src/`](../../../../../frontend/src/) and the portal in [`frontend/portal/`](../../../../../frontend/portal/). Round-3 inherits round-2's deep map at [`docs/work/round-2/03d-frontend-inventory.md`](../../../../work/round-2/03d-frontend-inventory.md); this file overlays the round-3 delta.

## Topology snapshot at HEAD `50dc67c`

| Aspect                                       |                                                                            Admin (`frontend/src`) |                                        Portal (`frontend/portal`) | Source                                                                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------: | ----------------------------------------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                                    |                                                                                 Angular `^21.2.0` |                                                 Angular `^21.2.0` | [`frontend/package.json`](../../../../../frontend/package.json)                                                                                                                                            |
| `*.ts` files (excl. dist/node_modules)       |                                                                                        21 948 LOC |                                                         2 723 LOC | `find` over `frontend/src` and `frontend/portal`                                                                                                                                                           |
| Top-level under `src/app/`                   | `core`, `features`, `reports`, `shared`, `shared-platform`, plus `app.config.ts`, `app.routes.ts` |                 `core`, `pages`, `app.config.ts`, `app.routes.ts` | `ls frontend/src/app/` and `ls frontend/portal/src/app/`                                                                                                                                                   |
| Feature directories                          |                                                                            23 (under `features/`) |                                                8 (under `pages/`) | see Feature breakdown                                                                                                                                                                                      |
| Generated OpenAPI client files               | 3 (admin: `openapi-client.ts` + `openapi-core.json` 67 297 LOC + `openapi-portal.json` 7 588 LOC) | 2 (portal: `openapi-client.ts` + `openapi-portal.json` 7 588 LOC) | [`frontend/src/app/core/api/generated/`](../../../../../frontend/src/app/core/api/generated/), [`frontend/portal/src/app/core/api/generated/`](../../../../../frontend/portal/src/app/core/api/generated/) |
| Lazy routes (`loadChildren`/`loadComponent`) |                                                 2 detected via `grep` of `app.routes.ts` siblings |                                                                 — | `app.routes.ts`                                                                                                                                                                                            |

Round-3 LOC delta vs round-2: **−552 (−2.2 %)** combined frontend `*.ts`. The decrease is consistent with R3-020 (dead NgModule cleanup) + R3-022 (async pipe / signals modernization slice). No new top-level feature directory.

## Admin feature breakdown (under [`frontend/src/app/features/`](../../../../../frontend/src/app/features/))

|                                       Feature | `*.ts` files | Notes                                                                                       |
| --------------------------------------------: | -----------: | ------------------------------------------------------------------------------------------- |
|                            `folha-pagamento/` |           32 | Largest feature. Payroll runs, contracheque, importadores, R2-50 fixtures consumed via API. |
|                                         `rh/` |           25 | Employee lifecycle. Includes new R2-75 organic-definition surface.                          |
|                                      `ponto/` |           20 | Time, journada, biometria, face.                                                            |
|                                    `esocial/` |           16 | Event monitoring, S-1xxx/S-2xxx UI.                                                         |
|                                      `saude/` |           10 | SST.                                                                                        |
|                                     `gestao/` |            9 | Master-data.                                                                                |
|                                     `portal/` |            9 | Admin-side portal.                                                                          |
|                                      `admin/` |            8 | Admin shell.                                                                                |
|                               `recrutamento/` |            8 | Banca, banco-talentos, prova-online.                                                        |
|                                        `tce/` |            8 | TCE event monitoring.                                                                       |
|                             `portal-publico/` |            7 | Transparency landing.                                                                       |
|                                     `fiscal/` |            6 | DCTFWeb, EFD-Reinf, DIRF, GPS, SIAFIC.                                                      |
|                           `portal-empregado/` |            4 | Employee self-service.                                                                      |
|                                  `avaliacao/` |            3 | Performance/career.                                                                         |
|                                    `publico/` |            3 | LAI requests.                                                                               |
|                                   `security/` |            2 | RBAC management.                                                                            |
|                                  `auditoria/` |            2 | Audit log viewer.                                                                           |
|                              `admin-feature/` |            2 | Wrapper.                                                                                    |
|                       `portal-transparencia/` |            1 | Transparency listings.                                                                      |
| `convenio/`, `relatorio/`, `shared-platform/` |       0 each | Empty placeholders (NgModule cleanup candidates if not stubs).                              |

Total: **175** `*.ts` files under `features/`.

## Portal pages breakdown (under [`frontend/portal/src/app/pages/`](../../../../../frontend/portal/src/app/pages/))

|                   Page | `*.ts` files | Notes                                 |
| ---------------------: | -----------: | ------------------------------------- |
|            `licencas/` |            4 | Licenses CRUD.                        |
|          `meus-dados/` |            3 | Personal data + LGPD DSAR entrypoint. |
|        `contracheque/` |            2 | Payslip viewer.                       |
|              `ferias/` |            2 | Vacation request.                     |
| `govbr-sign-callback/` |            2 | GovBR sandbox sign callback.          |
|        `portal-shell/` |            1 | Layout.                               |
|         `portal-home/` |            1 | Landing.                              |
| `portal-feature-page/` |            1 | Generic shell.                        |
|               `ponto/` |            1 | Time-card.                            |

Total under `pages/`: **17** `*.ts` files.

## Round-3 frontend deltas

The closure-wave commit `c9d99ee` is the only round-3 commit that touched frontend source (plus the regenerated OpenAPI clients in [`docs/gov/audit/diag/round-3/hotspots.md`](../../diag/round-3/hotspots.md) §"frontend/src/app/core/api/generated/openapi-core.json" — `+51 217 / −4 976` from R3-003 OpenAPI 3.1 contract regen).

| Backlog ID | Landing surface                              | Evidence                                                                                                                                                                                                                                                                             |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R3-020     | Dead NgModule cleanup                        | LOC drop −552 vs round-2 across `frontend/src` and `frontend/portal`                                                                                                                                                                                                                 |
| R3-021     | Frontend coverage + Playwright gate          | NFR-010 `DONE` ([frontend/angular.json:81](../../../../../frontend/angular.json), [.github/workflows/source-ci.yml:110](../../../../../.github/workflows/source-ci.yml)); NFR-011 `DONE` ([.github/workflows/source-ci.yml:113-122](../../../../../.github/workflows/source-ci.yml)) |
| R3-022     | Async pipe / signals modernization slice     | LOC churn within `features/folha-pagamento`, `features/rh`, `features/ponto`                                                                                                                                                                                                         |
| R3-023     | Tipos de Férias + Legislação registry parity | new entries in `master-data` consuming surface                                                                                                                                                                                                                                       |
| R3-024     | RH small-parity                              | `features/rh/` updates                                                                                                                                                                                                                                                               |
| R3-025     | RH report + talent                           | `features/recrutamento/banco-talentos/`                                                                                                                                                                                                                                              |

The 030–053 R3-\* prompts are backend-/governance-leaning; they do not require a frontend surface in round-3.

## HttpClient call sites

- Single shared API client: [frontend/src/app/core/api/api-client.ts:1-20](../../../../../frontend/src/app/core/api/api-client.ts) — wraps `HttpClient` / `HttpParams`.
- All feature-level service calls flow through this client (verified by `grep -rE 'HttpClient' frontend/src/app/features --include='*.ts'` returns mostly type imports; direct injection is centralized).
- Generated OpenAPI client: [`frontend/src/app/core/api/generated/openapi-client.ts`](../../../../../frontend/src/app/core/api/generated/openapi-client.ts) regenerated in round-3 from the OpenAPI 3.1 doc landed in R3-003.

## i18n / a11y / signals posture

- i18n posture refresh: still pt-BR-only. [`scripts/check-frontend.mjs`](../../../../../scripts/check-frontend.mjs) (folded in `134460b` from the previous separate `check-frontend-i18n.mjs` sibling) carries the i18n drift gate.
- a11y posture: round-2 noted partial coverage; no targeted a11y items landed in round-3.
- Signals/OnPush coverage: increased per R3-022 in `features/folha-pagamento`, `features/rh`, `features/ponto`. No global metric tracked — code-quality scoring continues round-2's posture.

## E2E posture

Playwright admin + portal configs at [`tests/playwright.admin.config.ts`](../../../../../tests/playwright.admin.config.ts) and [`tests/playwright.portal.config.ts`](../../../../../tests/playwright.portal.config.ts). Round-3 commit `50dc67c` simplified node + playwright config layout (small dispatcher cleanup, no behavioral change).
