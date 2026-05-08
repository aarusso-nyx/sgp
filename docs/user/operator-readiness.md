# Operator Readiness

This is the current operator entrypoint for running, testing, and assessing SGP
v0.0.1 readiness.

## Start Here

- Local bootstrap and command usage: `docs/user/local-setup.md`.
- Environment variables and placeholders: `docs/user/environment.md`.
- Root script reference: `docs/user/scripts.md`.
- Test and smoke command usage: `docs/user/testing.md`.
- Runtime topology source: `docs/gov/generated/runtime-topology.json`.
- Health and preflight rules: `docs/gov/health/preflight.md`.

## Operational Controls

- LGPD DPO and DSAR operations: `docs/user/lgpd.md`.
- Security disclosure and vulnerability contact: `SECURITY.md`.
- Adapter and downstream boundary runbook: `docs/user/sgp-boundary-runbook.md`.
- Backup, restore, deploy, and rollback posture:
  `docs/gov/evidence/deferred-decision-ledger.md`.
- Incident and audit evidence:
  `docs/gov/evidence/repository-discipline.md` and
  `docs/gov/audit/test-confidence-proof.md`.

## Gate Set

The operator readiness gate set is intentionally rooted in commands:

```bash
npm run lint:check
npm run format:check
npm run typecheck
npm run test:types
npm run test:mutation
npm run test:coverage -- --runInBand
npm run test:frontend:coverage
npm run test:db
npm run test:e2e
npm run test:frontend:e2e
npm run api:alignment:check -- --json
npm run db:alignment:check -- --json
npm run health:json
npm run governance:check
npm run build
```

## Scope Notes

Production infrastructure is postponed until the owner selects the production
IaC path. `ADMIN_INSTALL_LATER` remains an accepted staged boundary for broad
admin parity.
