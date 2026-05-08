# Round 10 Backend Inventory

## Evidence

- `docs/gov/audit/api-surface.md`
- `docs/gov/audit/inv/round-10/api-surface.json`
- `docs/gov/generated/runtime-topology.json`

## Route Alignment

| Item                                 | Count |
| ------------------------------------ | ----: |
| Runtime total                        |   558 |
| Runtime routes in canonical families |   453 |
| Implemented routes                   |   453 |
| Documented routes                    |   453 |
| Documented total                     |   541 |
| Documented missing                   |     0 |
| Runtime-only                         |     0 |
| Runtime outside route families       |     0 |
| Domain modules                       |    11 |
| Domain modules implemented           |    11 |
| Deferred documented routes           |    88 |
| Deferred runtime routes              |   105 |
| Explicit exclusions                  |     0 |

## Runtime Shape

Backend runtime remains organized around the documented NestJS entry surfaces in the generated topology. The round 10 API audit reports no route drift between documented runtime routes and implemented canonical route families.

## Assessment

The backend route contract is aligned for the audited surface. Functional acceptance still depends on the functional-requisite ledger and direct implementation evidence, because route existence does not prove each business workflow is complete.
