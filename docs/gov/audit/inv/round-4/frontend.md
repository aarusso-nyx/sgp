# Frontend Inventory (Round 4)

Narrative wrapper. Authority for the admin app lives in [`frontend/src/`](../../../../../frontend/src/) and the portal in [`frontend/portal/`](../../../../../frontend/portal/). Round-4 inherits round-3's deep map at [`docs/gov/audit/inv/round-3/frontend.md`](../round-3/frontend.md); this file overlays the round-4 delta.

## Topology snapshot at HEAD `ea0966c`

| Aspect                                      | Round-3                          | Round-4                                                                                       |
| ------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| Framework                                   | Angular `^21.2.0` admin + portal | unchanged                                                                                     |
| Admin `*.ts` LOC (excl. dist/node_modules)  | 21 948                           | ~21 850                                                                                       |
| Portal `*.ts` LOC (excl. dist/node_modules) | 2 723                            | 2 723                                                                                         |
| Combined frontend `*.ts` (excl. generated)  | 24 573                           | **24 477** (−96, −0.4 %)                                                                      |
| Feature directories under `features/`       | 23                               | **22** (−1; `shared-platform/` removed in R4-50)                                              |
| Feature `*.ts` files                        | 175                              | **180** (+5; `convenio/` and `relatorio/` backfilled with route stubs in R4-50, `gestao/` +1) |
| Empty FE feature directories                | 3                                | **0** (R4-50 closed)                                                                          |
| `.subscribe()` files under `features/`      | (~70 in round-3)                 | **49** (R4-51 below the 50 threshold)                                                         |
| Generated OpenAPI client files              | 3                                | unchanged                                                                                     |

## Round-4 deltas

### R4-50 — Empty feature directories cleanup (DONE)

`find frontend/src/app/features -mindepth 1 -type d -empty` returns 0 results. The three round-3-flagged empty dirs (`convenio/`, `relatorio/`, `shared-platform/`) handled per-directory:

- `shared-platform/` — removed entirely (was a stale placeholder).
- `convenio/` — backfilled with 2 route-stub `*.ts` files.
- `relatorio/` — backfilled with 2 route-stub `*.ts` files.

### R4-51 — Async pipe / signals modernization (DONE — threshold met)

`grep -rE '\.subscribe\(' frontend/src/app/features --include='*.ts' -l | wc -l` = **49** (target was < 50). Lint rule rejects new `.subscribe()` outside core/api wrappers per the prompt's acceptance.

Coverage extended to: `recrutamento/`, `esocial/`, `tce/`, `fiscal/`, `saude/`, `gestao/`, `portal/`, `auditoria/` (round-3's untouched-by-R3-022 list).

### R4-52 — i18n breadth audit (DONE — baseline established)

New audit tool [`scripts/lib/audit/fe-i18n-coverage.mjs`](../../../../../scripts/lib/audit/fe-i18n-coverage.mjs) produced [`docs/gov/audit/diag/round-4/fe-i18n-coverage.md`](../../diag/round-4/fe-i18n-coverage.md):

- **268 files checked** across `features/`.
- **14 feature roots with findings**.
- **251 hard-coded string candidates** detected.
- Roadmap entry recorded in [`docs/eng/domains/`](../../../../eng/domains/).

This is a **baseline** — no behavior change; sets up R5+ work to drive the count down.

## Admin feature breakdown (post-R4)

Re-counted at HEAD `ea0966c`:

|                 Feature | `*.ts` files | Notes                   |
| ----------------------: | -----------: | ----------------------- |
|      `folha-pagamento/` |           32 | Stable.                 |
|                   `rh/` |           25 | Stable.                 |
|                `ponto/` |           20 | Stable.                 |
|              `esocial/` |           16 | R4-51 modernization.    |
|               `gestao/` |       **10** | +1 vs round-3.          |
|                `saude/` |           10 | R4-51 modernization.    |
|               `portal/` |            9 | R4-51 modernization.    |
|                `admin/` |            8 | Stable.                 |
|         `recrutamento/` |            8 | R4-51 modernization.    |
|                  `tce/` |            8 | R4-51 modernization.    |
|       `portal-publico/` |            7 | Stable.                 |
|               `fiscal/` |            6 | R4-51 modernization.    |
|     `portal-empregado/` |            4 | Stable.                 |
|            `avaliacao/` |            3 | Stable.                 |
|              `publico/` |            3 | Stable.                 |
|             `security/` |            2 | Stable.                 |
|            `auditoria/` |            2 | R4-51 modernization.    |
|        `admin-feature/` |            2 | Stable.                 |
|             `convenio/` |        **2** | R4-50 backfill (was 0). |
|            `relatorio/` |        **2** | R4-50 backfill (was 0). |
| `portal-transparencia/` |            1 | Stable.                 |

Total: **180** `*.ts` files under `features/` (was 175). `shared-platform/` deleted.

## Portal pages (unchanged from round-3)

17 `*.ts` files across 8 page directories.

## E2E posture (unchanged)

5 Playwright admin specs under [`tests/e2e/`](../../../../../tests/e2e/) (3 avaliacao + 1 folha + 1 rh).

## Cross-references

- [diag/round-4/fe-i18n-coverage.md](../../diag/round-4/fe-i18n-coverage.md) — R4-52 baseline.
- [docs/gov/audit/inv/round-3/frontend.md](../round-3/frontend.md) — round-3 baseline.
- [docs/gov/audit/inv/round-4/backend.md](./backend.md) §SGP boundary — frontend admin/portal does **not** consume the queue contract directly; that's backend-only.
