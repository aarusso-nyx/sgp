# Phase 9 Closure Compare

Status date: 2026-05-09

Wave F is the final compare pass for the materialized feature-audit execution
prompt. The prompt defines Waves A through E; this document treats Wave F as
closure/status comparison against the live repository after Waves A through E.

## Verdict

Phase 9 is closed for the SGP-owned implementation boundary.

The refreshed feature-audit matrix no longer records SGP-owned M1 legal-blocker
absences. M.06, N.06, N.07, and P.12 are promoted to present with runtime/test
evidence. N.06 and N.07 now combine canonical DB, RLS, audit lifecycle,
operator/API, OpenAPI, and focused SST e2e evidence.

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

| Wave | Status                                                                                                                                                        | Evidence                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Closed. M.06, N.06, N.07, and P.12 are present with retained runtime/test evidence.                                                                           | `backend/src/report-service/manad-export-report.service.ts`; `tests/backend/golden/manad-v01/expected.txt`; `tests/backend/sst-02-pcmso-pgr.e2e-spec.ts`   |
| B    | Implemented for the executed portal slice. Q.03, Q.04, and Q.09 were already P; Q.07, Q.11, and Q.12 are now promoted to P in the SGP-only B closure refresh. | `frontend/portal/src/app/pages/documentos/documentos.ts`; `frontend/portal/src/app/pages/minha-equipe/minha-equipe.ts`; `docs/user/portal-self-service.md` |
| C    | Implemented for the executed backend-hardening slice, pending feature-matrix refresh. R.01, T.05, T.07, and T.09 were already P; T.10 lock hardening landed.  | `backend/src/folha-pagamento/payroll/payroll.service.ts`; `backend/src/folha-pagamento/payroll/payroll.controller.ts`; `docs/work/round-1/progress.md`     |
| D    | Superseded as SGP closure pressure. Admin surfaces are delegated to `../stynx`; retained handoff notes remain historical coordination evidence.               | `docs/gov/audit/wave-D/coordination-ledger.md`; `docs/gov/evidence/deferred-decision-ledger.md`                                                            |
| E    | External inventory complete; eSocial and DET implementation readiness is out of SGP scope and belongs to external service/package owners.                     | `docs/gov/audit/wave-E/external-package-status.md`; `docs/gov/evidence/deferred-decision-ledger.md`                                                        |

## Audit-ID Comparison

| ID     | Matrix before | Wave F evidence status        | Closure note                                                                                                                                               |
| ------ | ------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M.06   | A             | P                             | MANAD report-worker export produces deterministic TXT/JSON artifacts from approved payroll rows with validation and generated-file audit.                  |
| N.06   | A             | P                             | PCMAT has canonical SST program lifecycle, tenant-scoped validity metadata, audit/RLS, operator API routes, OpenAPI evidence, and SST e2e proof.           |
| N.07   | A             | P                             | CIPA has tenant-scoped committee, member, and minutes lifecycle, work-location scope, audit/RLS, operator API routes, OpenAPI evidence, and SST e2e proof. |
| P.12   | A             | P                             | LGPD international transfer tables, API, public summary, audit hook, ADR, runbook, and tests are present.                                                  |
| Q.03   | P             | P                             | Already present before Wave B.                                                                                                                             |
| Q.04   | P             | P                             | Already present before Wave B.                                                                                                                             |
| Q.07   | B             | P                             | Portal document request page/API evidence refreshed in the SGP-only B closure pass.                                                                        |
| Q.09   | P             | P                             | Already present before Wave B.                                                                                                                             |
| Q.11   | B             | P                             | Manager self-service portal page/API evidence refreshed in the SGP-only B closure pass.                                                                    |
| Q.12   | B             | P                             | Portal approval entry point evidence refreshed in the SGP-only B closure pass; generic admin parity remains delegated to `../stynx` framework.             |
| P.09   | B             | P                             | Runtime logging uses the retained pino redaction policy and focused tests cover nested PII and authorization headers.                                      |
| R.07   | B             | P                             | ICP-Brasil is closed inside ADR-021's software A1/PKCS#12 boundary with signer and non-secret certificate-status proof.                                    |
| R.01   | P             | P                             | Already present before Wave C.                                                                                                                             |
| T.05   | P             | P                             | Already present before Wave C.                                                                                                                             |
| T.07   | P             | P                             | Already present before Wave C.                                                                                                                             |
| T.09   | P             | P                             | Already present before Wave C.                                                                                                                             |
| T.10   | B             | Delegated/full-stack boundary | Payroll lock evidence exists, but the row remains outside the exact SGP-only B closure because it is owned by a hybrid admin/full-stack lane.              |
| Wave D | n/a           | Delegated                     | Admin backend/db/frontend surfaces are delegated to `../stynx`; retained 30-note handoff evidence is historical, not SGP backlog.                          |
| Wave E | n/a           | Delegated                     | eSocial and DET implementation work remains outside SGP; SGP owns only gateway/projection/status contracts.                                                |

## Gates

The 2026-05-09 production-grade pass repaired the canonical DB bootstrap and
reran broad gates through `npm run test`, `npm run test:db`, alignment checks,
and governance checks. The follow-up PCMAT/CIPA promotion added focused SST
service/e2e proof, regenerated OpenAPI/alignment artifacts, and rebuilt the AWS
CDK baseline.

## Remaining Closure Work

1. Track T.10 in the delegated admin/full-stack boundary unless owner reopens it
   as SGP-owned scope.
2. Track external package/service readiness outside SGP; do not count eSocial,
   DET, or admin-surface implementation as SGP closure backlog.
3. Keep artifact apply blocked until the postponed release/homologation gate
   bundle is accepted and live AWS apply evidence exists.
