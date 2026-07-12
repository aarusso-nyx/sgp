# STYNX and DEVAI Adoption Status

Date: 2026-07-12

Status: Wave 7 local closeout complete; pull-request checks and protection
promotion await publication.

## Adoption state

Waves 0 through 5 established the registry-only package baseline, executable
DEVAI foundation, STYNX backend runtime, data/auth/tenancy adapters, platform
cross-cutters and the shared Admin/Portal Angular composition. Wave 6 binds
DEVAI sensor kinds to SGP's canonical commands and retains current inventory,
sensor, scorecard and chained test evidence.

The current scorecard contains 44 PASS cells and one structural N/A:
`F4×T5` (generated inventory idiomaticity), which DEVAI defines globally as a
degenerate cell. `.devai/config/scorecard-na.json` remains empty; SGP adds no
local N/A bypasses.

| Substrate        | T1   | T2   | T3   | T4   | T5   | T6   | T7   | T8   | T9   |
| ---------------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| F1 Specification | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| F2 Plant         | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| F3 Tests         | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| F4 Inventory     | PASS | PASS | PASS | PASS | N/A  | PASS | PASS | PASS | PASS |
| F5 Harness       | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

Performance readings in Wave 6 prove the local control-plane health command's
execution and related test/harness coverage. They are not production latency,
capacity or load-test claims.

## Chained Wave 6 records

| Scope                  | Tier     | Result ID                       | Command result |
| ---------------------- | -------- | ------------------------------- | -------------- |
| Backend unit           | unit     | `TR-01KXBS6QKZCFMTM06YNJGVCXWV` | PASS           |
| Backend API/e2e        | api      | `TR-01KXBS9T5V2EKRD9KNRFTT9DT3` | PASS           |
| Database and RLS       | db       | `TR-01KXBSA14P5SCVA0VBRDGDH4CY` | PASS           |
| Frontend unit          | unit     | `TR-01KXBSANJPZXT0JQWK3Z83J82X` | PASS           |
| Browser journeys       | e2e      | `TR-01KXBSBJW5CEYGP9P96HTXY88Y` | PASS           |
| Frontend coverage      | coverage | `TR-01KXBSC3H3SGGM7A9AECQ2EHD6` | PASS           |
| Deep runtime/alignment | coverage | `TR-01KXBSC6D00J0G8VYQQ2FKXH8M` | PASS           |
| Build                  | coverage | `TR-01KXBSCXE7H1P7DFAJF2Y1FFAW` | PASS           |
| Mutation               | mutation | `TR-01KXBSE7XF2EW7A678QXBKNM55` | PASS           |

The evidence chain verifies after these records. Test-result logs remain local
ignored artifacts; their hashes and result identifiers are retained by the
tracked evidence chain.

## Repairs and transparent retries

- The first database inventory reading exposed a DEVAI SQL-parser limitation
  when `ON UPDATE` preceded `ON DELETE`. Canonical SQL now presents the
  inventory-readable delete action and explicitly restores the accepted
  cascade update constraints through `ALTER TABLE`; DB smoke proves parity.
- The database-alignment check still expected tenant GUCs inside
  `DatabaseService`. It now verifies delegation to the STYNX-bound
  `SgpDbSessionContextApplier`.
- A redundant full evidence/coverage run was interrupted after excessive local
  duration. Security sensors use `npm audit --omit=dev --audit-level=high`;
  coverage and deep-runtime evidence are recorded separately.

## Wave 7 closeout

The repository now has a reusable, fail-closed `DEVAI evidence gate`, current
`.devai/**` path filters, DEVAI/test artifact uploads, a repository-local
verifier, a CycloneDX SBOM and registry-only operator instructions. Fourteen
unused STYNX direct dependencies were removed without removing active adapter
contracts. The frontend profile and active-session product-contract gaps remain
planned under `STYNX-FE-001` and `STYNX-FE-002`.

The retained Wave 6 scorecard is deliberately stale relative to the Wave 7
candidate. The local verifier rejects it, proving the fail-closed branch. CI
will therefore run the complete DB, API, browser, backend/frontend coverage,
mutation and build tail, regenerate inventory/sensors/scorecard for the checked
out SHA, and verify again.

After the first PR execution passed all substantive steps but exhausted the
90-minute monolithic job boundary during teardown, the fail-closed tail was
split into parallel evidence tiers following STYNX's CI-economy mechanics. No
test category was removed; a final aggregate check fails unless retained
source-bound evidence is current or every tier plus scorecard refresh passes.

Read-only branch-protection inspection on 2026-07-12 found the existing seven
required checks intact. The new DEVAI context must not be added until a real PR
run succeeds. No branch-protection write, merge, deployment or rollback was
performed.
