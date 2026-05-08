# Round 10 Database Inventory

## Evidence

- `docs/gov/audit/schema-digest.md`
- `docs/gov/audit/inv/round-10/schema-digest.json`

## Counts

| Item                    | Count |
| ----------------------- | ----: |
| Tables                  |   273 |
| Foreign keys            |   657 |
| Indexes                 |   995 |
| RLS policies            |   574 |
| RLS tables              |   270 |
| Triggers                |   245 |
| Classification comments |   119 |

## Assessment

The schema audit command completed successfully for round 10. The database surface remains broad and RLS-heavy, consistent with the repository requirement that tenant isolation and protected data controls stay visible in executable SQL evidence.

This inventory is structural. It does not by itself prove every functional requisite is complete.
