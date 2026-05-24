# Round 1 Bootstrap Residual Gaps

Date: 2026-05-24

This note records the residual gaps after executing the external SGP round-1
alignment prompt from `/Users/aarusso/Development/stech/align/sgp/round-1`.

## Registered gaps

- Full broad runtime gates were not run in this bootstrap slice:
  `npm run test`, `npm run test:e2e`, `npm run test:coverage`,
  `npm run test:frontend:coverage`, and DB-backed `npm run test:db`.
- `npm install` reported 6 moderate npm audit findings. No `npm audit fix` was
  run because that can change dependency versions outside the round scope.
- `npm run build` passed but retained the existing Angular locale warning:
  locale data for `pt-BR` was not found, so Angular used `pt`.
- `npm run lint:check` passed but retained existing non-failing diagnostics:
  controller-size warnings and jscpd clone inventory output.
- SGP installability depended on ignored sibling STYNX local tarballs under
  `/Users/aarusso/Development/stech/stynx/.release/local-npm/`. Those tarballs
  were regenerated locally, and `package-lock.json` integrity values were
  refreshed to match the regenerated file artifacts.

## Gates passed

- `npm install`
- `npm run governance:check`
- `npm run lint:check`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`
- `npm run test:types`

## 2026-05-24 — R4 Closure

- Full broad runtime gates: partially closed by R4 worker 11 evidence capture.
  The focused new eSocial spool e2e test passed. Full aggregate CI status is
  tracked in `.devai/state/test-results/r4-*.json` when generated.
- npm audit findings: closed. `npm audit --json` reported zero vulnerabilities
  on 2026-05-24.
- Angular locale warning: policy closed by `docs/eng/locale-policy.md`; runtime
  implementation remains governed by that policy.
- Lint threshold diagnostics: closed by `docs/gov/audit/lint-thresholds.md`;
  the jscpd clone inventory is documented there as informational output for
  `npm run lint:check`.
- STYNX local tarball workflow: closed by `docs/user/dependency-management.md`.
