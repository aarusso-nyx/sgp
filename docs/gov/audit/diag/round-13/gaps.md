# Round 13 — Gaps

Round 13 is a B0 audit. Round 12 closed `closure.json` with **31 items**, all
status `done` (one explicitly `obsolete`). Round-13 audit refresh promotes no
prior `DONE` to a regression, but does surface **four new `TODO` FRs** (per
`fr-delta.md`).

## Top 10 Gaps by Regulatory Exposure

These are FRs currently `DEFERRED` whose underlying obligations are
externally-driven (eSocial, RFB, ANPD, MTE, TCE/TCM/TCU, Caixa).

| Rank | FR-ID        | Domain | Deferred surface                      | Regulatory anchor    |
| ---: | ------------ | ------ | ------------------------------------- | -------------------- |
|    1 | FR-FI-976867 | Fiscal | Hub de Validação e Assinatura eSocial | `docs/refs/esocial/` |
|    2 | FR-FI-A98E24 | Fiscal | Submissão eSocial SOAP                | `docs/refs/esocial/` |
|    3 | FR-FI-0A7819 | Fiscal | Eventos de Tabelas e Cadastro eSocial | `docs/refs/esocial/` |
|    4 | FR-FI-ADD57D | Fiscal | Parser de Retorno eSocial             | `docs/refs/esocial/` |
|    5 | FR-FI-AA7847 | Fiscal | TS-V S-2306 contract change           | `docs/refs/esocial/` |
|    6 | FR-FI-C592B5 | Fiscal | Reintegração S-2298                   | `docs/refs/esocial/` |
|    7 | FR-FI-87AB14 | Fiscal | Contrato Pluggável TCE/TCM/TCU        | `docs/refs/tce/`     |
|    8 | FR-FI-9FDB83 | Fiscal | Catálogo de Estados/Layouts TCE       | `docs/refs/tce/`     |
|    9 | FR-FI-EC93C5 | Fiscal | TCE-03 Adapter AUDESP/SP              | `docs/refs/tce/`     |
|   10 | FR-FI-94021B | Fiscal | TCE RREO/RGF builders                 | `docs/refs/tce/`     |

All 10 are explicitly scope-pinned via
`docs/gov/evidence/mvp-scope-ledger.md` and tracked in
`docs/gov/audit/mvp-fr-scope-proof.md`. They are **not** treated as broken;
they are owner-postponed for v0.0.1 boundary. Promotion is an owner decision.

## Top 10 Critical-path Features at Maturity ≤ 2

Cross-referenced against `docs/gov/audit/functional-requisites.md` rows with
status `TODO` or freshly `NEW` (round 13 introductions):

| Rank | FR-ID         |       Spec count | Notes                                     |
| ---: | ------------- | ---------------: | ----------------------------------------- |
|    1 | FR-FI-352981  | 137 (transitive) | NEW → TODO this round; no focused spec    |
|    2 | FR-PB-493825  |              TBD | NEW → TODO this round; payroll-benefits   |
|    3 | FR-PR-9D4AE1  |               32 | NEW → TODO; lowest-density `PR-*`         |
|    4 | FR-TAS-94FEDC |               37 | NEW → TODO; time-attendance               |
|    5 | FR-PT-EC4F9F  |               29 | LGPD; lowest spec count overall           |
|    6 | FR-TAS-04FA10 |               30 | DEFERRED; time-attendance regulatory tail |
|    7 | FR-PR-278EF3  |               33 | DEFERRED; people-recruitment surface      |
|    8 | FR-PR-310238  |               36 | DEFERRED; people-recruitment surface      |
|    9 | FR-TAS-31AA0F |               37 | DEFERRED; time-attendance                 |
|   10 | FR-PR-27A188  |               38 | DEFERRED; people-recruitment              |

The 4 `NEW → TODO` rows from round 13 inherit ≥30 cross-cutting specs each by
proximity (bootstrap, observability, error contract). Treat the inherited
counts as **transitive proximity**, not delivery; the FRs lack any
implementation spec written against their requirement text.

## Cross-cutting Concerns

| Concern                      | Round-13 status | Evidence                                                                                                                            |
| ---------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Idempotency (queue adapters) | DONE            | `backend/src/common/adapters/queue-adapter.ts`; spec `queue-adapter.spec.ts`. Per FR-FI-75588D.                                     |
| Retro-processing (payroll)   | Partial         | Property-based tests on payroll calc paths landed (R2-153 done). No retro-window spec named in round-13 inventory.                  |
| Money rounding               | Implicit        | Covered transitively by payroll calc property tests; no dedicated rounding-policy spec named.                                       |
| Timezone handling            | Implicit        | `useFakeTimers` adoption (R2-152) removed hard-coded date strings; tz canonicalization is per-FR.                                   |
| RBAC                         | DONE-ish        | 129 backend files reference permissions; portal guard backfill (R2-59) and Stynx auth (`backend/src/auth/sgp-stynx-auth.guard.ts`). |
| Audit trail                  | DONE            | `backend/src/audit/audit-writer.service.ts` plus `audit-redaction.util.ts`; PvD shows 0 failures for `FR-OO-3BF7E1`.                |
| Concurrency                  | Partial         | Worker poll observability + scheduler specs; no central `optimistic-locking` spec named in round-13 inventory.                      |
| Multi-tenant isolation       | DONE            | 277/281 RLS tables; 72 RLS cross-tenant specs in `tests/rls/`.                                                                      |
| Observability                | DONE            | Prometheus + OTel + worker-poll observability specs registered (R2-170, R2-171).                                                    |
| CORS                         | DONE            | R2-173 marked done in round-12 closure.                                                                                             |

## Net Verdict

- No regressions. Promise-vs-delivery spec checks **25/25 ok** (`promise-vs-delivery.md`).
- Four new `TODO` FRs introduced; they are the round-14 backlog candidates.
- Regulatory deferrals are owner-pinned and unchanged; no escalation.

## Governance gate state

- `npm run governance:check` exits non-zero this round.
- Single failure: **`fr-scope:no-generic-todo`** — the gate forbids any FR
  row with status not in {`DONE`, `DEFERRED`}. The four newly-extracted
  rows surfaced by `audit:fr` (see `fr-delta.md`) are status `TODO` and
  break the gate.
- Remediation requires owner classification per row (DONE with full
  `source/test/command/audit/rationale` proof metadata, or DEFERRED with
  the standard `docs/gov/evidence/mvp-scope-ledger.md` scope-pinned note).
- The audit deliberately does not promote on its own; surfacing this is the
  audit's job. See `delta-from-round-12.md` and `06-gaps.md` for B1 input.
