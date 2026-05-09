# Phase 9 Closure Compare

Status date: 2026-05-09

Wave F is the final compare pass for the materialized feature-audit execution
prompt. The prompt defines Waves A through E; this document treats Wave F as
closure/status comparison against the live repository after Waves A through E.

## Verdict

Phase 9 is not fully closed yet.

The SGP-only scope has meaningful implementation progress, but the live
feature-audit matrix still records the legal-blocker rows M.06, N.06, N.07, and
P.12 as absent. Current source evidence shows P.12 implemented, while M.06,
N.06, and N.07 remain design-only in the round progress record.

The SGP-only `B` closure slice is complete: all 21 rows where `Owner=SGP` and
`Presence=B` were promoted to `P` with retained proof in
`docs/gov/audit/sgp-only-b-closure.md`. Sibling-owned rows such as
`SGP+stynx-admin`, `SGP+stynx-esocial`, `SGP+stynx-det`, and
`SGP+stynx-framework` remain untouched by this closure pass.

Full-stack hybrid go-live is still externally gated by the Wave E findings:
missing local DET package status, unproved eSocial event-builder coverage for
several events, and no SGP-local real-service eSocial transmission evidence.

## Inputs Checked

| Input                        | Result                                             |
| ---------------------------- | -------------------------------------------------- |
| Branch                       | `lift-up/qa-gap-closure`                           |
| Current HEAD at Wave F start | `1ec1001834fb3cf23bc5247a4b7d711c801864b0`         |
| Baseline named by prompt     | `f32ee208165546644a331fb758ebd68f6a6c7cf8`         |
| Prompt                       | `docs/work/feature-audit/09-execution-prompt.md`   |
| Feature matrix               | `docs/work/feature-audit/05-feature-matrix.md`     |
| Round progress               | `docs/work/round-1/progress.md`                    |
| Wave D ledger                | `docs/gov/audit/wave-D/coordination-ledger.md`     |
| Wave E status                | `docs/gov/audit/wave-E/external-package-status.md` |

## Wave Status

| Wave | Status                                                                                                                                                        | Evidence                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Partial. P.12 is implemented; M.06, N.06, and N.07 remain design-only.                                                                                        | `docs/work/round-1/progress.md`; `docs/gov/audit/lgpd-international-transfer-proof.md`; `docs/eng/decisions/adr-023-lgpd-international-transfer-mechanism.md` |
| B    | Implemented for the executed portal slice. Q.03, Q.04, and Q.09 were already P; Q.07, Q.11, and Q.12 are now promoted to P in the SGP-only B closure refresh. | `frontend/portal/src/app/pages/documentos/documentos.ts`; `frontend/portal/src/app/pages/minha-equipe/minha-equipe.ts`; `docs/user/portal-self-service.md`    |
| C    | Implemented for the executed backend-hardening slice, pending feature-matrix refresh. R.01, T.05, T.07, and T.09 were already P; T.10 lock hardening landed.  | `backend/src/folha-pagamento/payroll/payroll.service.ts`; `backend/src/folha-pagamento/payroll/payroll.controller.ts`; `docs/work/round-1/progress.md`        |
| D    | Target met: 30 retained handoff notes out of 101 SGP plus stynx-admin rows.                                                                                   | `docs/gov/audit/wave-D/coordination-ledger.md`                                                                                                                |
| E    | Status inventory complete for 22 live pure-external rows; external packages themselves remain open.                                                           | `docs/gov/audit/wave-E/external-package-status.md`                                                                                                            |

## Audit-ID Comparison

| ID     | Matrix before | Wave F evidence status       | Closure note                                                                                                                                  |
| ------ | ------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| M.06   | A             | Design-only                  | MANAD implementation is still open.                                                                                                           |
| N.06   | A             | Design-only                  | PCMAT implementation is still open.                                                                                                           |
| N.07   | A             | Design-only                  | CIPA implementation is still open.                                                                                                            |
| P.12   | A             | Implemented evidence present | LGPD international transfer tables, API, public summary, audit hook, ADR, runbook, and tests are present; feature matrix still needs refresh. |
| Q.03   | P             | P                            | Already present before Wave B.                                                                                                                |
| Q.04   | P             | P                            | Already present before Wave B.                                                                                                                |
| Q.07   | B             | P                            | Portal document request page/API evidence refreshed in the SGP-only B closure pass.                                                           |
| Q.09   | P             | P                            | Already present before Wave B.                                                                                                                |
| Q.11   | B             | P                            | Manager self-service portal page/API evidence refreshed in the SGP-only B closure pass.                                                       |
| Q.12   | B             | P                            | Portal approval entry point evidence refreshed in the SGP-only B closure pass; admin retirement remains Wave D/stynx-admin work.              |
| P.09   | B             | P                            | Runtime logging uses the retained pino redaction policy and focused tests cover nested PII and authorization headers.                         |
| R.07   | B             | P                            | ICP-Brasil is closed inside ADR-021's software A1/PKCS#12 boundary with signer and non-secret certificate-status proof.                       |
| R.01   | P             | P                            | Already present before Wave C.                                                                                                                |
| T.05   | P             | P                            | Already present before Wave C.                                                                                                                |
| T.07   | P             | P                            | Already present before Wave C.                                                                                                                |
| T.09   | P             | P                            | Already present before Wave C.                                                                                                                |
| T.10   | B             | Implemented evidence present | Payroll lock acquisition and lock-status endpoint landed; feature matrix still needs refresh.                                                 |
| Wave D | n/a           | 30/101 handoffs retained     | 29.7 percent of SGP plus stynx-admin rows, satisfying the prompt's 30-note target.                                                            |
| Wave E | n/a           | 22/22 external rows tracked  | Tracking complete; external package work remains outside SGP.                                                                                 |

## Gates

Wave F refreshed the functional-requisite audit with `npm run audit:fr`. The
available retained status is now current for the docs/gov audit surfaces.

Because Wave F is a docs/status pass and there are unrelated untracked backend
coverage-hardening specs in the worktree, full test execution should be treated
as a publication gate after the owner decides whether those untracked specs are
part of the branch. The prior Wave D retained ledger records passing broad gates
before Wave E/F docs-only changes.

## Remaining Closure Work

1. Implement M.06 MANAD beyond the design note.
2. Implement N.06 PCMAT beyond the design note.
3. Implement N.07 CIPA beyond the design note.
4. Re-run or refresh the feature-audit matrix for P.12 and T.10, which were not
   part of the SGP-only B closure slice.
5. Resolve external Wave E blockers before claiming full-stack hybrid go-live.
