# LGPD ROPA and RCIS Proof

Round: 11
FRs: FR-PT-42F0B5, FR-PT-64E409
Status: DONE

## Accepted SGP Boundary

SGP keeps the ROPA registry and RCIS security-incident workflow inside the
protected LGPD administration surface. ROPA entries are tenant scoped,
reference `lgpd.legal_basis_rule`, and expose operational ownership,
processors or recipients, security controls, lifecycle evidence, review state,
and risk level without duplicating legal-basis text.

RCIS incidents can be created from an active `flowKey` or `ropaEntryId`, snapshot
the linked ROPA/legal-basis identifiers, and move through
`DETECTED -> TRIAGED -> REPORTED -> COMPLEMENTED -> CLOSED`. The workflow
records risk, mitigation, ANPD timing fields, and closure evidence without
emitting raw incident narratives, CPF values, data categories, contact values,
or mitigation free text in structured service logs or controller audit metadata.

This proof does not decide breach notification substance, publish public
notices, submit to ANPD, approve DPIA, or introduce new retention policy.

## Runtime Evidence

| Behavior                                      | Evidence                                          |
| --------------------------------------------- | ------------------------------------------------- |
| ROPA tenant CRUD surface                      | `backend/src/lgpd/ropa.controller.ts`             |
| ROPA/legal-basis linkage                      | `backend/src/lgpd/ropa.service.ts`                |
| RCIS state machine surface                    | `backend/src/lgpd/incidents.controller.ts`        |
| RCIS legal-basis source resolution and timers | `backend/src/lgpd/incidents.service.ts`           |
| Canonical LGPD data-flow keys                 | `backend/src/common/lgpd/legal-basis.registry.ts` |
| ROPA/RCIS tables, RLS, FK, and comments       | `database/sql/70-lgpd-final.sql`                  |
| Legal-basis reference data                    | `database/sql/91-reference-data.sql`              |

## Test Evidence

| Behavior                                                                                            | Evidence                                        |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| ROPA service create/list/update and representative payroll, recruitment, time, regulatory flow keys | `backend/src/lgpd/ropa.service.spec.ts`         |
| ROPA controller audit and HTTP CRUD flow coverage                                                   | `tests/backend/lgpd-ropa.e2e-spec.ts`           |
| RCIS timers, ROPA linkage, transition ordering, closure, and log minimization                       | `backend/src/lgpd/incidents.service.spec.ts`    |
| RCIS controller audit minimization and all transition audit calls                                   | `backend/src/lgpd/incidents.controller.spec.ts` |
| RCIS HTTP state machine from detected to closed                                                     | `tests/backend/lgpd-rcis.e2e-spec.ts`           |

## Commands

- `npm -w backend run test -- --runInBand backend/src/lgpd/ropa.service.spec.ts backend/src/lgpd/ropa.controller.spec.ts backend/src/lgpd/incidents.service.spec.ts backend/src/lgpd/incidents.controller.spec.ts`
- `npm run test:e2e -- --runInBand tests/backend/lgpd-ropa.e2e-spec.ts tests/backend/lgpd-rcis.e2e-spec.ts`
- `npm run test:backend -- --runInBand`
- `npm run lint:check`
- `npm run format:check`
- `npm run typecheck`
- `npm run governance:check`
