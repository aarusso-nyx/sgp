# Current SGP Reassessment Diagnostics

Generated at: 2026-04-26T04:03:00Z

## Executive Status

The current checkout is green for current-scope backend/database/frontend route alignment after the 2026-04-26 scope correction. The admin frontend tree is postponed under `ADMIN_INSTALL_LATER`; current `admin_menu` records in `docs/eng/69-api-route-alignment.json` are ignored as acceptance evidence. Backend admin routes, identity/OAuth/Cognito/Gov.br, Arrecadacao, real eSocial transmission, final `./infra`, and governance/release gates are explicitly deferred and must not be reported as current blockers.

## Confirmed Green Signals

- API/domain/workflow/menu alignment reports 152/152 current API routes implemented, 0 documented-missing, 0 runtime-only, 0 outside-family routes, 11/11 current SGP domain modules covered, 182 admin menu routes postponed, and 0 missing portal menu routes.
- DB full closure passes: full_closure has 150 implemented/canonicalized objects, 0 in-scope explicit exclusions, and only approved technical out-of-scope residue.
- DB smoke passes against `postgresql://aarusso@localhost:5432/pecam-test`.
- Backend coverage passes the 85/85/85 threshold: lines 95.52%, branches 85.01%, functions 97.07%.
- Backend e2e, backend build, admin frontend tests, and portal frontend tests pass.
- Generated document storage no longer falls back to local disk; tests without S3 use S3-compatible MiniIO configuration.

## Deferred Scope

1. `ADMIN_INSTALL_LATER`: admin frontend tree, backend administrative routes `/api/v1/admin`, `/api/admin/v1`, and corporate administrative identity wiring.
2. `IDENTITY_INSTALL_LATER`: OAuth/Cognito/Gov.br and account-management paths.
3. `ARRECADACAO_PREVIDENCIARIA`: later-version domain.
4. eSocial real transmission, certificates, and external homologation; current package uses adapter sandbox/stub.
5. Final `./infra` implementation strategy.
6. Governance/release gates such as GitHub Actions, Pact broker/provider, scanners, and productive observability.

## Remaining Non-Deferred Gap

No current non-deferred blocker identified in this pass. Live QA smoke still reports `BLOCKED` without base URLs, but that is an environment evidence gap under the deferred governance/live-smoke decision, not a current implementation gap.
