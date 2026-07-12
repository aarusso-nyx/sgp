# STYNX Runtime Foundation Evidence

Date: 2026-07-11

Wave 2 composes STYNX core, logging, health, and the backend platform pipeline
once under `backend/src/stynx/`. Core API, Portal API, payroll engine, report
service, integrations worker, and report worker consume the shared module and
runtime factories. Admin and Portal retain their generated `/v1/health` client
contract against the two API runtimes.

## Contract parity

| Surface                        | Before Wave 2                                    | STYNX-composed result                                                                            |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Global prefix, CORS, Helmet    | Per-entrypoint bootstrap                         | Central HTTP runtime factory, unchanged                                                          |
| Request IDs and error envelope | SGP correlation IDs and RFC 7807 problem details | Unchanged; incompatible STYNX 0.1.1 global context/error enhancers are suppressed in the adapter |
| Logging and trace correlation  | `nestjs-pino` plus SGP OTel configuration        | Preserved while STYNX logging providers are composed for Wave 4 cutover                          |
| Rate limit, SLA, idempotency   | Existing SGP implementations                     | STYNX pipeline composed with all three behavior switches disabled until their migration waves    |
| Liveness/readiness/metrics     | SGP API and worker probes                        | Existing probes retained; STYNX health providers and endpoints added                             |

The compatibility suppression is intentionally narrow: it removes only the
STYNX core `APP_FILTER` and `APP_INTERCEPTOR` registrations nested by the
logging module. STYNX core services remain mounted. This prevents the pinned
package from rejecting existing non-UUID correlation IDs or replacing accepted
SGP error wire shapes before the authorized concern cutovers.

## Boundary and verification

`npm run governance:check` scans production TypeScript and rejects direct
composition of STYNX core, logging, health, or platform-pipeline modules outside
`backend/src/stynx/`.

The exit evidence is the successful backend build, adapter boot matrix, runtime
contract tests, complete backend unit and e2e suites, API alignment/spec checks,
registry boundary, governance, formatting, type safety, and topology health
checks recorded with the Wave 2 commit.
