# Phase 9 Closure Compare

Status date: 2026-05-09

Wave F is the final compare pass for the materialized feature-audit execution
prompt. The prompt defines Waves A through E; this document treats Wave F as
closure/status comparison against the live repository after Waves A through E.

## Verdict

Phase 9 is conditionally closed for the SGP-owned implementation boundary.

The refreshed feature-audit matrix no longer records SGP-owned M1 legal-blocker
absences. M.06 and P.12 are promoted to present with runtime/test evidence.
N.06 and N.07 are promoted from absent to partial because canonical DB, RLS, and
audit lifecycle evidence exists, while focused operator/API evidence remains to
be added before they can be promoted to fully present.

The SGP-only `B` closure slice is complete: all 21 rows where `Owner=SGP` and
`Presence=B` were promoted to `P` with retained proof in
`docs/gov/audit/sgp-only-b-closure.md`.

The feature-audit boundary is now rebaselined: admin backend/db/frontend
surfaces and AdminFeaturePage parity are delegated to `../stynx`; eSocial
implementation is delegated to `../stynx-esocial`; DET implementation is
delegated to an external DET service boundary. Those rows remain relevant to
full-stack readiness, but they are not SGP implementation closure gaps.

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

| Wave | Status                                                                                                                                                        | Evidence                                                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Conditionally closed. M.06 and P.12 are present; N.06 and N.07 are partial pending operator/API evidence.                                                     | `backend/src/report-service/manad-export-report.service.ts`; `tests/backend/golden/manad-v01/expected.txt`; `docs/gov/audit/lgpd-international-transfer-proof.md` |
| B    | Implemented for the executed portal slice. Q.03, Q.04, and Q.09 were already P; Q.07, Q.11, and Q.12 are now promoted to P in the SGP-only B closure refresh. | `frontend/portal/src/app/pages/documentos/documentos.ts`; `frontend/portal/src/app/pages/minha-equipe/minha-equipe.ts`; `docs/user/portal-self-service.md`        |
| C    | Implemented for the executed backend-hardening slice, pending feature-matrix refresh. R.01, T.05, T.07, and T.09 were already P; T.10 lock hardening landed.  | `backend/src/folha-pagamento/payroll/payroll.service.ts`; `backend/src/folha-pagamento/payroll/payroll.controller.ts`; `docs/work/round-1/progress.md`            |
| D    | Superseded as SGP closure pressure. Admin surfaces are delegated to `../stynx`; retained handoff notes remain historical coordination evidence.               | `docs/gov/audit/wave-D/coordination-ledger.md`; `docs/gov/evidence/deferred-decision-ledger.md`                                                                   |
| E    | External inventory complete; eSocial and DET implementation readiness is out of SGP scope and belongs to external service/package owners.                     | `docs/gov/audit/wave-E/external-package-status.md`; `docs/gov/evidence/deferred-decision-ledger.md`                                                               |

## Audit-ID Comparison

| ID     | Matrix before | Wave F evidence status        | Closure note                                                                                                                                   |
| ------ | ------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| M.06   | A             | P                             | MANAD report-worker export produces deterministic TXT/JSON artifacts from approved payroll rows with validation and generated-file audit.      |
| N.06   | A             | B                             | PCMAT is accepted in the canonical SST program lifecycle with tenant-scoped validity metadata, audit triggers, and RLS.                        |
| N.07   | A             | B                             | CIPA has tenant-scoped committee, member, and minutes tables with work-location scope, audit triggers, and RLS.                                |
| P.12   | A             | P                             | LGPD international transfer tables, API, public summary, audit hook, ADR, runbook, and tests are present.                                      |
| Q.03   | P             | P                             | Already present before Wave B.                                                                                                                 |
| Q.04   | P             | P                             | Already present before Wave B.                                                                                                                 |
| Q.07   | B             | P                             | Portal document request page/API evidence refreshed in the SGP-only B closure pass.                                                            |
| Q.09   | P             | P                             | Already present before Wave B.                                                                                                                 |
| Q.11   | B             | P                             | Manager self-service portal page/API evidence refreshed in the SGP-only B closure pass.                                                        |
| Q.12   | B             | P                             | Portal approval entry point evidence refreshed in the SGP-only B closure pass; generic admin parity remains delegated to `../stynx` framework. |
| P.09   | B             | P                             | Runtime logging uses the retained pino redaction policy and focused tests cover nested PII and authorization headers.                          |
| R.07   | B             | P                             | ICP-Brasil is closed inside ADR-021's software A1/PKCS#12 boundary with signer and non-secret certificate-status proof.                        |
| R.01   | P             | P                             | Already present before Wave C.                                                                                                                 |
| T.05   | P             | P                             | Already present before Wave C.                                                                                                                 |
| T.07   | P             | P                             | Already present before Wave C.                                                                                                                 |
| T.09   | P             | P                             | Already present before Wave C.                                                                                                                 |
| T.10   | B             | Delegated/full-stack boundary | Payroll lock evidence exists, but the row remains outside the exact SGP-only B closure because it is owned by a hybrid admin/full-stack lane.  |
| Wave D | n/a           | Delegated                     | Admin backend/db/frontend surfaces are delegated to `../stynx`; retained 30-note handoff evidence is historical, not SGP backlog.              |
| Wave E | n/a           | Delegated                     | eSocial and DET implementation work remains outside SGP; SGP owns only gateway/projection/status contracts.                                    |

## Gates

The 2026-05-09 production-grade pass repaired the canonical DB bootstrap and
reran broad gates through `npm run test`, `npm run test:db`, alignment checks,
and governance checks. The feature-audit scratch matrix and summary have been
refreshed for M.06, N.06, N.07, and P.12.

## Remaining Closure Work

1. Add/verify focused operator/API evidence for N.06 PCMAT.
2. Add/verify focused operator/API evidence for N.07 CIPA.
3. Track T.10 in the delegated admin/full-stack boundary unless owner reopens it
   as SGP-owned scope.
4. Track external package/service readiness outside SGP; do not count eSocial,
   DET, or admin-surface implementation as SGP closure backlog.
