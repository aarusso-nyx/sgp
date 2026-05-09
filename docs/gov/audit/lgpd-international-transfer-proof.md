# LGPD International Transfer Proof

Date: 2026-05-08
FR: `FR-PT-06B7EB`
Feature-audit ID: `P.12`

## Scope

SGP owns the registration, approval, publication, and auditability of LGPD
international personal-data transfer mechanisms. External processor execution,
cross-border network dispatch, and cloud-provider enforcement remain outside
this proof.

## Evidence

| Surface  | Evidence                                                                                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DDL      | `database/sql/18-lgpd-international-transfer.sql` defines tenant-scoped transfer, adequacy, and transfer-event tables with RLS posture.                                            |
| Backend  | `backend/src/lgpd/international-transfer.service.ts` implements draft, DPO review, approval, closure, public active summaries, and transfer-event recording.                       |
| API      | `backend/src/lgpd/international-transfer.controller.ts` exposes protected administration endpoints; `backend/src/publico/lgpd-dpo.controller.ts` exposes public active summaries.  |
| UI       | `frontend/src/app/features/portal/lgpd-encarregado/lgpd-encarregado.ts` loads active public transfer summaries for the DPO/public portal surface.                                  |
| Test     | `tests/backend/lgpd-international-transfer.e2e-spec.ts` covers draft to DPO review to active to closed workflow, public publication, audit emission, and protected administration. |
| Command  | `npm run test:e2e -- --runInBand tests/backend/lgpd-international-transfer.e2e-spec.ts`.                                                                                           |
| Decision | `docs/eng/decisions/adr-023-lgpd-international-transfer-mechanism.md` records the mechanism and SCC/adequacy posture.                                                              |
| Runbook  | `docs/user/lgpd-transferencia-internacional-runbook.md` documents operator workflow.                                                                                               |

## Result

`FR-PT-06B7EB` is promoted to `DONE` for the v0.0.1 MVP closure surface. The
claim is limited to SGP-controlled mechanism registration and evidence; it does
not claim real external transfer enforcement.
