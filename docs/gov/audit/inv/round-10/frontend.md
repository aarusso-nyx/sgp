# Round 10 Frontend Inventory

## Evidence

- `docs/gov/audit/api-surface.md`
- `docs/gov/audit/inv/round-10/api-surface.json`
- `docs/eng/platform.md`

## Route And Menu Alignment

| Item                                 | Count |
| ------------------------------------ | ----: |
| Portal menu routes                   |    34 |
| Portal menu missing routes           |     0 |
| Admin menu routes                    |   181 |
| Admin menu routes postponed          |   181 |
| Admin menu implemented in menu audit |     0 |
| Admin menu missing                   |     0 |

## Assessment

Portal menu alignment is clean in round 10. Admin menu parity remains explicitly postponed under the accepted admin-install-later posture, so it is tracked as a known staged surface instead of a hidden route drift.

Recent QA lift work raised frontend coverage gates, but this B0 pass only refreshed audit inventories and did not re-run the frontend coverage gate.
