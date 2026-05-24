# Lint And Duplication Thresholds

Date: 2026-05-24

## Controller And Service Size

The root ESLint config enables local SGP rules from `backend/eslint-rules/`:

- `sgp/no-fat-controller`: warning above 300 effective controller lines and
  reported with the 500-line hard budget marker.
- `sgp/no-oversize-service`: error above 600 effective service lines.

Controller warnings are accepted as review-pressure diagnostics only. New work
should split routed workflows before expanding a controller beyond the warning
budget. Service files above 600 effective lines are not accepted.

## Duplication Baseline

`npm run lint:check` runs:

```bash
npx jscpd --config .jscpd.json --exitCode 0
```

The current `.jscpd.json` threshold is `3` duplicated-line percent over
TypeScript files in `backend/src`, `frontend/src`, and `frontend/portal/src`,
excluding specs, e2e specs, generated API clients, coverage, dist, and Stryker
temporary output.

R4 baseline captured on 2026-05-24:

| Metric                   | Value |
| ------------------------ | ----: |
| Files analyzed           |  1015 |
| Clones found             |   287 |
| Duplicated lines         |  3902 |
| Duplicated line percent  | 3.00% |
| Duplicated tokens        | 32947 |
| Duplicated token percent | 3.95% |

## Re-Evaluation Triggers

Review the baseline when any of these occur:

- duplicated lines rise above the configured 3% threshold;
- a new repeated controller/service pattern appears in product code;
- generated or fixture output starts dominating clone reports;
- a package boundary is extracted into shared STYNX code.
