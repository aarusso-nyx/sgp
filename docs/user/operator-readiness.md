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
- Current implementation status: `docs/eng/99-implementation-status.md`.
- Current audit ledgers: `docs/gov/audit/`.

## Operational Controls

- LGPD DPO and DSAR operations: `docs/user/lgpd.md`.
- Security disclosure and vulnerability contact: `SECURITY.md`.
- Adapter and downstream boundary runbook: `docs/user/sgp-boundary-runbook.md`.
- Backup, restore, deploy, and rollback posture:
  `docs/gov/evidence/deferred-decision-ledger.md` and
  `docs/gov/evidence/release-homologation-gate-bundle.md`.
- KMS rotation posture: `docs/eng/runbooks/kms-rotation.md`.
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
npm -w frontend run test:admin -- --include src/app/shared/trace-context-interceptor.spec.ts --watch=false
npm run api:alignment:check -- --json
npm run db:alignment:check -- --json
npm run health:json
npm run governance:check
npm run build
```

## Scope Notes

Production infrastructure is AWS-only and materialized in `infra/aws/cdk`.
Provisioning and artifact rollout are separate lifecycle steps. Artifact apply
requires migration evidence, accepted release-gate evidence, and artifact-apply
authorization paths, and is still blocked until the postponed
release/homologation gate bundle is accepted.

Admin surfaces, identity, and storage malware/quarantine controls are delegated
to `../stynx`; eSocial runtime is delegated to `../stynx-esocial`; DET remains
an external service boundary.
